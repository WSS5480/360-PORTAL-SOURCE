import { describe, expect, it } from "vitest";
import { buildProviderIntelligenceProgressionDashboard } from "./buildProviderIntelligenceProgressionDashboard";

describe("buildProviderIntelligenceProgressionDashboard", () => {
  it("returns deployment track and four progression lanes", () => {
    const dashboard = buildProviderIntelligenceProgressionDashboard({
      contact: {},
      relationshipStage: "prospect",
    });

    expect(dashboard.deployment.phases).toHaveLength(6);
    expect(dashboard.lanes).toHaveLength(4);
    expect(dashboard.lanes.map((l) => l.id)).toEqual([
      "operational_maturity",
      "deployment_progression",
      "observation_readiness",
      "commercialization",
    ]);
    expect(dashboard.movementHeadline.length).toBeGreaterThan(0);
  });

  it("uses deployment phase labels aligned to operational deployment language", () => {
    const dashboard = buildProviderIntelligenceProgressionDashboard({
      contact: {},
      relationshipStage: "prospect",
    });

    expect(dashboard.deployment.currentPhaseLabel).toBe("Early discovery");
    expect(dashboard.deployment.phases[0]?.label).toBe("Early discovery");
  });
});
