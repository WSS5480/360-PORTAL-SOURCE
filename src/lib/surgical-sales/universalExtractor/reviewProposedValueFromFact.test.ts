import { describe, expect, it } from "vitest";
import {
  reviewProposedValueFromFact,
  shouldSkipUniversalFactFieldProjection,
  shouldSkipUniversalFactWorkflowCard,
} from "@/lib/surgical-sales/universalExtractor/reviewProposedValueFromFact";

describe("reviewProposedValueFromFact", () => {
  it("prefers evidence sentences over internal access labels", () => {
    const value = reviewProposedValueFromFact({
      id: "f1",
      capture_id: "c1",
      concept: "access_pathway",
      normalized_label: "observation access interest",
      evidence_text:
        "He did not formally approve a case observation today, but he was receptive to the idea.",
      confidence: "high",
      suppressed: false,
      created_at: "2026-01-01T00:00:00Z",
      provider_id: null,
      organization_id: null,
      case_id: null,
      encounter_id: null,
    });
    expect(value).toContain("did not formally approve");
    expect(value).not.toBe("observation access interest");
  });

  it("skips commercial disposition field projection", () => {
    expect(
      shouldSkipUniversalFactFieldProjection({
        id: "f2",
        capture_id: "c1",
        concept: "provider_sentiment",
        normalized_label: "Commercial disposition: observation before evaluation",
        evidence_text: "Observing a case would be the best next step before evaluation.",
        confidence: "medium",
        suppressed: false,
        created_at: "2026-01-01T00:00:00Z",
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
      }),
    ).toBe(true);
  });

  it("skips relationship and commercial disposition workflow cards", () => {
    expect(
      shouldSkipUniversalFactWorkflowCard({
        id: "f3",
        capture_id: "c1",
        concept: "provider_sentiment",
        normalized_label: "Relationship: open to continued relationship",
        evidence_text: "Overall the discussion went well and he seemed open to continuing the relationship.",
        confidence: "medium",
        suppressed: false,
        created_at: "2026-01-01T00:00:00Z",
        provider_id: null,
        organization_id: null,
        case_id: null,
        encounter_id: null,
      }),
    ).toBe(true);
  });
});
