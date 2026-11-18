import { describe, expect, it } from "vitest";
import {
  buildDiscoverySupportContactPlanningPatch,
  discoveryIntelligenceSignalSupportsContact,
  discoverySupportContactPrimaryDbKey,
  defaultSupportContactRoleForDiscoverySignal,
} from "./discoveryIntelligenceSupportContact";

describe("discoveryIntelligenceSupportContact", () => {
  it("enables contact assignment on four discovery rows", () => {
    expect(discoveryIntelligenceSignalSupportsContact("scheduling_owner")).toBe(true);
    expect(discoveryIntelligenceSignalSupportsContact("clinical_champion")).toBe(true);
    expect(discoveryIntelligenceSignalSupportsContact("workflow_visibility")).toBe(false);
  });

  it("maps signals to primary db keys", () => {
    expect(discoverySupportContactPrimaryDbKey("scheduling_owner")).toBe(
      "provider_observation_coordinator_contact",
    );
    expect(discoverySupportContactPrimaryDbKey("clinical_champion")).toBe(
      "provider_champion_potential",
    );
  });

  it("builds planning patch for champion and pathway rows", () => {
    expect(
      buildDiscoverySupportContactPlanningPatch({
        signalId: "clinical_champion",
        intelligenceValue: "Dr. Lee (Clinical Champion)",
      }),
    ).toEqual({ provider_champion_potential: "high" });

    expect(
      buildDiscoverySupportContactPlanningPatch({
        signalId: "facility_vendor_pathway",
        intelligenceValue: "Pat (Vendor Access Contact)",
      }),
    ).toEqual({ provider_observation_access_path: "Pat (Vendor Access Contact)" });
  });

  it("defaults roles per discovery row", () => {
    expect(defaultSupportContactRoleForDiscoverySignal("facility_vendor_pathway")).toBe(
      "vendor_access_contact",
    );
    expect(defaultSupportContactRoleForDiscoverySignal("clinical_champion")).toBe(
      "clinical_champion",
    );
  });
});
