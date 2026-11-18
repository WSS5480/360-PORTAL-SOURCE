"use client";

import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import type { LeaderboardPortalRepRow } from "@/lib/surgical-sales/leaderboardPortalTypes";
import type { ExecutionLeaderboardConfig } from "@/lib/surgical-sales/executionLeaderboardConfig";
import { LeaderboardMyScorecard } from "@/components/sales/leaderboard/LeaderboardMyScorecard";

/** @deprecated Use LeaderboardMyScorecard — kept for import stability. */
export function LeaderboardPersonalScorePanel({
  repRow,
  boardEntry,
  periodLabel,
  priorPeriodLabel,
  scoringConfig,
  entries,
  repById,
}: {
  repRow: LeaderboardPortalRepRow;
  boardEntry?: LeaderboardBoardEntry;
  periodLabel?: string;
  priorPeriodLabel?: string;
  scoringConfig?: ExecutionLeaderboardConfig;
  entries?: LeaderboardBoardEntry[];
  repById?: Map<string, LeaderboardPortalRepRow>;
}) {
  return (
    <LeaderboardMyScorecard
      repRow={repRow}
      boardEntry={boardEntry}
      periodLabel={periodLabel}
      priorPeriodLabel={priorPeriodLabel}
      scoringConfig={scoringConfig}
      entries={entries}
      repById={repById}
    />
  );
}
