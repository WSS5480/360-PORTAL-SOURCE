import { describe, expect, it } from "vitest";
import { buildProviderCaseTabRow } from "./buildProviderCaseTabRow";
import { resolveProviderCaseCompletion } from "./resolveProviderCaseCompletion";

describe("buildProviderCaseTabRow", () => {
  it("builds compact rows with checklist completion and toned signal chips", () => {
    const row = buildProviderCaseTabRow({
      id: "case-1",
      case_number: "Case 3",
      case_type: "observation",
      procedure_type: "Robotic ventral hernia repair",
      case_date: "2026-05-29",
      status: "completed",
      observation_completed_at: "2026-05-29T18:42:00.000Z",
      account_id: "acct-1",
      surgeon_contact_id: "prov-1",
      live_observation_clinical_pain_points: "Visualization challenge observed",
      live_observation_product_fit: "Strong",
      debrief_key_findings: "Bard Mesh noted",
      observation_workflow_intelligence_snapshot: {
        sections: [{ id: "staff_workflow", items: ["Staff workflow positive"] }],
      },
    });

    expect(row.procedureTitle).toBe("Robotic ventral hernia repair");
    expect(row.caseSubtitle).toContain("Observation");
    expect(row.status.label).toBe("Completed");
    expect(row.dictationCompletedLine).toMatch(/·/);
    expect(row.completion.items.some((item) => item.id === "notes" && item.done)).toBe(true);
    expect(row.keySignals.length).toBeGreaterThan(0);
    expect(row.keySignals.length).toBeLessThanOrEqual(4);
    expect(row.keySignals[0]).toMatchObject({ label: expect.any(String), tone: expect.any(String) });
    expect(row.addNoteHref).toContain("tab=workflow");
  });

  it("falls back to latest note activity when observation_completed_at is missing", () => {
    const row = buildProviderCaseTabRow({
      id: "case-note-fallback",
      case_type: "observation",
      procedure_type: "Lap chole",
      case_date: "2026-06-01",
      status: "completed",
      activities: [
        { activity_type: "note", created_at: "2026-06-01T14:05:00.000Z" },
        { activity_type: "note", created_at: "2026-06-01T15:20:00.000Z" },
        { activity_type: "status_change", created_at: "2026-06-01T16:00:00.000Z" },
      ],
    });

    expect(row.dictationCompletedLine).toMatch(/·/);
  });

  it("does not claim dictation completed for in-progress cases without observation_completed_at", () => {
    const row = buildProviderCaseTabRow({
      id: "case-in-progress",
      case_type: "observation",
      procedure_type: "Lap chole",
      case_date: "2026-06-01",
      status: "confirmed",
      activities: [{ activity_type: "note", created_at: "2026-06-01T15:20:00.000Z" }],
    });

    expect(row.dictationCompletedLine).toBeNull();
  });

  it("routes product support add-note to field notes tab", () => {
    const row = buildProviderCaseTabRow({
      id: "case-2",
      case_type: "product_support",
      procedure_type: "TKA",
      case_date: "2026-06-04",
      status: "completed",
      case_support_outcome: "product_used",
      notes: "Case went well",
    });

    expect(row.addNoteHref).toContain("tab=field_notes");
    expect(row.completion.items.find((item) => item.id === "outcome")?.done).toBe(true);
  });
});

describe("resolveProviderCaseCompletion", () => {
  it("returns checklist items for observation cases", () => {
    const view = resolveProviderCaseCompletion({
      case_type: "observation",
      status: "completed",
      debrief_key_findings: "Done",
    });
    expect(view.items).toHaveLength(2);
    expect(view.items[0]?.label).toBe("Notes complete");
  });
});
