import { describe, expect, it } from "vitest";
import {
  buildProviderOverviewPathwayRequirements,
  providerOverviewRequirementsMetCount,
  sortProviderOverviewRequirements,
} from "./buildProviderOverviewPathwayRequirements";

describe("buildProviderOverviewPathwayRequirements", () => {
  it("maps discovery requirements to operational statuses", () => {
    const items = buildProviderOverviewPathwayRequirements({
      contact: { provider_relationship_stage: "prospect" },
      engagements: [],
    });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((r) => r.statusLabel.length > 0)).toBe(true);
    expect(providerOverviewRequirementsMetCount(items)).toBe(0);
  });

  it("sorts blocked and unknown before validated", () => {
    const sorted = sortProviderOverviewRequirements([
      {
        id: "a",
        label: "Validated item",
        status: "validated",
        statusLabel: "Validated",
        contextLine: null,
        whyItMatters: "",
        knownEvidence: null,
        stillNeeded: null,
        sourceEngagement: null,
        lastUpdated: null,
        met: true,
      },
      {
        id: "b",
        label: "Unknown item",
        status: "unknown",
        statusLabel: "Unknown",
        contextLine: null,
        whyItMatters: "",
        knownEvidence: null,
        stillNeeded: null,
        sourceEngagement: null,
        lastUpdated: null,
        met: false,
      },
    ]);
    expect(sorted[0]?.status).toBe("unknown");
    expect(sorted[1]?.status).toBe("validated");
  });
});
