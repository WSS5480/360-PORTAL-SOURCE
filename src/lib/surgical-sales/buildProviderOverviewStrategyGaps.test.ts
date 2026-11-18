import { describe, expect, it } from "vitest";
import { buildProviderOverviewStrategyGaps } from "./buildProviderOverviewStrategyGaps";

describe("buildProviderOverviewStrategyGaps", () => {
  it("returns action-oriented gap cards with why and unlock", () => {
    const gaps = buildProviderOverviewStrategyGaps({
      contact: {
        provider_observation_access_path: "",
        provider_observation_coordinator_contact: "",
        provider_credentialing_status: "",
      },
      planning: {
        filled: 2,
        total: 40,
        percent: 5,
        status: "in_progress",
        sections: [],
        sections_complete: 0,
        sections_total: 5,
      },
      commercialStage: "early_discovery",
      maxItems: 3,
    });

    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.length).toBeLessThanOrEqual(3);
    expect(gaps[0].headline.length).toBeGreaterThan(5);
    expect(gaps[0].operationalConsequence.fieldInefficiency.length).toBeGreaterThan(10);
    expect(gaps[0].operationalImpact.length).toBeGreaterThan(10);
    expect(gaps[0].unlockValue.length).toBeGreaterThan(10);
    expect(gaps[0].dbKey).toBeTruthy();
  });
});
