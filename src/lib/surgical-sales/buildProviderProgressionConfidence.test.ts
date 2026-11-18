import { describe, expect, it } from "vitest";
import { buildProviderProgressionConfidence } from "./buildProviderProgressionConfidence";
import { resolveProviderCommercialWorkflowStage } from "./providerCommercialWorkflowStage";

describe("buildProviderProgressionConfidence", () => {
  it("returns emerging/low confidence for thin early prospect", () => {
    const commercialStage = resolveProviderCommercialWorkflowStage({
      relationshipStage: "prospect",
      opportunities: [],
      cases: [],
      engagements: [],
    });

    const rows = buildProviderProgressionConfidence({
      contact: { provider_relationship_stage: "prospect" },
      relationshipStage: "prospect",
      commercialStage,
      engagements: [],
    });

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.id)).toEqual(["observation", "evaluation", "adoption"]);
    expect(["emerging", "low"]).toContain(rows[0]!.confidence);
    expect(["emerging", "low"]).toContain(rows[1]!.confidence);
    expect(rows.every((r) => r.scan.length > 5)).toBe(true);
  });

  it("raises observation confidence when OR and scheduling signals are captured", () => {
    const commercialStage = resolveProviderCommercialWorkflowStage({
      relationshipStage: "observation_scheduled",
      opportunities: [],
      cases: [],
      engagements: [{ engagement_type: "or_observation", status: "scheduled" }],
    });

    const rows = buildProviderProgressionConfidence({
      commercialStage,
      relationshipStage: "observation_scheduled",
      contact: {
        provider_observation_feasibility: "easy",
        provider_observation_access_path: "none|coordinator",
        provider_observation_coordinator_contact: "Scheduler",
        provider_observation_cadence_preference: "weekly",
        provider_procedure_focus: "Hernia",
        provider_technique_preferences: "lap",
      },
      engagements: [{ engagement_type: "or_observation", status: "scheduled" } as never],
    });

    const observation = rows.find((r) => r.id === "observation");
    expect(observation).toBeDefined();
    expect(["moderate", "solid"]).toContain(observation!.confidence);
    expect(observation!.confidenceLabel).toMatch(/Moderate|Solid/);
  });
});
