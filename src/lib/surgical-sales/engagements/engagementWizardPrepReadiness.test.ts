import { describe, expect, it } from "vitest";
import {
  assessEngagementWizardPrepReadiness,
  preparationReadinessGapChipLabel,
  preparationReadinessIntroCallHeadline,
  preparationReadinessMissingSignals,
} from "@/lib/surgical-sales/engagements/engagementWizardPrepReadiness";

describe("assessEngagementWizardPrepReadiness", () => {
  it("includes percent_complete from met signals", () => {
    const readiness = assessEngagementWizardPrepReadiness({
      isStrategic: true,
      engagementType: "intro_call",
      workflowDraft: {
        observation_goal: "SMART goal with enough text",
        pre_observation_impact_opening_statement: "",
        pre_observation_probes: "",
      },
      basicsProductLine: "",
      suggestContext: {},
      opportunityProductLine: null,
    });
    expect(readiness.total_count).toBe(4);
    expect(readiness.met_count).toBe(1);
    expect(readiness.percent_complete).toBe(25);
  });

  it("maps missing signals to short chip labels", () => {
    const readiness = assessEngagementWizardPrepReadiness({
      isStrategic: true,
      engagementType: "intro_call",
      workflowDraft: {},
      basicsProductLine: "",
      suggestContext: {},
    });
    const missing = preparationReadinessMissingSignals(readiness);
    expect(missing.length).toBeGreaterThan(0);
    expect(preparationReadinessGapChipLabel(missing[0]!)).toMatch(/Objective|Questions|Opening|Product/);
  });

  it("headline reflects readiness level", () => {
    expect(preparationReadinessIntroCallHeadline("strong", 100)).toBe("Ready for this intro call");
    expect(preparationReadinessIntroCallHeadline("minimal", 25)).toBe(
      "Still developing for this intro call",
    );
  });
});
