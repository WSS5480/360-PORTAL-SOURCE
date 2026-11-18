import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildDebriefActionableReviewCards } from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import { buildDebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import { INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import {
  buildDebriefIntelligenceBrief,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { enrichDebriefIntelligenceBriefWithUniversalFacts } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToDebriefClinicalBrief";
import { composeDebriefReviewDisplay } from "@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

const CLINICAL_DIP_FACT_TYPES = new Set(["clinical_focus", "product_fit", "current_product"]);

const DR_LETTUCE_ACSIS_INTRO_DICTATION = [
  "Intro call with Dr. Tom Lettuce.",
  "Discussed ACSIS.",
  "He does a fair amount of robotic colorectal and hernia work.",
  "Currently using standard rigid suction irrigation.",
  "Said one of the challenges in deeper pelvic cases is reaching pooled fluid without fighting other instruments.",
  "Mentioned there are definitely times when suction becomes more of a struggle in tighter anatomy.",
  "Asked whether ACSIS works with their existing suction setup.",
  "Was interested in the curved design and how it gets around anatomy.",
  "Also asked whether there was much of a learning curve for assistants.",
  "He wasn't ready to evaluate anything off a phone call.",
  "Suggested the best next step would be observing a few of his robotic cases.",
  "Said if the device solves real problems in the OR he'd be willing to look at it.",
  "Need to coordinate an observation and identify upcoming robotic cases.",
].join(" ");

function legacyDipReviewDisplay(input: {
  dictation: string;
  logUpdate: LogUpdateParseResult;
  proposedContacts: ReturnType<typeof runDebriefExtractionPipeline>["proposedContacts"];
  debriefRuns?: UniversalFactExtractionRun[] | null;
}) {
  const extraction = buildDebriefIntelligenceExtractionReview({
    review: input.logUpdate,
    proposedContacts: input.proposedContacts,
  });
  const actionableCards = buildDebriefActionableReviewCards({
    extraction,
    proposedContacts: input.proposedContacts,
    dictation: input.dictation,
  });
  const brief = enrichDebriefIntelligenceBriefWithUniversalFacts({
    brief: buildDebriefIntelligenceBrief({ cards: actionableCards }),
    debriefRuns: input.debriefRuns,
  });
  return { extraction, actionableCards, brief };
}

function ufRunsFromDictation(dictation: string): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: "intro_call",
  });
  return [
    {
      capture_id: "capture-compose-test",
      declared_source_type: "intro_call",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `uf-compose-${index}`,
        capture_id: "capture-compose-test",
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
        suppressed: false,
        created_at: extraction.extracted_at,
      })),
    },
  ];
}

function cardSignature(cards: { id: string; category: string; headline: string }[]): string[] {
  return cards.map((card) => `${card.category}|${card.id}|${card.headline}`);
}

