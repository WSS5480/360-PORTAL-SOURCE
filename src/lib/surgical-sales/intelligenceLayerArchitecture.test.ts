import { describe, expect, it } from "vitest";

import {
  engagementStrategyKeysInProviderPlanningPatch,
  filterContactToPersistentIntelligenceLayer,
  filterContactToProviderIntelligenceScope,
  intelligenceLayerForDbKey,
  splitProviderPlanningPatchByLayer,
  splitProviderPlanningPatchByScope,
} from "@/lib/surgical-sales/intelligenceLayerArchitecture";

describe("intelligenceLayerArchitecture", () => {
  it("classifies persistent provider fields", () => {
    expect(intelligenceLayerForDbKey("provider_procedure_focus")).toBe("persistent_provider");
    expect(intelligenceLayerForDbKey("provider_observation_feasibility")).toBe("persistent_provider");
    expect(intelligenceLayerForDbKey("influence_level")).toBe("persistent_provider");
  });

  it("classifies organization fields as persistent (not engagement)", () => {
    expect(intelligenceLayerForDbKey("provider_credentialing_status")).toBe("persistent_provider");
    expect(intelligenceLayerForDbKey("provider_observation_access_path")).toBe("persistent_provider");
  });

  it("classifies engagement preparation strategy fields", () => {
    expect(intelligenceLayerForDbKey("observation_goal")).toBe("engagement_specific");
    expect(intelligenceLayerForDbKey("pre_observation_probes")).toBe("engagement_specific");
    expect(intelligenceLayerForDbKey("provider_pre_observation_probes")).toBe("engagement_specific");
    expect(intelligenceLayerForDbKey("provider_strategic_goal")).toBe("engagement_specific");
  });

  it("strips engagement keys from provider planning patches", () => {
    const { persistent, rejected } = splitProviderPlanningPatchByLayer({
      provider_procedure_focus: "TKA",
      observation_goal: "Validate workflow",
      provider_pre_observation_probes: "Ask about tray preference",
      provider_observation_feasibility: "allowed",
      provider_strategic_goal: "Land preference card this quarter",
      provider_credentialing_status: "Vendor clearance via materials",
    });

    expect(persistent).toEqual({
      provider_procedure_focus: "TKA",
      provider_observation_feasibility: "allowed",
      provider_credentialing_status: "Vendor clearance via materials",
    });
    expect(rejected.map((r) => r.key).sort()).toEqual([
      "observation_goal",
      "provider_pre_observation_probes",
      "provider_strategic_goal",
    ]);
  });

  it("splits persistent patches into organization vs provider scope", () => {
    const { organization, provider } = splitProviderPlanningPatchByScope({
      provider_procedure_focus: "TKA",
      provider_credentialing_status: "Cleared",
      provider_observation_feasibility: "allowed",
    });
    expect(organization).toEqual({ provider_credentialing_status: "Cleared" });
    expect(provider).toEqual({
      provider_procedure_focus: "TKA",
      provider_observation_feasibility: "allowed",
    });
  });

  it("detects engagement strategy keys for API hard reject", () => {
    const rejected = engagementStrategyKeysInProviderPlanningPatch({
      provider_technique_preferences: "robotic",
      pre_observation_value_hypothesis: "Dock time matters",
    });
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.key).toBe("pre_observation_value_hypothesis");
  });

  it("filters legacy engagement mirror columns out of provider intelligence contact", () => {
    const filtered = filterContactToPersistentIntelligenceLayer({
      provider_procedure_focus: "hernia",
      provider_pre_observation_probes: "Should not affect PI",
      provider_strategic_goal: "Q3 land card",
      influence_level: "high",
    });
    expect(filtered.provider_procedure_focus).toBe("hernia");
    expect(filtered.influence_level).toBe("high");
    expect(filtered).not.toHaveProperty("provider_pre_observation_probes");
    expect(filtered).not.toHaveProperty("provider_strategic_goal");
  });

  it("filters organization-scoped keys from provider-only intelligence view", () => {
    const filtered = filterContactToProviderIntelligenceScope({
      provider_procedure_focus: "hernia",
      provider_credentialing_status: "Facility rule",
      provider_observation_feasibility: "allowed",
    });
    expect(filtered.provider_procedure_focus).toBe("hernia");
    expect(filtered.provider_observation_feasibility).toBe("allowed");
    expect(filtered).not.toHaveProperty("provider_credentialing_status");
  });
});
