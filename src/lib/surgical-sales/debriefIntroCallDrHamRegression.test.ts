import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { extractContactNamesFromDebriefText } from "@/lib/surgical-sales/debriefDetectedContact";
import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { runDebriefExtractionPipeline } from "@/lib/surgical-sales/debriefExtractionRegressionRunner";
import {
  buildIntelligenceBriefOutcomes,
  groupClinicalInsightOutcomes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { buildDebriefReviewSummary } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewSummary";
import {
  isProductInterestOutcome,
  isProductUsageOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDisplayRefinement";
import { composeDebriefReviewDisplay } from "@/lib/surgical-sales/universalExtractor/composeDebriefReviewDisplay";
import { extractUniversalSurgicalFacts } from "@/lib/surgical-sales/universalExtractor/extractUniversalSurgicalFacts";
import { runUniversalSurgicalExtraction } from "@/lib/surgical-sales/universalExtractor/runUniversalSurgicalExtraction";
import { shouldRejectAssignedProviderContactRole } from "@/lib/surgical-sales/sharedIntelligence/providerContactRolePolicy";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

import { DR_JOHN_HAM_INTRO } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";

function ufRunsFromDictation(dictation: string, captureId: string): UniversalFactExtractionRun[] {
  const extraction = runUniversalSurgicalExtraction({
    raw_note: dictation,
    declared_source_type: "intro_call",
    context: { provider_display_name: "John Ham" },
  });
  return [
    {
      capture_id: captureId,
      declared_source_type: "intro_call",
      extraction_model: extraction.model,
      created_at: extraction.extracted_at,
      operational_note_id: null,
      facts: extraction.facts.map((fact, index) => ({
        ...fact,
        id: `${captureId}-${index}`,
        capture_id: captureId,
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

describe("Dr. Ham intro call — universal extraction guardrails", () => {
  beforeEach(() => {
    vi.stubEnv("UF_AUTHORITY_REVIEW", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects provider surname + sentiment verb contact artifacts", () => {
    expect(isPlausiblePersonName("Ham Seemed")).toBe(false);
    expect(
      shouldRejectAssignedProviderContactRole({
        concept: "contact_role",
        person_mentioned: "Ham",
        normalized_label: "Ham · Scheduling Coordinator",
        evidence_text: "Dr. Ham seemed open to continuing the conversation",
        providerName: "John Ham",
      }),
    ).toBe(true);
  });

  it("extracts Sarah from comma-attribution scheduler phrasing", () => {
    const contacts = extractContactNamesFromDebriefText(DR_JOHN_HAM_INTRO);
    expect(contacts.map((contact) => contact.name)).toContain("Sarah");
  });

  it("classifies Bard Soft Mesh as current/competitor usage, not product interest", () => {
    const { facts } = extractUniversalSurgicalFacts({
      raw_note: DR_JOHN_HAM_INTRO,
      declared_source_type: "intro_call",
      context: { provider_display_name: "John Ham" },
    });

    const productInterest = facts.filter((fact) => fact.concept === "product_interest");
    expect(productInterest.some((fact) => /bard soft mesh/i.test(fact.normalized_label ?? ""))).toBe(false);
    expect(
      facts.some(
        (fact) =>
          (fact.concept === "current_product" || fact.concept === "competitor_product") &&
          /bard soft mesh/i.test(fact.product_mentioned ?? fact.normalized_label ?? ""),
      ),
    ).toBe(true);
  });

  it("renders review cards with correct product and contact labels", () => {
    const pipeline = runDebriefExtractionPipeline({ dictation: DR_JOHN_HAM_INTRO });
    const debriefRuns = ufRunsFromDictation(DR_JOHN_HAM_INTRO, "capture-ham");
    const composed = composeDebriefReviewDisplay({
      dictation: DR_JOHN_HAM_INTRO,
      logUpdate: { ...pipeline.parse, debriefUniversalFactsRuns: debriefRuns },
      debriefRuns,
      proposedContacts: pipeline.proposedContacts,
    });

    const productCards = composed.actionableCards.filter((card) => card.category === "product_intelligence");
    const productHeadlines = productCards.map((card) => card.headline).join("\n");
    expect(productHeadlines).toMatch(/current product:\s*bard soft mesh|competitor product:\s*bard soft mesh|current product identified:\s*bard soft mesh/i);
    expect(productHeadlines).not.toMatch(/product interest:\s*bard soft mesh/i);
    expect(productHeadlines).toMatch(
      /product interest:\s*(?:wants published outcomes before product change|comparative clinical data interest|product comparison or clinical-data interest)/i,
    );

    const contactCards = composed.actionableCards.filter((card) => card.category === "workflow_participant");
    expect(contactCards.some((card) => /sarah/i.test(card.headline))).toBe(true);
    expect(contactCards.some((card) => /ham seemed/i.test(card.headline))).toBe(false);

    const outcomes = buildIntelligenceBriefOutcomes(composed.brief);
    const clinicalGroups = groupClinicalInsightOutcomes(outcomes);
    expect(clinicalGroups.map((group) => group.groupLabel)).toEqual(["Procedure Focus"]);
    expect(clinicalGroups[0]?.outcomes[0]?.primaryLine).toMatch(/Robotic ventral and inguinal hernia repair/i);

    const productLines = outcomes
      .filter((row) => row.kind === "product_intelligence")
      .map((row) => row.summaryLine)
      .join("\n");
    expect(productLines).not.toMatch(/product interest:\s*bard soft mesh/i);

    const summary = buildDebriefReviewSummary({
      outcomes,
      providerLabel: "John Ham",
    });
    expect(summary.takeaways.join("\n")).toMatch(/Sarah identified as scheduling coordinator/i);
    expect(summary.takeaways.join("\n")).toMatch(/Share comparative clinical data and schedule observation case/i);
    expect(summary.takeaways.join("\n")).toMatch(/Robotic ventral and inguinal hernia repair focus noted/i);
    expect(summary.takeaways.join("\n")).not.toMatch(/Procedure focus identified/i);

    const followUpOutcomes = outcomes.filter((row) => row.kind === "follow_up");
    expect(followUpOutcomes.map((row) => row.primaryLine)).toEqual(
      expect.arrayContaining([
        "Share comparative clinical data and schedule observation case",
      ]),
    );
    const followUpCardTitles = composed.actionableCards
      .filter((card) => card.category === "follow_up_task")
      .map((card) => card.taskTitle ?? card.headline);
    expect(followUpCardTitles).toEqual(
      expect.arrayContaining([
        "Share comparative clinical data and schedule observation case",
        "Email proposed observation dates",
      ]),
    );

    const productOutcomes = outcomes.filter((row) => row.kind === "product_intelligence");
    expect(productOutcomes.some(isProductUsageOutcome)).toBe(true);
    expect(productOutcomes.some(isProductInterestOutcome)).toBe(true);
  });
});
