import { describe, expect, it } from "vitest";
import {
  discoverySignalFieldFocusLine,
  discoverySignalOperationalNarrative,
} from "./discoveryIntelligenceNarrative";
import { DISCOVERY_FIELD_STATUS } from "./discoveryIntelligenceSignalStatus";

const F = DISCOVERY_FIELD_STATUS;

describe("discoveryIntelligenceNarrative", () => {
  it("uses operational language for unknown signals", () => {
    expect(discoverySignalOperationalNarrative("observation_approval", F.unknown)).toBe(
      "No confirmed provider approval pathway documented yet.",
    );
    expect(discoverySignalOperationalNarrative("scheduling_owner", F.unknown)).toBe(
      "No operational scheduling contact identified.",
    );
    expect(discoverySignalOperationalNarrative("facility_vendor_pathway", F.unknown)).toBe(
      "Vendor access requirements remain unclear.",
    );
  });

  it("provides shorter field-focus lines for priority lists", () => {
    expect(discoverySignalFieldFocusLine("facility_vendor_pathway", F.unknown)).toBe(
      "Vendor pathway still being learned.",
    );
    expect(discoverySignalFieldFocusLine("scheduling_owner", F.captured)).toBe(
      "Scheduler referenced — details still open.",
    );
  });
});
