import { describe, expect, it } from "vitest";
import { emptyExecutionLeaderboardCounts } from "@/lib/surgical-sales/executionLeaderboardMetrics";
import { computeRepAchievementBadges } from "@/lib/surgical-sales/executionAchievementBadges";

describe("executionAchievementBadges", () => {
  it("delegates pathway milestone badges and adds rising star when score jumps", () => {
    const counts = emptyExecutionLeaderboardCounts();
    counts.five_observations_completed = 1;
    counts.debrief_completed = 3;
    counts.evaluation_started = 1;
    counts.product_support_case_completed = 4;

    const badges = computeRepAchievementBadges({
      counts,
      currentLeaderboardScore: 500,
      priorLeaderboardScore: 400,
    });

    const ids = badges.map((b) => b.id);
    expect(ids).toContain("field_investigator");
    expect(ids).toContain("debrief_driver");
    expect(ids).toContain("evaluation_leader");
    expect(ids).toContain("case_commander");
    expect(ids).toContain("rising_star");
  });

  it("does not add rising star when score is flat", () => {
    const counts = emptyExecutionLeaderboardCounts();
    counts.observation_completed = 1;

    const badges = computeRepAchievementBadges({ counts, currentLeaderboardScore: 50, priorLeaderboardScore: 50 });
    expect(badges.some((b) => b.id === "rising_star")).toBe(false);
  });
});
