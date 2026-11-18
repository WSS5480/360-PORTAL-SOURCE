import { describe, expect, it } from "vitest";
import {
  buildLeaderboardCompetitiveContext,
  buildLeaderboardInsightStrip,
} from "@/lib/surgical-sales/leaderboardCompetitiveContext";
import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import type { LeaderboardPortalRepRow } from "@/lib/surgical-sales/leaderboardPortalTypes";

function entry(rank: number, userId: string, score: number): LeaderboardBoardEntry {
  return {
    rank,
    user_id: userId,
    display_name: `Rep ${rank}`,
    score,
    key_stat: "",
    trend: 0,
    trend_label: "—",
    badge_label: null,
    prior_rank: null,
    rank_delta: null,
  };
}

function repRow(userId: string, points: number): LeaderboardPortalRepRow {
  return {
    rank: 0,
    user_id: userId,
    name: userId,
    leaderboard_score: points,
    category_scores: {},
    metrics: {} as LeaderboardPortalRepRow["metrics"],
    best_category: "",
    achievement_badges: [],
    pathway_score: { total_points: points, stats: { observations: 0, evaluations: 0, commitments: 0 } },
    pathway_badges: [],
  };
}

describe("buildLeaderboardCompetitiveContext", () => {
  it("formats rank, score, and points needed to pass the next rep", () => {
    const entries = [
      entry(1, "a", 2000),
      entry(8, "above", 1630),
      entry(9, "self", 1290),
      entry(10, "j", 1100),
    ];
    const repById = new Map([
      ["a", repRow("a", 2000)],
      ["above", repRow("above", 1630)],
      ["self", repRow("self", 1290)],
      ["j", repRow("j", 1100)],
    ]);

    const ctx = buildLeaderboardCompetitiveContext({
      selfRank: 9,
      totalReps: 10,
      selfUserId: "self",
      entries,
      repById,
    });

    expect(ctx.rankDisplay).toBe("#9 of 10");
    expect(ctx.scoreDisplay).toBe("Score 1,290");
    expect(ctx.advanceDisplay).toBe("Need 340 points to pass #8");
    expect(ctx.pointsNeeded).toBe(340);
    expect(ctx.targetRank).toBe(8);
    expect(ctx.targetRepName).toBe("Rep 8");
  });

  it("celebrates first place", () => {
    const ctx = buildLeaderboardCompetitiveContext({
      selfRank: 1,
      totalReps: 10,
      selfUserId: "self",
      entries: [entry(1, "self", 2000)],
      repById: new Map([["self", repRow("self", 2000)]]),
    });
    expect(ctx.status).toBe("leader");
    expect(ctx.advanceDisplay).toContain("first");
  });

  it("builds actionable insight strip with target rep name", () => {
    const entries = [entry(8, "above", 1630), entry(9, "self", 1290)];
    const repById = new Map([
      ["above", repRow("above", 1630)],
      ["self", repRow("self", 1290)],
    ]);
    const ctx = buildLeaderboardCompetitiveContext({
      selfRank: 9,
      totalReps: 10,
      selfUserId: "self",
      entries,
      repById,
    });
    const insight = buildLeaderboardInsightStrip({ context: ctx });
    expect(insight?.message).toBe("Next rank target: Rep 8 (+340)");
  });
});
