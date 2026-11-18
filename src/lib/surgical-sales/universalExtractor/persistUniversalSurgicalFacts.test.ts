import { describe, expect, it } from "vitest";

import {
  buildUniversalFactRows,
  resolveUniversalFactScope,
} from "./persistUniversalSurgicalFacts";
import { runUniversalSurgicalExtraction } from "./runUniversalSurgicalExtraction";

describe("persistUniversalSurgicalFacts helpers", () => {
  it("resolves scope from case row and context", () => {
    const scope = resolveUniversalFactScope({
      context: { case_id: "case-uuid" },
      operational_note_id: "note-uuid",
      caseRow: {
        id: "case-uuid",
        surgeon_contact_id: "provider-uuid",
        account_id: "org-uuid",
        engagement_id: "encounter-uuid",
        procedure_type: "Distal radius ORIF",
      },
    });

    expect(scope.provider_id).toBe("provider-uuid");
    expect(scope.organization_id).toBe("org-uuid");
    expect(scope.case_id).toBe("case-uuid");
    expect(scope.encounter_id).toBe("encounter-uuid");
    expect(scope.operational_note_id).toBe("note-uuid");
    expect(scope.product_context).toBe("Distal radius ORIF");
  });

  it("builds fact rows with denormalized scope ids", () => {
    const extraction = runUniversalSurgicalExtraction({
      raw_note: "Extra time spent confirming implant sizing.",
      declared_source_type: "observation_case",
    });

    const rows = buildUniversalFactRows(
      "capture-uuid",
      {
        provider_id: "provider-uuid",
        case_id: "case-uuid",
      },
      extraction.facts,
      false,
    );

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].capture_id).toBe("capture-uuid");
    expect(rows[0].provider_id).toBe("provider-uuid");
    expect(rows[0].case_id).toBe("case-uuid");
    expect(rows[0].suppressed).toBe(false);
    expect(rows[0].concept).toBe("sizing_or_fit_issue");
  });

  it("marks suppressed facts separately", () => {
    const rows = buildUniversalFactRows(
      "capture-uuid",
      { case_id: "case-uuid" },
      [
        {
          concept: "no_issue_or_routine",
          normalized_label: "Negated",
          assertion_level: "observed",
          source_type: "observation_case",
          evidence_text: "no delays observed",
          confidence: "high",
          negated: true,
          uncertain: false,
        },
      ],
      true,
    );

    expect(rows[0].suppressed).toBe(true);
    expect(rows[0].negated).toBe(true);
  });
});
