import { describe, expect, it } from "vitest";
import { buildProviderOverviewDiscoveryAreas } from "./buildProviderOverviewDiscoveryAreas";
import { resolveProviderCommercialWorkflowStage } from "./providerCommercialWorkflowStage";

describe("buildProviderOverviewDiscoveryAreas", () => {
  it("splits observation signals into known and unknown", () => {
    const commercialStage = resolveProviderCommercialWorkflowStage({
      relationshipStage: "observation_requested",
      opportunities: [],
      cases: [],
      engagements: [],
    });

    const areas = buildProviderOverviewDiscoveryAreas({
      contact: {
        provider_observation_feasibility: "easy",
        provider_procedure_focus: "Hernia",
        provider_observation_coordinator_contact: "",
      },
      commercialStage,
    });

    const observation = areas.find((a) => a.areaId === "observation_readiness");
    expect(observation).toBeDefined();
    expect(observation!.known.length).toBeGreaterThan(0);
    expect(observation!.unknown.some((u) => /scheduling authority contact/i.test(u.label))).toBe(true);

    const clinical = areas.find((a) => a.areaId === "clinical_workflow");
    expect(clinical?.known.some((k) => /hernia/i.test(k.label))).toBe(true);
  });

  it("respects commercial stage visibility", () => {
    const areas = buildProviderOverviewDiscoveryAreas({
      contact: {},
      commercialStage: "early_discovery",
    });

    expect(areas.map((a) => a.areaId)).toContain("observation_readiness");
    expect(areas.map((a) => a.areaId)).toContain("clinical_workflow");
    expect(areas.map((a) => a.areaId)).not.toContain("commercial_signals");
  });
});
