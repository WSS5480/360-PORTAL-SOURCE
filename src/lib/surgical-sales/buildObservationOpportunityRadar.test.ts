import { describe, expect, it } from "vitest";
import { buildObservationOpportunityRadar } from "./buildObservationOpportunityRadar";

describe("buildObservationOpportunityRadar", () => {
  it("surfaces pre-observation hypotheses with discovery-driven confidence", () => {
    const view = buildObservationOpportunityRadar({
      caseRow: {
        case_type: "observation",
        product_focus: "ACSIS",
      },
      providerContact: {
        provider_workflow_pain_points: "Fixation inconsistency between cases",
        provider_product_interests: "Robotic sizing workflow",
      },
    });

    expect(view.hasObservationCapture).toBe(false);
    expect(view.blips.some((blip) => blip.title === "ACSIS opportunity")).toBe(true);
    expect(view.blips.find((blip) => blip.id === "workflow_improvement")?.confidence).toBe("medium");
    expect(view.blips.find((blip) => blip.id === "training")?.confidence).toBe("medium");
  });

  it("raises product confidence after strong field capture", () => {
    const view = buildObservationOpportunityRadar({
      caseRow: {
        product_focus: "ACSIS",
        live_observation_product_fit: "Strong",
        observation_quick_finding_product_interest: "Strong",
      },
      providerContact: {
        provider_product_gaps: "Visualization during complex repairs",
      },
    });

    const acsis = view.blips.find((blip) => blip.id === "acsis");
    expect(view.hasObservationCapture).toBe(true);
    expect(acsis?.confidence).toBe("high");
    expect(acsis?.trend).toBe("up");
    expect(acsis?.sourceLabel).toBe("Field capture");
  });

  it("reduces workflow confidence when friction is not observed", () => {
    const view = buildObservationOpportunityRadar({
      caseRow: {
        live_observation_staff_process: "No",
        observation_quick_finding_product_interest: "Mentioned",
      },
      providerContact: {
        provider_workflow_pain_points: "Turnover delays",
      },
    });

    const workflow = view.blips.find((blip) => blip.id === "workflow_improvement");
    expect(workflow?.baselineConfidence).toBe("medium");
    expect(workflow?.confidence).toBe("low");
    expect(workflow?.trend).toBe("down");
  });
});
