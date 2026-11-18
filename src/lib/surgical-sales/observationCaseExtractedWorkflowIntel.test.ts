import { describe, expect, it } from "vitest";
import {
  buildObservationWorkflowIntelView,
  hasObservationExtractedWorkflowIntel,
  OBSERVATION_WORKFLOW_INTEL_PLACEHOLDER,
} from "./observationCaseExtractedWorkflowIntel";

describe("observationCaseExtractedWorkflowIntel", () => {
  it("exposes the empty-state placeholder copy", () => {
    expect(OBSERVATION_WORKFLOW_INTEL_PLACEHOLDER).toContain("observation notes or debrief");
  });

  it("returns false when snapshot is missing", () => {
    expect(hasObservationExtractedWorkflowIntel({})).toBe(false);
    expect(buildObservationWorkflowIntelView({}).hasContent).toBe(false);
  });

  it("parses flat category keys into structured categories", () => {
    const view = buildObservationWorkflowIntelView({
      observation_workflow_intelligence_snapshot: {
        friction_points: ["Tray delay at turnover"],
        procedure_workflow: "Lap setup starts in lateral position",
        extracted_at: "2026-05-29T12:00:00.000Z",
      },
    });

    expect(view.hasContent).toBe(true);
    expect(view.categories.map((category) => category.id)).toEqual([
      "procedure_workflow",
      "friction_points",
    ]);
    expect(view.categories[0]?.items[0]).toContain("Lap setup");
    expect(view.extractedAt).toBe("2026-05-29T12:00:00.000Z");
  });

  it("parses categories and sections arrays", () => {
    const view = buildObservationWorkflowIntelView({
      observation_workflow_intelligence_snapshot: {
        categories: [{ id: "staff_workflow", items: ["Circulator owns preference cards"] }],
        sections: [{ key: "follow_up", notes: "Schedule follow-up with SPD lead" }],
      },
    });

    expect(view.hasContent).toBe(true);
    expect(view.categories.map((category) => category.id)).toEqual([
      "staff_workflow",
      "follow_up_signals",
    ]);
  });

  it("returns false for empty snapshot object or sections without items", () => {
    expect(
      hasObservationExtractedWorkflowIntel({
        observation_workflow_intelligence_snapshot: {},
      }),
    ).toBe(false);
    expect(
      hasObservationExtractedWorkflowIntel({
        observation_workflow_intelligence_snapshot: { sections: [{ id: "workflow_intelligence" }] },
      }),
    ).toBe(false);
  });
});
