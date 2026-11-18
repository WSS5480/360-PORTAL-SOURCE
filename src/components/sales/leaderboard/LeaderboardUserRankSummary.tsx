"use client";

import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import { LeaderboardPersonalPerformanceSummary } from "@/components/sales/leaderboard/LeaderboardPersonalPerformanceSummary";
import type { LeaderboardPortalRepRow } from "@/lib/surgical-sales/leaderboardPortalTypes";

export function LeaderboardUserRankSummary({
  entry,
  totalReps,
  entries,
  repById,
}: {
  entry: LeaderboardBoardEntry;
  totalReps: number;
  entries: LeaderboardBoardEntry[];
  repById: Map<string, LeaderboardPortalRepRow>;
}) {
  return (
    <LeaderboardPersonalPerformanceSummary
      selfRank={entry.rank}
      totalReps={totalReps}
      selfUserId={entry.user_id}
      entries={entries}
      repById={repById}
      variant="strip"
    />
  );
}
