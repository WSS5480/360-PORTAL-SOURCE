import { describe, expect, it } from "vitest";
import { buildProviderOperationalReadinessFramework } from "./buildProviderOperationalReadinessFramework";

describe("buildProviderOperationalReadinessFramework", () => {
  it("returns seven pillars and three motion gates without numeric scores", () => {
    const framework = buildProviderOperationalReadinessFramework({
      contact: {
        provider_observation_feasibility: "easy",
        provider_procedure_focus: "hernia repair",
      },
    });

    expect(framework.pillars).toHaveLength(7);
    expect(framework.motions.map((m) => m.motion)).toEqual([
      "observation",
      "evaluation",
      "commercialization",
    ]);
    expect(JSON.stringify(framework)).not.toMatch(/pipeline stage/i);
    expect(framework.protectFieldTime.dimensions).toHaveLength(5);
    expect(framework.fieldGuidance).toMatch(/Protect field time/i);
  });

  it("marks observation ready when OR access and scheduling are validated", () => {
    const framework = buildProviderOperationalReadinessFramework({
      contact: {
        provider_observation_feasibility: "easy|validated_at:2026-01-01",
        provider_observation_access_path: "scheduler|validated_at:2026-01-01",
        provider_observation_coordinator_contact: "Jane OR — ext 4412|validated_at:2026-01-01",
        provider_observation_cadence_preference: "weekly|validated_at:2026-01-01",
        provider_ideal_observation_cases: "lap chole|validated_at:2026-01-01",
        provider_procedure_focus: "hernia|validated_at:2026-01-01",
        provider_technique_preferences: "lap|validated_at:2026-01-01",
        provider_communication_style: "direct|validated_at:2026-01-01",
        provider_responsiveness: "same_day|validated_at:2026-01-01",
        influence_level: "high|validated_at:2026-01-01",
        provider_champion_potential: "strong|validated_at:2026-01-01",
        provider_support_expectations: "in_room|validated_at:2026-01-01",
        provider_credentialing_status: "cleared|validated_at:2026-01-01",
        provider_current_vendors: "incumbent|validated_at:2026-01-01",
      },
      relationshipStage: "observation_scheduled",
    });

    expect([
      "observation_possible_with_risk",
      "operationally_qualified",
      "evaluation_ready",
      "commercial_expansion_candidate",
    ]).toContain(framework.verdict.id);
    const observation = framework.motions.find((m) => m.motion === "observation");
    expect(observation?.verdict).toMatch(/ready|approaching/);
    expect(framework.pillars.find((p) => p.id === "or_access_maturity")?.posture).toMatch(
      /validated|forming/,
    );
  });

  it("blocks observation when access is restricted", () => {
    const framework = buildProviderOperationalReadinessFramework({
      contact: {
        provider_observation_feasibility: "restricted",
      },
    });

    const observation = framework.motions.find((m) => m.motion === "observation");
    expect(observation?.verdict).toBe("blocked");
    expect(observation?.safeToProceed).toBe(false);
    expect(framework.pillars.find((p) => p.id === "or_access_maturity")?.posture).toBe("blocked");
  });

  it("surfaces evaluation as not ready when observation foundation is thin", () => {
    const framework = buildProviderOperationalReadinessFramework({
      contact: {},
      relationshipStage: "prospect",
    });

    const evaluation = framework.motions.find((m) => m.motion === "evaluation");
    expect(evaluation?.verdict).toMatch(/not_ready|blocked/);
    expect(framework.pillars.filter((p) => p.posture === "thin").length).toBeGreaterThan(0);
  });

  it("uses procedural pillar labels grounded in OR and workflow language", () => {
    const framework = buildProviderOperationalReadinessFramework({
      contact: { provider_procedure_focus: "TKA" },
    });

    const labels = framework.pillars.map((p) => p.label);
    expect(labels).toContain("OR access maturity");
    expect(labels).toContain("Procedural alignment");
    expect(labels).toContain("Vendor pathway");
    expect(labels).toContain("Commercialization influence");
    expect(framework.verdict.label).toBeTruthy();
  });
});
