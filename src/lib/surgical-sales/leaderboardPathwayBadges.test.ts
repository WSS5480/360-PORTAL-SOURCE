import { describe, expect, it } from "vitest";
import { emptyExecutionLeaderboardCounts } from "@/lib/surgical-sales/executionLeaderboardMetrics";
import {
  computePathwayAchievementBadges,
  nearestPathwayBadgeProgress,
  PATHWAY_ACHIEVEMENT_CATALOG,
} from "@/lib/surgical-sales/leaderboardPathwayBadges";

describe("leaderboardPathwayBadges", () => {
  it("defines four pathway milestone badges", () => {
    expect(PATHWAY_ACHIEVEMENT_CATALOG).toHaveLength(4);
    expect(PATHWAY_ACHIEVEMENT_CATALOG.map((b) => b.id)).toEqual([
      "field_investigator",
      "debrief_driver",
      "evaluation_leader",
      "case_commander",
    ]);
  });

  it("awards milestone badges from pathway metrics", () => {
    const counts = emptyExecutionLeaderboardCounts();
    counts.five_observations_completed = 1;
    counts.debrief_completed = 3;
    counts.evaluation_started = 1;
    counts.product_support_case_completed = 4;

    const ids = computePathwayAchievementBadges(counts).map((b) => b.id);
    expect(ids).toContain("field_investigator");
    expect(ids).toContain("debrief_driver");
    expect(ids).toContain("evaluation_leader");
    expect(ids).toContain("case_commander");
  });

  it("does not award debrief driver below the debrief threshold", () => {
    const counts = emptyExecutionLeaderboardCounts();
    counts.debrief_completed = 1;
    const ids = computePathwayAchievementBadges(counts).map((b) => b.id);
    expect(ids).not.toContain("debrief_driver");
  });

  it("surfaces nearest badge progress for engagement", () => {
    const counts = emptyExecutionLeaderboardCounts();
    counts.five_observations_completed = 0;
    counts.observation_completed = 3;
    const next = nearestPathwayBadgeProgress(counts);
    expect(next?.id).toBe("field_investigator");
    expect(next?.current).toBe(0);
    expect(next?.target).toBe(1);
  });
});
