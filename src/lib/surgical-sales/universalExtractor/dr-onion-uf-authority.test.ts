import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildDebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { DR_ONION_INTRO_CALL_DICTATION } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import {
  buildIntelligenceBriefOutcomes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import {
  filterDipFieldUpdatesToIntelligenceOnly,
  stripDipLogUpdateToWorkflowOnly,
  UF_INTELLIGENCE_FIELD_DB_KEYS,
} from "@/lib/surgical-sales/universalExtractor/filterDipReviewToWorkflowSections";
import {
  buildReviewProjectionFromUniversalFacts,
} from "@/lib/surgical-sales/universalExtractor/buildReviewProjectionFromUniversalFacts";
import { composeDebriefReviewDisplay } from "@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { enrichDebriefIntelligenceBriefWithUniversalFacts } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToDebriefClinicalBrief";

function ufRunsFromDictation(dictation: string): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: "intro_call",
  });
  return [
    {
      capture_id: "capture-dr-onion-test",
      declared_source_type: "intro_call",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `uf-dr-onion-${index}`,
        capture_id: "capture-dr-onion-test",
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

function projectedReviewFromDrOnion() {
  const pipeline = runDebriefExtractionPipeline({ dictation: DR_ONION_INTRO_CALL_DICTATION });
  const debriefRuns = ufRunsFromDictation(DR_ONION_INTRO_CALL_DICTATION);
  const projection = buildReviewProjectionFromUniversalFacts({
    dictation: DR_ONION_INTRO_CALL_DICTATION,
    debriefRuns,
    workflowLogUpdate: stripDipLogUpdateToWorkflowOnly(pipeline.parse),
    existingFields: {},
  });
  return { pipeline, debriefRuns, projection };
}

describe("Dr. Onion UF authority — Wave 1+2", () => {
  beforeEach(() => {
    vi.stubEnv("UF_AUTHORITY_REVIEW", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("projects clinical/product Suggested Updates from UF fieldUpdates, not DIP DebriefAtomicFact rows", () => {
    const { pipeline, projection } = projectedReviewFromDrOnion();

    const ufIntelligenceUpdates = filterDipFieldUpdatesToIntelligenceOnly(projection.logUpdate.fieldUpdates);
    expect(ufIntelligenceUpdates.length).toBeGreaterThan(0);
    expect(ufIntelligenceUpdates.every((update) => update.id.startsWith("uf-field-"))).toBe(true);

    const dipClinicalFieldIds = pipeline.parse.fieldUpdates
      .filter((update) => UF_INTELLIGENCE_FIELD_DB_KEYS.has(update.dbKey))
      .map((update) => update.id);
    const projectedUsesDipClinicalIds = projection.logUpdate.fieldUpdates.some((update) =>
      dipClinicalFieldIds.includes(update.id),
    );
    expect(projectedUsesDipClinicalIds).toBe(false);
  });

  it("includes observation, Jennifer workflow, credentialing, clinical trends, Acumed, and robotic volume", () => {
    const { debriefRuns, projection } = projectedReviewFromDrOnion();
    const composed = composeDebriefReviewDisplay({
      dictation: DR_ONION_INTRO_CALL_DICTATION,
      logUpdate: projection.logUpdate,
      debriefRuns,
      proposedContacts: [],
    });

    const updateText = composed.extraction.intelligenceUpdates
      .map((item) => `${item.intelligenceFieldLabel} ${item.proposedValue} ${item.suggestedUpdate}`)
      .join(" ")
      .toLowerCase();
    const cardText = composed.actionableCards.map((card) => card.headline).join(" ").toLowerCase();
    const combined = `${updateText} ${cardText}`;

    expect(combined).toMatch(/observation|credential/);
    expect(combined).toMatch(/jennifer/);
    expect(combined).toMatch(/ventral|hernia/);
    expect(combined).toMatch(/abdominal wall/);
    expect(combined).toMatch(/robotic/);
    expect(combined).toMatch(/acumed/);

    expect(combined).not.toMatch(/acumed for many of/);
    const acumedCards = composed.actionableCards.filter((card) => /acumed/i.test(card.headline));
    expect(acumedCards.length).toBeLessThanOrEqual(1);

    const jenniferParticipantCards = composed.actionableCards.filter(
      (card) => card.category === "workflow_participant" && /jennifer/i.test(card.headline),
    );
    expect(jenniferParticipantCards.length).toBe(1);
  });

  it("Review Extracted Intelligence cards use UF for clinical/product facts", () => {
    const { debriefRuns, projection } = projectedReviewFromDrOnion();
    const composed = composeDebriefReviewDisplay({
      dictation: DR_ONION_INTRO_CALL_DICTATION,
      logUpdate: projection.logUpdate,
      debriefRuns,
      proposedContacts: [],
    });

    expect(composed.displaySource).toBe("uf_authority");
    expect(
      composed.actionableCards.some(
        (card) =>
          card.id.startsWith("uf:") &&
          (card.category === "clinical_focus" || card.category === "product_intelligence"),
      ),
    ).toBe(true);
    expect(composed.actionableCards.some((card) => card.category === "observation_access")).toBe(true);
  });

  it("Provider Intelligence brief and Review agree on UF clinical/product projection", () => {
    const { debriefRuns, projection } = projectedReviewFromDrOnion();
    const composed = composeDebriefReviewDisplay({
      dictation: DR_ONION_INTRO_CALL_DICTATION,
      logUpdate: projection.logUpdate,
      debriefRuns,
      proposedContacts: [],
    });

    const providerBrief = enrichDebriefIntelligenceBriefWithUniversalFacts({
      brief: composed.brief,
      debriefRuns,
    });

    const reviewClinicalProcedures = composed.brief.clinicalInsights.map(
      (row) => row.procedureFocus?.toLowerCase() ?? row.primaryLine.toLowerCase(),
    );
    const providerClinicalProcedures = providerBrief.clinicalInsights.map(
      (row) => row.procedureFocus?.toLowerCase() ?? row.primaryLine.toLowerCase(),
    );

    for (const procedure of reviewClinicalProcedures) {
      expect(
        providerClinicalProcedures.some(
          (providerProcedure) =>
            providerProcedure.includes(procedure.split(" · ")[0] ?? procedure) ||
            procedure.includes(providerProcedure.split(" · ")[0] ?? providerProcedure),
        ),
      ).toBe(true);
    }

    const reviewProducts = composed.brief.productIntelligence.map((row) => row.productName.toLowerCase());
    const providerProducts = providerBrief.productIntelligence.map((row) => row.productName.toLowerCase());
    expect(reviewProducts.sort()).toEqual(providerProducts.sort());
  });

  it("DIP fieldUpdates are not authority for clinical/product display when UF authority is on", () => {
    const { pipeline, debriefRuns, projection } = projectedReviewFromDrOnion();

    const dipExtraction = buildDebriefIntelligenceExtractionReview({
      review: pipeline.parse,
      proposedContacts: pipeline.proposedContacts,
    });
    const dipClinicalUpdates = dipExtraction.intelligenceUpdates.filter((item) =>
      /procedure|competitive|vendor|technique|clinical/i.test(item.intelligenceFieldLabel),
    );

    const composed = composeDebriefReviewDisplay({
      dictation: DR_ONION_INTRO_CALL_DICTATION,
      logUpdate: projection.logUpdate,
      debriefRuns,
      proposedContacts: pipeline.proposedContacts,
    });

    expect(dipClinicalUpdates.length).toBeGreaterThan(0);
    expect(composed.extraction.intelligenceUpdates.some((item) => /acumed for many of/i.test(item.proposedValue))).toBe(
      false,
    );
    expect(
      composed.extraction.intelligenceUpdates.filter((item) => /acumed/i.test(item.proposedValue)).length,
    ).toBeLessThanOrEqual(1);
  });

  it("compose suggested updates include UF-projected intelligence rows", () => {
    const { debriefRuns, projection } = projectedReviewFromDrOnion();
    const composed = composeDebriefReviewDisplay({
      dictation: DR_ONION_INTRO_CALL_DICTATION,
      logUpdate: projection.logUpdate,
      debriefRuns,
      proposedContacts: [],
    });

    const outcomes = buildIntelligenceBriefOutcomes(composed.brief);
    expect(outcomes.length).toBeGreaterThan(0);
    expect(composed.extraction.intelligenceUpdates.length).toBeGreaterThan(3);
  });
});
