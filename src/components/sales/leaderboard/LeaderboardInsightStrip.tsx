"use client";

import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import type { ExecutionLeaderboardConfig } from "@/lib/surgical-sales/executionLeaderboardConfig";
import {
  buildLeaderboardCompetitiveContext,
  buildLeaderboardInsightStrip,
} from "@/lib/surgical-sales/leaderboardCompetitiveContext";
import type { LeaderboardPortalRepRow } from "@/lib/surgical-sales/leaderboardPortalTypes";

export function LeaderboardInsightStrip({
  selfRank,
  totalReps,
  selfUserId,
  entries,
  repById,
  scoringConfig,
}: {
  selfRank: number;
  totalReps: number;
  selfUserId: string;
  entries: LeaderboardBoardEntry[];
  repById: Map<string, LeaderboardPortalRepRow>;
  scoringConfig?: ExecutionLeaderboardConfig;
}) {
  const context = buildLeaderboardCompetitiveContext({
    selfRank,
    totalReps,
    selfUserId,
    entries,
    repById,
  });
  const insight = buildLeaderboardInsightStrip({ context, scoringConfig });
  if (!insight?.message) return null;

  return (
    <div className="lb-insight-strip" role="status" aria-live="polite">
      <span className="lb-insight-strip-label">Target</span>
      <p className="lb-insight-strip-message">{insight.message}</p>
    </div>
  );
}
