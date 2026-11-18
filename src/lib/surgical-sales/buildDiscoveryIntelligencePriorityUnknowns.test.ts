import { describe, expect, it } from "vitest";
import { buildDiscoveryIntelligencePriorityUnknowns } from "./buildDiscoveryIntelligencePriorityUnknowns";

describe("buildDiscoveryIntelligencePriorityUnknowns", () => {
  it("returns up to three gate-first uncertainty summaries", () => {
    const items = buildDiscoveryIntelligencePriorityUnknowns({
      contact: { provider_relationship_stage: "prospect" },
    });

    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(3);
    expect(items[0]?.summary).toBe("No confirmed observation approval pathway yet.");
    expect(items[1]?.summary).toBe("No operational scheduling contact identified.");
    expect(items[2]?.summary).toBe("Vendor access requirements remain unclear.");
  });

  it("skips validated topics and uses uncertainty phrasing", () => {
    const items = buildDiscoveryIntelligencePriorityUnknowns({
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Manual",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
        provider_observation_coordinator_contact: "Jane — OR desk",
      },
    });

    expect(items.map((i) => i.summary)).not.toContain("Observation approval status");
    expect(
      items.some((i) => i.summary === "Scheduling contact needs confirmation on file."),
    ).toBe(true);
  });
});
