import { describe, expect, it } from "vitest";
import { buildObservationFieldChecklist } from "./buildObservationFieldChecklist";

describe("buildObservationFieldChecklist", () => {
  it("returns six field checklist items unchecked before capture", () => {
    const view = buildObservationFieldChecklist({ caseRow: {} });

    expect(view.items).toHaveLength(6);
    expect(view.items.map((item) => item.label)).toEqual([
      "Products identified",
      "Competitor observed",
      "Workflow issue observed",
      "Provider frustration observed",
      "Staff frustration observed",
      "Opportunity signal identified",
    ]);
    expect(view.checkedCount).toBe(0);
  });

  it("marks checklist items checked when intelligence is captured", () => {
    const view = buildObservationFieldChecklist({
      caseRow: {
        live_observation_product_fit: "Portfolio mesh tray",
        live_observation_competitors: "Rival vendor",
        live_observation_workflow: "Setup delay",
        live_observation_clinical_pain_points: "Visualization delay",
        live_observation_staff_process: "Nursing frustration",
        observation_quick_finding_product_interest: "Strong fit signal",
      },
    });

    expect(view.checkedCount).toBe(6);
    expect(view.items.every((item) => item.checked)).toBe(true);
  });
});
