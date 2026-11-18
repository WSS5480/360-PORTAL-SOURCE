import { describe, expect, it } from "vitest";
import {
  formatDiscoveryOperationalPillLabel,
  discoveryOperationalPillSlug,
  mapDiscoveryIntelligenceRowToWorkflowRow,
} from "./providerOverviewDiscoveryWorkflowPresentation";

describe("providerOverviewDiscoveryWorkflowPresentation", () => {
  it("maps observation approval unknown to Pending pill", () => {
    expect(formatDiscoveryOperationalPillLabel("observation_approval", "Unknown")).toBe("Pending");
    expect(discoveryOperationalPillSlug("observation_approval", "Unknown")).toBe("pending");
  });

  it("maps pathway partial status to Partially known", () => {
    expect(
      formatDiscoveryOperationalPillLabel("facility_vendor_pathway", "Partially understood"),
    ).toBe("Partially known");
    expect(
      discoveryOperationalPillSlug("facility_vendor_pathway", "Partially understood"),
    ).toBe("partially_known");
  });

  it("builds workflow row with compact label and pill", () => {
    const row = mapDiscoveryIntelligenceRowToWorkflowRow({
      id: "scheduling_owner",
      signalId: "scheduling_owner",
      label: "Scheduling owner",
      statusLabel: "Identified",
      confidenceLabel: "Captured — needs validation",
      lastUpdatedLabel: "—",
      primaryDbKey: "provider_observation_coordinator_contact",
      sectionId: "observation_readiness",
      actions: ["validate"],
      supportsContactAssignment: true,
    });
    expect(row?.label).toBe("Scheduling owner");
    expect(row?.statusLabel).toBe("Identified");
    expect(row?.pillSlug).toBe("identified");
  });
});
