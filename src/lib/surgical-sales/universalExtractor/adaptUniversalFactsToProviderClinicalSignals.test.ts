import { describe, expect, it } from "vitest";

import {
  adaptUniversalFactsToCategoryEmergingChips,
  adaptUniversalFactsToClinicalTrendEvidenceCards,
  adaptUniversalFactsToProductEmergingChips,
  adaptUniversalFactsToProductInterestEvidenceCard,
  adaptUniversalFactsToProcedureVolumeEmergingChips,
  adaptUniversalFactsToWorkflowEvidenceCards,
} from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToProviderClinicalSignals";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

function factRow(input: {
  concept: string;
  assertion_level: string;
  case_id?: string;
  normalized_label?: string;
  evidence_text?: string;
  product_mentioned?: string;
}) {
  return {
    id: `fact-${input.concept}`,
    capture_id: "capture-1",
    provider_id: "provider-1",
    organization_id: null,
    case_id: input.case_id ?? null,
    encounter_id: null,
    concept: input.concept,
    normalized_label: input.normalized_label ?? "",
    assertion_level: input.assertion_level,
    source_type: "intro_call",
    evidence_text: input.evidence_text ?? input.normalized_label ?? "",
    product_mentioned: input.product_mentioned ?? null,
    confidence: "high" as const,
    negated: false,
    uncertain: false,
    suppressed: false,
    created_at: "2026-06-01T12:00:00Z",
  };
}

function introRun(facts: ReturnType<typeof factRow>[]): UniversalFactExtractionRun[] {
  return [
    {
      capture_id: "capture-intro",
      declared_source_type: "intro_call",
      extraction_model: "test",
      created_at: "2026-06-01T12:00:00Z",
      operational_note_id: null,
      facts,
    },
  ];
}

describe("adaptUniversalFactsToProviderClinicalSignals", () => {
  it("builds clinical trend cards from intro-call UF procedure volume facts", () => {
    const cards = adaptUniversalFactsToClinicalTrendEvidenceCards({
      providerRuns: introRun([
        factRow({
          concept: "unknown",
          assertion_level: "provider_reported",
          normalized_label: "Robotic ventral hernia repair volume",
          evidence_text:
            "They have been doing more robotic ventral hernia repairs lately and are seeing more abdominal wall reconstruction cases.",
        }),
      ]),
    });

    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]?.title).toBe("Clinical Trend");
    expect(cards[0]?.excerpt).toMatch(/robotic ventral|abdominal wall/i);
  });

  it("builds product interest card from competitor_product UF fact", () => {
    const card = adaptUniversalFactsToProductInterestEvidenceCard({
      providerRuns: introRun([
        factRow({
          concept: "competitor_product",
          assertion_level: "provider_reported",
          product_mentioned: "Bard Mesh",
          normalized_label: "Current product identified: Bard Mesh",
          evidence_text: "He is currently using Bard Mesh in a lot of his hernia cases.",
        }),
      ]),
      detailsHref: null,
      programCompletedCount: 0,
      completedCaseIds: [],
    });

    expect(card?.title).toBe("Product Interest");
    expect(card?.excerpt).toMatch(/Bard Mesh/i);
    expect(card?.intelligenceImpacts[0]?.label).toMatch(/Bard Mesh/i);
  });

  it("builds procedure volume emerging chips from UF intro facts", () => {
    const chips = adaptUniversalFactsToProcedureVolumeEmergingChips({
      providerRuns: introRun([
        factRow({
          concept: "unknown",
          assertion_level: "provider_reported",
          evidence_text:
            "doing more robotic ventral hernia repairs lately and higher volume of abdominal wall reconstruction",
        }),
      ]),
      completedCaseIds: [],
      programCompletedCount: 0,
    });

    expect(chips.length).toBeGreaterThan(0);
    expect(chips.map((chip) => chip.text).join(" ")).toMatch(/volume increasing|Robotic ventral/i);
    expect(chips[0]?.evidenceQuote).toMatch(/robotic ventral|abdominal wall/i);
  });

  it("uses unique ids when one UF fact produces multiple procedure chips", () => {
    const chips = adaptUniversalFactsToProcedureVolumeEmergingChips({
      providerRuns: introRun([
        factRow({
          concept: "unknown",
          assertion_level: "provider_reported",
          evidence_text:
            "They discussed robotic ventral hernia repairs and abdominal wall reconstruction cases.",
        }),
      ]),
      completedCaseIds: [],
      programCompletedCount: 0,
    });

    const ids = chips.map((chip) => chip.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("builds product emerging chips from UF product facts", () => {
    const chips = adaptUniversalFactsToProductEmergingChips({
      providerRuns: introRun([
        factRow({
          concept: "current_product",
          assertion_level: "provider_reported",
          product_mentioned: "Bard Mesh",
          normalized_label: "Current product identified: Bard Mesh",
          evidence_text: "He is currently using Bard Mesh in a lot of his hernia cases.",
        }),
      ]),
      executionStage: false,
    });

    expect(chips[0]?.text).toMatch(/Bard Mesh/i);
    expect(chips[0]?.evidenceQuote).toMatch(/Bard Mesh/i);
  });

  it("filters internal workflow labels from category emerging chips", () => {
    const chips = adaptUniversalFactsToCategoryEmergingChips({
      providerRuns: introRun([
        factRow({
          concept: "provider_sentiment",
          assertion_level: "provider_reported",
          normalized_label: "Commercial disposition: observe before evaluation",
          evidence_text: "Observing a case would be the best next step before evaluation.",
        }),
        factRow({
          concept: "workflow_or_timing_issue",
          assertion_level: "provider_reported",
          normalized_label: "Workflow priority: reducing unnecessary steps during case setup",
          evidence_text:
            "He also mentioned that reducing unnecessary steps during case setup can have a meaningful impact on turnover time.",
        }),
      ]),
    });

    expect(chips.some((chip) => /commercial disposition/i.test(chip.text))).toBe(false);
    expect(chips.some((chip) => /reducing unnecessary steps/i.test(chip.text))).toBe(true);
    expect(chips.find((chip) => /reducing unnecessary steps/i.test(chip.text))?.evidenceQuote).toMatch(
      /turnover time/i,
    );
  });

  it("does not surface meeting narration as an emerging signal", () => {
    const chips = adaptUniversalFactsToCategoryEmergingChips({
      providerRuns: introRun([
        factRow({
          concept: "workflow_or_timing_issue",
          assertion_level: "provider_reported",
          normalized_label: "Workflow priority: introductory conversation",
          evidence_text: "Spoke with Dr. Onion today for an introductory conversation.",
        }),
      ]),
    });

    expect(chips).toHaveLength(0);
  });

  it("builds workflow evidence cards from UF workflow facts", () => {
    const cards = adaptUniversalFactsToWorkflowEvidenceCards({
      providerRuns: introRun([
        factRow({
          concept: "inventory_availability_issue",
          assertion_level: "provider_reported",
          normalized_label: "Operational concern: operating room efficiency issues",
          evidence_text:
            "He mentioned there are occasional frustrations related to instrumentation availability and operating room efficiency when multiple trauma cases are being managed on the same day.",
        }),
      ]),
    });

    expect(cards.length).toBe(1);
    expect(cards[0]?.title).toBe("Workflow & Priorities");
    expect(cards[0]?.sourceQuote).toMatch(/instrumentation availability|operating room efficiency/i);
  });
});
