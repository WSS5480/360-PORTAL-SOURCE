import { describe, expect, it } from "vitest";
import { buildLeaderboardMockResponse } from "@/lib/surgical-sales/leaderboardMockData";
import { buildLeaderboardRecentWins, repDetailFromBoardEntry } from "@/lib/surgical-sales/leaderboardRepDetail";

describe("leaderboard portal data", () => {
  it("builds demo payload with boards and rep rows", () => {
    const data = buildLeaderboardMockResponse();
    expect(data.ok).toBe(true);
    expect(data.demo).toBe(true);
    expect(data.boards?.length).toBe(1);
    expect(data.rows?.length).toBeGreaterThan(0);
    expect(data.rows?.[0]?.metrics).toBeDefined();
    expect(data.rows?.[0]?.pathway_score.total_points).toBeGreaterThan(0);
    expect(data.scoring_guide?.length).toBe(9);
  });

  it("derives rep detail drawer content from board entry + row metrics", () => {
    const data = buildLeaderboardMockResponse();
    const board = data.boards!.find((b) => b.id === "field_commander")!;
    const entry = board.entries[0]!;
    const row = data.rows!.find((r) => r.user_id === entry.user_id)!;
    const detail = repDetailFromBoardEntry({ entry, repRow: row, boardTitle: board.title });

    expect(detail.displayName).toBe(entry.display_name);
    expect(detail.personalBreakdown.categories.length).toBeGreaterThan(0);
    expect(detail.recentPointActivity.length).toBeGreaterThan(0);
    expect(detail.recentPointActivity[0]?.pointsDisplay.startsWith("+")).toBe(true);
    expect(detail.scoreBreakdown).toHaveLength(6);
    expect(detail.recentWins.length).toBeGreaterThan(0);
    expect(buildLeaderboardRecentWins(row.metrics).length).toBeGreaterThan(0);
  });
});
