import { describe, expect, it } from "vitest";

import {
  selectCapturesPreferringCaseDiversity,
  type UniversalSurgicalFactCaptureRow,
} from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

function capture(input: {
  id: string;
  case_id: string | null;
  created_at: string;
}): UniversalSurgicalFactCaptureRow {
  return {
    id: input.id,
    raw_note: "",
    declared_source_type: "observation_case",
    extraction_model: "test",
    extraction_ms: null,
    provider_id: "provider-1",
    organization_id: null,
    case_id: input.case_id,
    encounter_id: null,
    operational_note_id: null,
    workflow_stage: null,
    product_context: null,
    created_at: input.created_at,
  };
}

describe("selectCapturesPreferringCaseDiversity", () => {
  it("keeps breadth across cases when one case floods recent notes", () => {
    const captures: UniversalSurgicalFactCaptureRow[] = [];
    // 12 newest notes all on busy-case, then older notes on other cases.
    for (let i = 0; i < 12; i += 1) {
      captures.push(
        capture({
          id: `busy-${i}`,
          case_id: "busy-case",
          created_at: `2026-07-16T1${String(i).padStart(2, "0")}:00:00Z`,
        }),
      );
    }
    for (let i = 0; i < 8; i += 1) {
      captures.push(
        capture({
          id: `other-${i}`,
          case_id: `case-${i}`,
          created_at: `2026-06-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
        }),
      );
    }

    // Newest-first input (as returned by the DB query).
    const newestFirst = [...captures].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const selected = selectCapturesPreferringCaseDiversity(newestFirst, 10);
    const caseIds = new Set(selected.map((row) => row.case_id));

    expect(selected).toHaveLength(10);
    expect(caseIds.has("busy-case")).toBe(true);
    // Naive newest-10 would only keep busy-case. Diversity must retain other cases.
    expect(caseIds.size).toBeGreaterThanOrEqual(8);
  });
});
