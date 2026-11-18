import { describe, expect, it } from "vitest";
import { buildProviderOverviewPriorityUnknowns } from "./buildProviderOverviewPriorityUnknowns";

describe("buildProviderOverviewPriorityUnknowns", () => {
  it("returns at most two priority questions for discovery prospect", () => {
    const items = buildProviderOverviewPriorityUnknowns({
      contact: { provider_relationship_stage: "prospect" },
    });
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(2);
    expect(items[0]?.question.length).toBeGreaterThan(10);
  });

  it("excludes admin scheduling questions from priority unknowns", () => {
    const items = buildProviderOverviewPriorityUnknowns({
      contact: {
        provider_observation_feasibility: "approved",
        provider_relationship_stage: "prospect",
      },
    });
    expect(items.some((q) => /scheduling/i.test(q.question))).toBe(false);
    expect(items.some((q) => q.id === "scheduling_owner")).toBe(false);
  });
});
