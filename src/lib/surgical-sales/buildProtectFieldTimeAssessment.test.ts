import { describe, expect, it } from "vitest";
import { buildProtectFieldTimeAssessment } from "./buildProtectFieldTimeAssessment";

describe("buildProtectFieldTimeAssessment", () => {
  it("evaluates five protect-field-time dimensions", () => {
    const assessment = buildProtectFieldTimeAssessment({
      contact: {
        provider_observation_feasibility: "",
        provider_observation_access_path: "",
        provider_observation_coordinator_contact: "",
        provider_procedure_focus: "",
      },
      relationshipStage: "observation_requested",
      commercialStage: "observation",
    });

    expect(assessment.dimensions).toHaveLength(5);
    expect(assessment.dimensions.map((d) => d.id)).toEqual([
      "wasted_or_travel",
      "observation_failure",
      "wrong_procedure_target",
      "scheduling_collapse",
      "vendor_gate_failure",
    ]);
    expect(assessment.posture).not.toBe("clear_to_deploy");
    expect(assessment.priorityDbKeys.length).toBeGreaterThan(0);
    expect(assessment.blockerHeadlines.length).toBeGreaterThan(0);
  });

  it("protects field time when access and procedure signals are strong", () => {
    const assessment = buildProtectFieldTimeAssessment({
      contact: {
        provider_observation_feasibility: "easy",
        provider_observation_access_path: "scheduler approval",
        provider_observation_coordinator_contact: "Jane OR coordinator",
        provider_observation_cadence_preference: "weekly",
        provider_observation_best_days_case_types: "Tuesdays",
        provider_procedure_focus: "TKA",
        provider_technique_preferences: "robotic",
        provider_credentialing_status: "cleared",
        provider_champion_potential: "strong ally",
        provider_support_expectations: "rep in room",
      },
      relationshipStage: "observation_scheduled",
      commercialStage: "observation",
    });

    expect(assessment.protectionScore).toBeGreaterThan(50);
    expect(assessment.dimensions.filter((d) => d.level === "critical")).toHaveLength(0);
  });
});
