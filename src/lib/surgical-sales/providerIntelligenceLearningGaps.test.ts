import { describe, expect, it } from "vitest";
import {
  buildIntelligenceLearningGaps,
  formatLearningGapsSummary,
  INTELLIGENCE_GAP_STATE_LABELS,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";

describe("providerIntelligenceLearningGaps", () => {
  it("exposes concise state labels for key fields", () => {
    expect(INTELLIGENCE_GAP_STATE_LABELS.provider_observation_access_path?.unknown).toBe(
      "OR access path still forming",
    );
    expect(INTELLIGENCE_GAP_STATE_LABELS.provider_current_vendors?.unknown).toBe(
      "Vendors in active cases not confirmed",
    );
    expect(INTELLIGENCE_GAP_STATE_LABELS.provider_communication_style?.unknown).toBe(
      "Engagement and update style not validated",
    );
    expect(INTELLIGENCE_GAP_STATE_LABELS.influence_level?.partial).toMatch(/supply|influence/i);
  });

  it("returns no gaps on an empty discovery profile", () => {
    const gaps = buildIntelligenceLearningGaps({}, undefined, 24, { stageId: "discovery" });
    expect(gaps).toEqual([]);
  });

  it("summarizes top gaps without counters", () => {
    const gaps = buildIntelligenceLearningGaps({
      provider_observation_coordinator_contact: "Jennifer — contact info missing",
      provider_observation_feasibility: "yes",
    });
    const summary = formatLearningGapsSummary(gaps, 2);
    expect(summary).not.toMatch(/\d+\s*\/\s*\d+/);
    expect(summary.length).toBeGreaterThan(8);
  });
});
