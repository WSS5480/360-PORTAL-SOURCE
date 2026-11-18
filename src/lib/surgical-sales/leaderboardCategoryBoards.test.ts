import { describe, expect, it } from "vitest";
import { DEFAULT_EXECUTION_LEADERBOARD_CONFIG } from "@/lib/surgical-sales/executionLeaderboardConfig";
import {
  buildExecutionLeaderboard,
  emptyExecutionLeaderboardCounts,
} from "@/lib/surgical-sales/executionLeaderboardMetrics";
import { buildLeaderboardCategoryBoards } from "@/lib/surgical-sales/leaderboardCategoryBoards";

describe("leaderboardCategoryBoards", () => {
  it("builds the single Sales Execution board from rep metrics", () => {
    const alpha = emptyExecutionLeaderboardCounts();
    alpha.observation_completed = 2;
    alpha.five_observations_completed = 1;
    alpha.evaluation_started = 1;
    alpha.debrief_completed = 3;

    const bravo = emptyExecutionLeaderboardCounts();
    bravo.intro_call_completed = 8;
    bravo.evaluation_started = 3;
    bravo.product_support_case_completed = 3;

    const priorAlpha = emptyExecutionLeaderboardCounts();
    priorAlpha.debrief_completed = 1;

    const priorBravo = emptyExecutionLeaderboardCounts();
    priorBravo.intro_call_completed = 8;

    const base = buildExecutionLeaderboard({
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
    });

    const { boards } = buildLeaderboardCategoryBoards({
      reps: base.reps,
      priorCountsByRep: new Map([
        ["rep-a", priorAlpha],
        ["rep-b", priorBravo],
      ]),
      config: DEFAULT_EXECUTION_LEADERBOARD_CONFIG,
      priorPeriodLabel: "May 2026",
    });

    expect(boards).toHaveLength(1);
    expect(boards[0]?.id).toBe("field_commander");
    expect(boards[0]?.entries[0]?.user_id).toBe("rep-b");

    const alphaCurrent = base.reps.find((r) => r.user_id === "rep-a")!.leaderboard_score;
    expect(boards[0]?.entries.some((e) => e.score === alphaCurrent)).toBe(true);
  });
});
