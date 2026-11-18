import { describe, expect, it } from "vitest";
import { buildDiscoveryIntelligenceRowActions } from "./discoveryIntelligenceRowActions";
import { DISCOVERY_FIELD_STATUS } from "./discoveryIntelligenceSignalStatus";

const F = DISCOVERY_FIELD_STATUS;

describe("buildDiscoveryIntelligenceRowActions", () => {
  it("routes observation approval to status update capture", () => {
    const { primary } = buildDiscoveryIntelligenceRowActions({
      signalId: "observation_approval",
      statusLabel: F.unknown,
    });
    expect(primary.map((a) => a.label)).toEqual(["Update observation status"]);
    expect(primary.some((a) => a.apiAction === "mark_observation_approved")).toBe(false);
  });

  it("uses the same status update action when already interested", () => {
    const { primary } = buildDiscoveryIntelligenceRowActions({
      signalId: "observation_approval",
      statusLabel: F.captured,
    });
    expect(primary[0]?.label).toBe("Update observation status");
    expect(primary[0]?.kind).toBe("capture_field");
  });

  it("shows name and add owner for scheduling owner", () => {
    const { primary, overflow } = buildDiscoveryIntelligenceRowActions({
      signalId: "scheduling_owner",
      statusLabel: F.unknown,
    });
    expect(primary.map((a) => a.label)).toEqual(["Name owner", "Add owner"]);
    expect(overflow).toHaveLength(0);
  });

  it("maps facility pathway actions", () => {
    const { primary } = buildDiscoveryIntelligenceRowActions({
      signalId: "facility_vendor_pathway",
      statusLabel: F.unknown,
    });
    expect(primary.map((a) => a.label)).toEqual([
      "Capture partial path",
      "Confirm pathway",
      "Add detail",
    ]);
  });

  it("limits workflow visibility to three inline actions", () => {
    const { primary, overflow } = buildDiscoveryIntelligenceRowActions({
      signalId: "workflow_visibility",
      statusLabel: F.unknown,
    });
    expect(primary.map((a) => a.label)).toEqual([
      "Record observation",
      "Note partial workflow",
      "Confirm workflow",
    ]);
    expect(overflow).toHaveLength(0);
  });

  it("shows champion actions", () => {
    const champion = buildDiscoveryIntelligenceRowActions({
      signalId: "clinical_champion",
      statusLabel: F.unknown,
    });
    expect(champion.primary.map((a) => a.label)).toEqual([
      "Add champion",
      "Note champion lead",
      "Confirm champion",
    ]);
  });
});
