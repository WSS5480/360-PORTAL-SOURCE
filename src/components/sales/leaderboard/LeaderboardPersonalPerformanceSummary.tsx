"use client";

import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import { SALES_EXECUTION_SCORE_LABEL } from "@/lib/surgical-sales/executionLeaderboardConfig";
import { buildLeaderboardCompetitiveContext } from "@/lib/surgical-sales/leaderboardCompetitiveContext";
import type { LeaderboardPortalRepRow } from "@/lib/surgical-sales/leaderboardPortalTypes";

export function LeaderboardPersonalPerformanceSummary({
  selfRank,
  totalReps,
  selfUserId,
  entries,
  repById,
  variant = "strip",
}: {
  selfRank: number;
  totalReps: number;
  selfUserId: string;
  entries: LeaderboardBoardEntry[];
  repById: Map<string, LeaderboardPortalRepRow>;
  variant?: "strip" | "card";
}) {
  const context = buildLeaderboardCompetitiveContext({
    selfRank,
    totalReps,
    selfUserId,
    entries,
    repById,
  });

  return (
    <section
      className={`lb-performance-summary lb-performance-summary--${variant}${context.status === "leader" ? " is-leader" : ""}`}
      aria-label="Your competitive standing"
    >
      <div className="lb-performance-summary-metric">
        <span className="lb-performance-summary-label">Current Rank</span>
        <span className="lb-performance-summary-value lb-performance-summary-value--rank">{context.rankDisplay}</span>
      </div>
      <div className="lb-performance-summary-metric">
        <span className="lb-performance-summary-label">{SALES_EXECUTION_SCORE_LABEL}</span>
        <span className="lb-performance-summary-value lb-performance-summary-value--score">{context.scoreDisplay}</span>
      </div>
      <div className="lb-performance-summary-metric lb-performance-summary-metric--advance">
        <span className="lb-performance-summary-label">Points Needed To Advance</span>
        <p className="lb-performance-summary-advance">{context.advanceDisplay}</p>
      </div>
    </section>
  );
}
