import { describe, expect, it } from "vitest";
import {
  allScoredMetricsHaveAuditRecords,
  LEADERBOARD_PATHWAY_METRIC_AUDIT,
} from "@/lib/surgical-sales/leaderboardPathwayAudit";
import { ALL_PATHWAY_LEADERBOARD_METRICS } from "@/lib/surgical-sales/executionLeaderboardConfig";

describe("leaderboardPathwayAudit", () => {
  it("documents every scored pathway metric", () => {
    expect(allScoredMetricsHaveAuditRecords()).toBe(true);
    expect(LEADERBOARD_PATHWAY_METRIC_AUDIT).toHaveLength(ALL_PATHWAY_LEADERBOARD_METRICS.length);
  });

  it("requires a pathway question for each metric", () => {
    for (const row of LEADERBOARD_PATHWAY_METRIC_AUDIT) {
      expect(row.pathwayQuestion.length).toBeGreaterThan(20);
      expect(row.rationale.length).toBeGreaterThan(20);
    }
  });
});
