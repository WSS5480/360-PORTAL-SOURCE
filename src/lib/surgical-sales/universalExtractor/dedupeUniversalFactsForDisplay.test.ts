import { describe, expect, it } from "vitest";

import { dedupeUniversalFactsWithinRun } from "./dedupeUniversalFactsForDisplay";

describe("dedupeUniversalFactsWithinRun", () => {
  it("merges duplicate concepts within one run and preserves evidence count", () => {
    const merged = dedupeUniversalFactsWithinRun([
      {
        id: "a",
        concept: "sizing_or_fit_issue",
        normalized_label: "Sizing issue noted",
        assertion_level: "observed",
        source_type: "observation_case",
        confidence: "medium",
        evidence_text: "plate felt too long",
        uncertain: false,
        negated: false,
      },
      {
        id: "b",
        concept: "staff_workflow",
        normalized_label: "Staff moved slowly",
        assertion_level: "observed",
        source_type: "observation_case",
        confidence: "high",
        evidence_text: "staff workflow slow",
        uncertain: false,
        negated: false,
      },
      {
        id: "c",
        concept: "sizing_or_fit_issue",
        normalized_label: "Fit concern repeated",
        assertion_level: "observed",
        source_type: "observation_case",
        confidence: "high",
        evidence_text: "screw length concern",
        uncertain: false,
        negated: false,
      },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0].concept).toBe("sizing_or_fit_issue");
    expect(merged[0].evidence_count).toBe(2);
    expect(merged[0].confidence).toBe("high");
    expect(merged[0].merged_fact_ids).toEqual(["a", "c"]);
    expect(merged[0].evidence_snippets).toEqual(["plate felt too long", "screw length concern"]);
    expect(merged[1].concept).toBe("staff_workflow");
    expect(merged[1].evidence_count).toBe(1);
  });

  it("does not merge facts from separate run arrays", () => {
    const runOne = dedupeUniversalFactsWithinRun([
      {
        id: "1",
        concept: "staff_workflow",
        normalized_label: "A",
        assertion_level: "observed",
        source_type: "observation_case",
        confidence: "high",
        evidence_text: "first",
        uncertain: false,
        negated: false,
      },
    ]);
    const runTwo = dedupeUniversalFactsWithinRun([
      {
        id: "2",
        concept: "staff_workflow",
        normalized_label: "B",
        assertion_level: "observed",
        source_type: "observation_case",
        confidence: "medium",
        evidence_text: "second",
        uncertain: false,
        negated: false,
      },
    ]);

    expect(runOne).toHaveLength(1);
    expect(runTwo).toHaveLength(1);
    expect(runOne[0].id).not.toBe(runTwo[0].id);
  });
});