describe("composeDebriefReviewDisplay", () => {
  beforeEach(() => {
    vi.stubEnv("UF_EXTRACTION_REVIEW_PRIMARY", "0");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("flag off matches legacy DIP review display output", () => {
    const pipeline = runDebriefExtractionPipeline({ dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION });
    const debriefRuns = ufRunsFromDictation(INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION);
    const logUpdate = {
      ...pipeline.parse,
      debriefUniversalFactsRuns: debriefRuns,
    };

    const legacy = legacyDipReviewDisplay({
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      logUpdate,
      proposedContacts: pipeline.proposedContacts,
      debriefRuns,
    });
    const composed = composeDebriefReviewDisplay({
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      logUpdate,
      debriefRuns,
      proposedContacts: pipeline.proposedContacts,
    });

    expect(composed.displaySource).toBe("dip");
    expect(cardSignature(composed.actionableCards)).toEqual([
      "workflow_participant|contact-0|Jennifer",
      "observation_access|review-observation-access|Observation Access",
      "clinical_focus|uf:uf-compose-4|Robotic ventral hernia repair · Increasing Procedure Volume",
      "clinical_focus|uf:uf-compose-5|Abdominal wall reconstruction · Increasing Procedure Volume",
      "product_intelligence|review-product-interest-1|Product interest: Product interest",
    ]);
    expect(legacy.actionableCards.length).toBeGreaterThan(composed.actionableCards.length);
  });

  it("flag on renders UF clinical/product cards when DIP clinical atomic facts are empty", () => {
    vi.stubEnv("UF_EXTRACTION_REVIEW_PRIMARY", "1");

    const pipeline = runDebriefExtractionPipeline({ dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION });
    const debriefRuns = ufRunsFromDictation(INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION);
    const workflowOnlyFacts =
      pipeline.parse.atomicFacts?.filter((fact) => !CLINICAL_DIP_FACT_TYPES.has(fact.fact_type)) ?? [];
    const logUpdate = {
      ...pipeline.parse,
      atomicFacts: workflowOnlyFacts,
      debriefUniversalFactsRuns: debriefRuns,
    };

    const composed = composeDebriefReviewDisplay({
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      logUpdate,
      debriefRuns,
      proposedContacts: pipeline.proposedContacts,
    });

    expect(composed.displaySource).toBe("uf_authority");
    expect(composed.actionableCards.some((card) => card.id.startsWith("uf:"))).toBe(true);
    expect(
      composed.actionableCards.some(
        (card) => card.category === "clinical_focus" || card.category === "product_intelligence",
      ),
    ).toBe(true);
  });

  it("flag on keeps DIP workflow cards for access, contacts, and credentialing", () => {
    vi.stubEnv("UF_EXTRACTION_REVIEW_PRIMARY", "1");

    const pipeline = runDebriefExtractionPipeline({ dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION });
    const debriefRuns = ufRunsFromDictation(INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION);
    const logUpdate = {
      ...pipeline.parse,
      debriefUniversalFactsRuns: debriefRuns,
    };

    const composed = composeDebriefReviewDisplay({
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      logUpdate,
      debriefRuns,
      proposedContacts: pipeline.proposedContacts,
    });

    expect(composed.actionableCards.some((card) => card.category === "workflow_participant")).toBe(true);
    expect(composed.actionableCards.some((card) => /jennifer/i.test(card.headline))).toBe(true);
    expect(composed.actionableCards.some((card) => card.category === "observation_access")).toBe(true);
    expect(composed.brief.observationAccess?.bullets).toEqual(
      expect.arrayContaining(["Observation interest noted", "Not captured in this note", "Not yet approved"]),
    );
  });

  it("simulates review reopen hydrate from capture_id with UF-primary display", () => {
    vi.stubEnv("UF_EXTRACTION_REVIEW_PRIMARY", "1");

    const pipeline = runDebriefExtractionPipeline({ dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION });
    const debriefRuns = ufRunsFromDictation(INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION);
    const persistedLogUpdate = {
      ...pipeline.parse,
      debriefUniversalFactsRuns: undefined,
    };
    const hydratedLogUpdate = {
      ...persistedLogUpdate,
      debriefUniversalFactsRuns: debriefRuns,
    };

    const composed = composeDebriefReviewDisplay({
      dictation: INTRO_CALL_TOM_SANDY_JENNIFER_DICTATION,
      logUpdate: hydratedLogUpdate,
      debriefRuns,
      proposedContacts: pipeline.proposedContacts,
    });

    expect(composed.displaySource).toBe("uf_authority");
    expect(composed.actionableCards.some((card) => card.id.startsWith("uf:"))).toBe(true);
  });

  it("does not compose generic procedure-focus placeholders for intro-call case-mix context", () => {
    const pipeline = runDebriefExtractionPipeline({ dictation: DR_LETTUCE_ACSIS_INTRO_DICTATION });
    const debriefRuns = ufRunsFromDictation(DR_LETTUCE_ACSIS_INTRO_DICTATION);
    const logUpdate = {
      ...pipeline.parse,
      debriefUniversalFactsRuns: debriefRuns,
    };

    const composed = composeDebriefReviewDisplay({
      dictation: DR_LETTUCE_ACSIS_INTRO_DICTATION,
      logUpdate,
      debriefRuns,
      proposedContacts: pipeline.proposedContacts,
    });
    const cardText = composed.actionableCards.map((card) => `${card.category}: ${card.headline}`).join("\n");
    const briefText = composed.brief.clinicalInsights.map((row) => row.primaryLine).join("\n");

    expect(cardText).toMatch(/product_intelligence: Product interest: ACSIS/i);
    expect(cardText).not.toMatch(/clinical_focus: Procedure Focus/i);
    expect(briefText).not.toMatch(/Procedure Focus|Clinical procedure focus/i);
  });
});
