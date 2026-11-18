import { describe, expect, it } from "vitest";
import { buildProviderFieldTimeRisk } from "./buildProviderFieldTimeRisk";

describe("buildProviderFieldTimeRisk", () => {
  it("returns six procedural inputs", () => {
    const risk = buildProviderFieldTimeRisk({
      contact: { provider_relationship_stage: "prospect" },
      relationshipStage: "prospect",
      commercialStage: "early_discovery",
    });
    expect(risk.inputs).toHaveLength(6);
    expect(risk.inputs.map((i) => i.id)).toEqual([
      "coordinator_mapped",
      "or_access_known",
      "relationship_maturity",
      "workflow_intelligence",
      "scheduling_clarity",
      "observation_feasibility",
    ]);
  });

  it("flags high wasted field risk when access is blocked", () => {
    const risk = buildProviderFieldTimeRisk({
      contact: {
        provider_relationship_stage: "observation_requested",
        provider_observation_feasibility: "not_allowed",
      },
      relationshipStage: "observation_requested",
      commercialStage: "observation",
    });
    expect(risk.state).toBe("high_wasted_field_risk");
    expect(risk.tone).toBe("danger");
    expect(risk.narrative.tierLabel).toBe("High risk");
    expect(risk.narrative.whyFieldTimeFails.length).toBeGreaterThan(20);
    expect(risk.narrative.reducers.length).toBeGreaterThan(0);
  });

  it("surfaces committee-style failure copy when access path mentions committee", () => {
    const risk = buildProviderFieldTimeRisk({
      contact: {
        provider_relationship_stage: "observation_requested",
        provider_observation_access_path: "Vendor committee review required before OR entry",
      },
      relationshipStage: "observation_requested",
      commercialStage: "observation",
    });
    expect(risk.narrative.whyFieldTimeFails.toLowerCase()).toMatch(/committee|access/);
    expect(risk.narrative.reducers[0]?.reducerSignal).toMatch(/coordinator|access|cadence/i);
  });

  it("flags efficient target when observation pathway is mapped", () => {
    const risk = buildProviderFieldTimeRisk({
      contact: {
        provider_relationship_stage: "observation_scheduled",
        provider_observation_feasibility: "easy",
        provider_observation_access_path: "Rep may observe with coordinator approval",
        provider_observation_coordinator_contact: "Jane OR — jane@hospital.org",
        provider_observation_cadence_preference: "Tues/Thurs AM",
        provider_observation_best_days_case_types: "Posting 2 weeks out",
        provider_procedure_focus: "Lap chole",
        relationship_strength: "strong",
      },
      relationshipStage: "observation_scheduled",
      commercialStage: "observation",
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          status: "completed",
        } as never,
      ],
    });
    expect(risk.score).toBeGreaterThanOrEqual(6);
    expect(risk.inputs.filter((i) => i.status === "strong").length).toBeGreaterThanOrEqual(2);
    expect(risk.state).toBe("efficient_field_target");
    expect(risk.narrative.tierLabel).toBe("Clear to deploy");
  });

  it("requires remote validation when coordinator is open but access is documented", () => {
    const risk = buildProviderFieldTimeRisk({
      contact: {
        provider_relationship_stage: "observation_requested",
        provider_observation_feasibility: "easy",
        provider_observation_access_path: "Rep may observe with approval",
      },
      relationshipStage: "observation_requested",
      commercialStage: "observation",
      engagements: [
        {
          id: "e1",
          engagement_type: "or_visit",
          status: "planned",
        } as never,
      ],
    });
    expect(risk.state).toBe("requires_remote_validation_first");
  });
});
