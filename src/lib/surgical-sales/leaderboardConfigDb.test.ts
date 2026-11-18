import { describe, expect, it } from "vitest";
import { DEFAULT_EXECUTION_LEADERBOARD_CONFIG, mergeExecutionLeaderboardConfig } from "@/lib/surgical-sales/executionLeaderboardConfig";
import {
  computeCategoryScore,
  emptyExecutionLeaderboardCounts,
} from "@/lib/surgical-sales/executionLeaderboardMetrics";
import { validateLeaderboardConfigUpdate } from "@/lib/surgical-sales/leaderboardConfigDb";
import { buildPathwayScoringGuide } from "@/lib/surgical-sales/leaderboardTransparentScoring";

describe("leaderboard admin config", () => {
  it("ignores disabled metrics when computing category score", () => {
    const counts = emptyExecutionLeaderboardCounts();
    counts.intro_call_completed = 2;
    counts.evaluation_started = 1;

    const config = mergeExecutionLeaderboardConfig({
      enabledMetrics: ["evaluation_started"],
      metricPoints: DEFAULT_EXECUTION_LEADERBOARD_CONFIG.metricPoints,
    });

    expect(computeCategoryScore(counts, "provider_discovery", config)).toBe(0);
    expect(computeCategoryScore(counts, "evaluation", config)).toBe(100);
  });

  it("builds scoring guide from enabled metrics only", () => {
    const config = mergeExecutionLeaderboardConfig({
      enabledMetrics: ["intro_call_completed", "debrief_completed"],
    });
    const guide = buildPathwayScoringGuide(config);
    expect(guide.map((row) => row.id)).toEqual(["intro_call_completed", "debrief_completed"]);
  });

  it("validates admin update payloads", () => {
    const valid = validateLeaderboardConfigUpdate({
      enabledMetrics: ["intro_call_completed"],
      metricPoints: { intro_call_completed: 12 },
    });
    expect(valid.ok).toBe(true);

    const invalid = validateLeaderboardConfigUpdate({
      enabledMetrics: ["not_a_metric"],
      metricPoints: {},
    });
    expect(invalid.ok).toBe(false);
  });
});
