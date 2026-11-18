import { describe, expect, it } from "vitest";
import { DEFAULT_EXECUTION_LEADERBOARD_CONFIG } from "@/lib/surgical-sales/executionLeaderboardConfig";
import {
  buildExecutionLeaderboard,
  computeCategoryScore,
  computeLeaderboardScore,
  emptyExecutionLeaderboardCounts,
  hasTextContent,
  isCompletedCaseStatus,
  isDebriefCompleted,
  isScheduledObservationCaseStatus,
  tsInYmdRange,
} from "@/lib/surgical-sales/executionLeaderboardMetrics";

describe("executionLeaderboardMetrics", () => {
  it("computes Sales Execution Score from category totals", () => {
    const counts = emptyExecutionLeaderboardCounts();
    counts.intro_call_completed = 1;
    counts.evaluation_started = 1;
    counts.product_support_case_completed = 1;

    const discovery = computeCategoryScore(counts, "provider_discovery", DEFAULT_EXECUTION_LEADERBOARD_CONFIG);
    expect(discovery).toBe(10);

    const evaluation = computeCategoryScore(counts, "evaluation", DEFAULT_EXECUTION_LEADERBOARD_CONFIG);
    expect(evaluation).toBe(100);

    const support = computeCategoryScore(counts, "product_support_case", DEFAULT_EXECUTION_LEADERBOARD_CONFIG);
    expect(support).toBe(50);

    const score = computeLeaderboardScore(
      {
        provider_discovery: discovery,
        observation_request: 0,
        observation: 0,
        observation_debrief: 0,
        evaluation,
        commitment: 0,
        product_support_case: support,
        outcomes: 0,
      },
      DEFAULT_EXECUTION_LEADERBOARD_CONFIG,
    );
    expect(score).toBe(160);
  });

  it("ranks reps by leaderboard score and assigns self rank", () => {
    const alpha = emptyExecutionLeaderboardCounts();
    alpha.observation_completed = 3;

    const bravo = emptyExecutionLeaderboardCounts();
    bravo.evaluation_started = 2;
    bravo.five_observations_completed = 1;

    const result = buildExecutionLeaderboard({
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      periodLabel: "June 2026",
      internalReps: [
        { user_id: "rep-a", display_name: "Alpha Rep", email: "a@test.com" },
        { user_id: "rep-b", display_name: "Bravo Rep", email: "b@test.com" },
      ],
      countsByRep: new Map([
        ["rep-a", alpha],
        ["rep-b", bravo],
      ]),
      selfUserId: "rep-a",
    });

    expect(result.reps).toHaveLength(2);
    expect(result.reps[0]!.user_id).toBe("rep-b");
    expect(result.reps[0]!.rank).toBe(1);
    expect(result.reps[1]!.rank).toBe(2);
    expect(result.self_rank).toBe(2);
    expect(result.reps[0]!.leaderboard_score).toBeGreaterThan(result.reps[1]!.leaderboard_score);
  });

  it("supports helper predicates for case and engagement scoring", () => {
    expect(hasTextContent("  hello ")).toBe(true);
    expect(isCompletedCaseStatus("completed")).toBe(true);
    expect(isScheduledObservationCaseStatus("scheduled")).toBe(true);
    expect(isDebriefCompleted({ debrief_completed: true })).toBe(true);
    expect(tsInYmdRange("2026-06-15T12:00:00Z", "2026-06-01", "2026-06-30")).toBe(true);
  });
});
