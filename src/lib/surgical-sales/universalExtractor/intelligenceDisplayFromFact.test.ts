import { describe, expect, it } from "vitest";
import {
  intelligenceChipTextFromFact,
  shouldSkipUniversalFactIntelligenceDisplay,
  universalEmergingChipFromFact,
} from "@/lib/surgical-sales/universalExtractor/intelligenceDisplayFromFact";
import type { UniversalFactExtractionRun, UniversalSurgicalFactRow } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

function fact(partial: Partial<UniversalSurgicalFactRow> & Pick<UniversalSurgicalFactRow, "concept">): UniversalSurgicalFactRow {
  return {
    id: "f1",
    capture_id: "c1",
    provider_id: "p1",
    organization_id: null,
    case_id: null,
    encounter_id: null,
    normalized_label: "",
    assertion_level: "provider_reported",
    source_type: "intro_call",
    evidence_text: "",
    product_mentioned: null,
    confidence: "high",
    negated: false,
    uncertain: false,
    suppressed: false,
    created_at: "2026-06-01T12:00:00Z",
    ...partial,
  };
}

const introRun: UniversalFactExtractionRun = {
  capture_id: "c1",
  declared_source_type: "intro_call",
  extraction_model: "test",
  created_at: "2026-06-01T12:00:00Z",
  operational_note_id: null,
  facts: [],
};

describe("intelligenceDisplayFromFact", () => {
  it("skips commercial disposition on the intelligence page", () => {
    expect(
      shouldSkipUniversalFactIntelligenceDisplay(
        fact({
          concept: "provider_sentiment",
          normalized_label: "Commercial disposition: observe before evaluation",
          evidence_text: "Observing a case would be the best next step before evaluation.",
        }),
      ),
    ).toBe(true);
  });

  it("uses evidence sentences for workflow chips instead of internal labels", () => {
    const chip = universalEmergingChipFromFact(
      fact({
        concept: "workflow_or_timing_issue",
        normalized_label: "Workflow priority: reducing unnecessary steps during case setup",
        evidence_text:
          "He also mentioned that reducing unnecessary steps during case setup can have a meaningful impact on turnover time.",
      }),
      introRun,
    );

    expect(chip?.text).toMatch(/reducing unnecessary steps/i);
    expect(chip?.text).not.toMatch(/^workflow priority:/i);
    expect(chip?.evidenceQuote).toMatch(/turnover time/i);
    expect(chip?.evidenceSource).toBe("Intro Call");
  });

  it("prefers evidence over observation access interest labels", () => {
    const text = intelligenceChipTextFromFact(
      fact({
        concept: "access_pathway",
        normalized_label: "observation access interest",
        evidence_text:
          "He did not formally approve a case observation today, but he was receptive to the idea.",
      }),
    );
    expect(text).toMatch(/did not formally approve/i);
  });

  it("never emits truncated meeting narration like Spoke with Dr as an emerging chip", () => {
    const chip = universalEmergingChipFromFact(
      fact({
        concept: "workflow_or_timing_issue",
        normalized_label: "Workflow priority: relationship context",
        evidence_text: "Spoke with Dr. Onion today for an introductory conversation.",
      }),
      introRun,
    );

    expect(chip).toBeNull();
  });
});
