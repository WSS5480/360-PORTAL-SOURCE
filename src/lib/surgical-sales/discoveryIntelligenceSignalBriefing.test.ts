import { describe, expect, it } from "vitest";
import type { DiscoveryIntelligenceSignalRow } from "./buildDiscoveryIntelligenceGroupsView";
import {
  discoverySignalOperationalNote,
  discoverySignalValidationHistory,
} from "./discoveryIntelligenceSignalBriefing";

const baseRow: DiscoveryIntelligenceSignalRow = {
  id: "scheduling_owner",
  signalId: "scheduling_owner",
  priority: 1,
  label: "Scheduling owner",
  statusLabel: "Captured",
  confidenceLabel: "Owner named",
  lastUpdatedLabel: "—",
  primaryDbKey: "provider_observation_coordinator_contact",
  dbKeys: ["provider_observation_coordinator_contact"],
  sectionId: "observation_readiness",
  primaryActions: [],
  overflowActions: [],
  supportsContactAssignment: true,
};

describe("discoveryIntelligenceSignalBriefing", () => {
  it("surfaces scheduling contact as operational note", () => {
    expect(
      discoverySignalOperationalNote(
        { provider_scheduling_contact: "Karen — provider office scheduler (partial lead)" },
        baseRow,
      ),
    ).toMatch(/Karen/);
    expect(
      discoverySignalOperationalNote(
        { provider_observation_coordinator_contact: "Jane — OR desk" },
        baseRow,
      ),
    ).toBe("Jane — OR desk");
  });

  it("returns null validation history when nothing captured", () => {
    expect(discoverySignalValidationHistory({}, baseRow)).toBeNull();
  });
});
