import { describe, expect, it } from "vitest";
import { buildProviderOperationalReadinessFramework } from "./buildProviderOperationalReadinessFramework";
describe("buildProviderOperationalReadinessEngine", () => {
  it("returns not viable for empty prospect account", () => {
    const framework = buildProviderOperationalReadinessFramework({
      contact: {},
      relationshipStage: "prospect",
    });

    expect(framework.verdict.id).toBe("not_viable_yet");
    expect(framework.verdict.label).toBe("Operational picture still developing");
    expect(JSON.stringify(framework)).not.toMatch(/confidence score|pipeline stage/i);
  });

  it("exposes seven unified inputs with field labels", () => {
    const framework = buildProviderOperationalReadinessFramework({
      contact: { provider_procedure_focus: "TKA" },
    });

    expect(framework.pillars.map((p) => p.label)).toEqual([
      "OR access maturity",
      "Workflow intelligence",
      "Relationship mapping",
      "Procedural alignment",
      "Scheduling clarity",
      "Vendor pathway",
      "Commercialization influence",
    ]);
  });

  it("can reach operationally qualified when OR and workflow signals are mapped", () => {
    const framework = buildProviderOperationalReadinessFramework({
      contact: {
        provider_observation_feasibility: "easy",
        provider_observation_access_path: "scheduler approval",
        provider_observation_coordinator_contact: "Jane OR",
        provider_procedure_focus: "TKA",
        provider_technique_preferences: "robotic",
        provider_communication_style: "direct",
        influence_level: "high",
        provider_credentialing_status: "cleared",
      },
      relationshipStage: "observation_requested",
    });

    expect(["operationally_qualified", "observation_possible_with_risk"]).toContain(
      framework.verdict.id,
    );
  });

  it("blocks at not viable when observation is restricted", () => {
    const framework = buildProviderOperationalReadinessFramework({
      contact: { provider_observation_feasibility: "restricted" },
    });

    expect(framework.verdict.id).toBe("not_viable_yet");
  });
});
