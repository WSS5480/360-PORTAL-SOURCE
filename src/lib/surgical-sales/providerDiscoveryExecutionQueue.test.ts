import { describe, expect, it } from "vitest";
import {
  computeDiscoveryLeverageScore,
  discoveryPriorityInteractionTiming,
} from "./providerDiscoveryExecutionQueue";

describe("providerDiscoveryExecutionQueue", () => {
  it("computes higher leverage for critical urgency and top rank", () => {
    const top = computeDiscoveryLeverageScore({
      priorityScore: 120,
      urgency: "high",
      rank: 0,
    });
    const lower = computeDiscoveryLeverageScore({
      priorityScore: 120,
      urgency: "high",
      rank: 3,
    });
    expect(top.leverageScore).toBeGreaterThan(lower.leverageScore);
    expect(top.leverageTier).toMatch(/Deploy|High/i);
  });

  it("recommends timing before engagement when engagement driver present", () => {
    expect(
      discoveryPriorityInteractionTiming("provider_communication_style", ["engagement_stage"], 2),
    ).toMatch(/before upcoming engagement/i);
  });

  it("uses field-specific ideal timing from gap guidance", () => {
    expect(
      discoveryPriorityInteractionTiming("provider_observation_credentialing_needed", [], 0),
    ).toBe("Before first case day");
  });
});
