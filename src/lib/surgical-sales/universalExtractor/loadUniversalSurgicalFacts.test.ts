import { describe, expect, it } from "vitest";

import {
  groupUniversalFactsByCapture,
  type UniversalFactExtractionRun,
  type UniversalSurgicalFactCaptureRow,
  type UniversalSurgicalFactRow,
} from "./loadUniversalSurgicalFacts";

function capture(id: string, created_at: string): UniversalSurgicalFactCaptureRow {
  return {
    id,
    raw_note: "note",
    declared_source_type: "observation_case",
    extraction_model: "rules-v1",
    extraction_ms: 1,
    provider_id: null,
    organization_id: null,
    case_id: "case-1",
    encounter_id: null,
    operational_note_id: null,
    workflow_stage: null,
    product_context: null,
    created_at,
  };
}

function fact(id: string, capture_id: string, concept: string): UniversalSurgicalFactRow {
  return {
    id,
    capture_id,
    provider_id: null,
    organization_id: null,
    case_id: "case-1",
    encounter_id: null,
    concept: concept as UniversalSurgicalFactRow["concept"],
    normalized_label: concept,
    assertion_level: "observed",
    source_type: "observation_case",
    evidence_text: concept,
    confidence: "high",
    negated: false,
    uncertain: false,
    suppressed: false,
    created_at: "2026-06-14T12:00:00Z",
  };
}

describe("groupUniversalFactsByCapture", () => {
  it("keeps runs separate and preserves capture order", () => {
    const captures = [capture("run-new", "2026-06-14T13:00:00Z"), capture("run-old", "2026-06-14T12:00:00Z")];
    const facts = [
      fact("f1", "run-new", "staff_workflow"),
      fact("f2", "run-old", "sizing_or_fit_issue"),
      fact("f3", "run-old", "staff_workflow"),
    ];

    const runs = groupUniversalFactsByCapture(captures, facts);

    expect(runs).toHaveLength(2);
    expect(runs[0].capture_id).toBe("run-new");
    expect(runs[0].facts.map((row) => row.concept)).toEqual(["staff_workflow"]);
    expect(runs[1].capture_id).toBe("run-old");
    expect(runs[1].facts.map((row) => row.concept)).toEqual(["sizing_or_fit_issue", "staff_workflow"]);
  });

  it("returns empty fact lists for captures without facts", () => {
    const runs = groupUniversalFactsByCapture([capture("run-empty", "2026-06-14T12:00:00Z")], []);
    expect(runs).toEqual<UniversalFactExtractionRun[]>([
      expect.objectContaining({ capture_id: "run-empty", facts: [] }),
    ]);
  });
});
