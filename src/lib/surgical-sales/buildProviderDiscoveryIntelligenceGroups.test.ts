import { describe, expect, it } from "vitest";
import { buildProviderDiscoveryIntelligenceGroups } from "./buildProviderDiscoveryIntelligenceGroups";
import { resolveDiscoveryAdvancementSignal } from "./buildProviderDiscoveryStageProgression";

describe("buildProviderDiscoveryIntelligenceGroups", () => {
  it("returns four discovery intelligence groups with consolidated access signals", () => {
    const contact = { provider_relationship_stage: "prospect" };
    const groups = buildProviderDiscoveryIntelligenceGroups({
      contact,
      advancement: resolveDiscoveryAdvancementSignal({ contact, phase: "access_mapping" }),
    });

    expect(groups.map((g) => g.id)).toEqual([
      "access_readiness",
      "clinical_fit",
      "champion_landscape",
    ]);

    const access = groups.find((g) => g.id === "access_readiness")!;
    expect(access.purpose).toBe("Permission, pathway, and logistics.");
    expect(access.signals.map((s) => s.id)).toEqual([
      "observation_approval_status",
      "scheduling_owner",
      "facility_vendor_pathway",
      "observation_logistics",
    ]);
    expect(access.signals.some((s) => s.label.match(/Facility access pathway mapped/i))).toBe(false);
    expect(access.signals.some((s) => s.label.match(/Vendor approval path/i))).toBe(false);
  });

  it("does not include a full open questions group on overview", () => {
    const groups = buildProviderDiscoveryIntelligenceGroups({
      contact: { provider_relationship_stage: "prospect" },
      advancement: resolveDiscoveryAdvancementSignal({
        contact: { provider_relationship_stage: "prospect" },
        phase: "access_mapping",
      }),
    });
    expect(groups.some((g) => g.id === "open_questions")).toBe(false);
  });
});
