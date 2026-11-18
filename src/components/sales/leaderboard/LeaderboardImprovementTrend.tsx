"use client";

import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import { formatRankMovement, trendArrow } from "@/lib/surgical-sales/leaderboardPresentation";

export function LeaderboardImprovementTrend({
  entry,
  priorPeriodLabel,
}: {
  entry: LeaderboardBoardEntry;
  priorPeriodLabel?: string;
}) {
  const trendCls =
    entry.trend > 0 ? "lb-improvement-trend-val is-up" : entry.trend < 0 ? "lb-improvement-trend-val is-down" : "lb-improvement-trend-val is-flat";
  const rankMove = formatRankMovement(entry.rank_delta);

  return (
    <section className="lb-improvement-trend" aria-labelledby="lb-improvement-trend-title">
      <h2 id="lb-improvement-trend-title" className="lb-improvement-trend-title">
        Personal improvement trend
      </h2>
      {priorPeriodLabel ? (
        <p className="lb-improvement-trend-lead">Compared with {priorPeriodLabel}</p>
      ) : null}

      <div className="lb-improvement-trend-grid">
        <div className="lb-improvement-trend-card">
          <span className="lb-improvement-trend-label">Score change</span>
          <span className={trendCls}>
            {trendArrow(entry.trend)} {entry.trend_label}
          </span>
        </div>
        <div className="lb-improvement-trend-card">
          <span className="lb-improvement-trend-label">Rank movement</span>
          <span className="lb-improvement-trend-val">
            {rankMove ?? (entry.prior_rank ? `Held at #${entry.rank}` : "First period on board")}
          </span>
        </div>
        {entry.prior_rank != null ? (
          <div className="lb-improvement-trend-card">
            <span className="lb-improvement-trend-label">Prior rank</span>
            <span className="lb-improvement-trend-val">#{entry.prior_rank}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
