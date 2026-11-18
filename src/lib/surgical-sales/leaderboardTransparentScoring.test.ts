import { describe, expect, it } from "vitest";
import { DEFAULT_EXECUTION_LEADERBOARD_CONFIG } from "@/lib/surgical-sales/executionLeaderboardConfig";
import { emptyExecutionLeaderboardCounts } from "@/lib/surgical-sales/executionLeaderboardMetrics";
import {
  buildPathwayScoringGuide,
  buildRecentPointActivity,
  buildRecentScoringEvents,
  computePathwayRepScore,
  computePathwayTotalPoints,
  computePersonalScoreBreakdown,
  computeScorecardActivityRows,
  PATHWAY_SCORING_ACTIVITIES,
} from "@/lib/surgical-sales/leaderboardTransparentScoring";

describe("leaderboardTransparentScoring", () => {
  it("maps nine pathway progression milestones", () => {
    expect(PATHWAY_SCORING_ACTIVITIES).toHaveLength(9);
    const guide = buildPathwayScoringGuide(DEFAULT_EXECUTION_LEADERBOARD_CONFIG);
    expect(guide.find((row) => row.id === "evaluation_started")?.points).toBe(100);
    expect(guide.find((row) => row.id === "observation_completed")?.pointsDisplay).toBe("+50");
    expect(guide.find((row) => row.id === "five_observations_completed")?.points).toBe(75);
  });

  it("computes Sales Execution Score from metric counts", () => {
    const counts = emptyExecutionLeaderboardCounts();
    counts.observation_completed = 2;
    counts.debrief_completed = 1;
    counts.evaluation_started = 1;
    counts.five_observations_completed = 1;

    const score = computePathwayRepScore(counts, DEFAULT_EXECUTION_LEADERBOARD_CONFIG);
    expect(score.stats.observations).toBe(2);
    expect(score.stats.evaluations).toBe(1);
    expect(score.stats.commitments).toBe(0);
    expect(computePathwayTotalPoints(counts, DEFAULT_EXECUTION_LEADERBOARD_CONFIG)).toBe(
      2 * 50 + 30 + 100 + 75,
    );
  });

  it("computes personal score breakdown by activity", () => {
    const counts = emptyExecutionLeaderboardCounts();
    counts.observation_completed = 1;
    counts.five_observations_completed = 1;
    counts.evaluation_started = 1;

    const breakdown = computePersonalScoreBreakdown(counts, DEFAULT_EXECUTION_LEADERBOARD_CONFIG);
    expect(breakdown.totalPoints).toBe(50 + 75 + 100);
    expect(breakdown.categories.find((row) => row.id === "observation_completed")?.points).toBe(50);
    expect(breakdown.categories.find((row) => row.id === "evaluation_started")?.label).toBe(
      "Evaluation Started",
    );
  });

  it("builds recent point activity sorted by contribution", () => {
    const counts = emptyExecutionLeaderboardCounts();
    counts.observation_completed = 1;
    counts.evaluation_started = 1;
    counts.five_observations_completed = 1;

    const activity = buildRecentPointActivity(counts, DEFAULT_EXECUTION_LEADERBOARD_CONFIG);
    expect(activity[0]?.pointsDisplay).toBe("+100");
    expect(activity.some((item) => item.label === "Observation Completed")).toBe(true);
  });

  it("lists all nine scorecard activity rows including zero-point activities", () => {
    const counts = emptyExecutionLeaderboardCounts();
    counts.observation_completed = 1;

    const rows = computeScorecardActivityRows(counts, DEFAULT_EXECUTION_LEADERBOARD_CONFIG);
    expect(rows).toHaveLength(9);
    expect(rows.find((row) => row.id === "observation_completed")?.pointsEarned).toBe(50);
    expect(rows.find((row) => row.id === "intro_call_completed")?.pointsEarned).toBe(0);
  });

  it("builds per-event recent scoring lines", () => {
    const counts = emptyExecutionLeaderboardCounts();
    counts.observation_completed = 1;
    counts.evaluation_started = 1;

    const events = buildRecentScoringEvents(counts, DEFAULT_EXECUTION_LEADERBOARD_CONFIG);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pointsDisplay: "+50", label: "Observation Completed" }),
        expect.objectContaining({ pointsDisplay: "+100", label: "Evaluation Started" }),
      ]),
    );
  });

  it("exposes pathway stats for the rank table", () => {
    const counts = emptyExecutionLeaderboardCounts();
    counts.observation_completed = 1;
    counts.evaluation_started = 1;
    counts.commitment_secured = 1;

    const score = computePathwayRepScore(counts, DEFAULT_EXECUTION_LEADERBOARD_CONFIG);
    expect(score.stats.observations).toBe(1);
    expect(score.stats.evaluations).toBe(1);
    expect(score.stats.commitments).toBe(1);
    expect(score.total_points).toBe(50 + 100 + 100);
  });
});
