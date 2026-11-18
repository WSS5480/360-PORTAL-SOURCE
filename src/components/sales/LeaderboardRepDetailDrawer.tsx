"use client";

import React from "react";
import { createPortal } from "react-dom";
import { AchievementBadgesRow } from "@/components/sales/AchievementBadgesRow";
import { PathwayBadgesRow } from "@/components/sales/leaderboard/PathwayBadgesRow";
import { SALES_EXECUTION_SCORE_LABEL } from "@/lib/surgical-sales/executionLeaderboardConfig";
import type { LeaderboardRepDetail } from "@/lib/surgical-sales/leaderboardRepDetail";
import { repInitials, trendArrow } from "@/lib/surgical-sales/leaderboardPresentation";

function trendClass(trend: number): string {
  if (trend > 0) return "lb-trend lb-trend-up";
  if (trend < 0) return "lb-trend lb-trend-down";
  return "lb-trend lb-trend-flat";
}

export function LeaderboardRepDetailDrawer({
  detail,
  onClose,
}: {
  detail: LeaderboardRepDetail | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!detail) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [detail, onClose]);

  if (!mounted || !detail) return null;

  const observations = Math.round(
    detail.pathwayStats?.observations ?? detail.observationsCompleted ?? 0,
  );
  const opportunities = Math.round(
    detail.pathwayStats?.evaluations ?? detail.opportunitiesCreated ?? 0,
  );
  const hasBadges = detail.pathwayBadges.length > 0 || detail.achievementBadges.length > 0;

  return createPortal(
    <div
      className="lb-drawer-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className="lb-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lb-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lb-drawer-head">
          <div className="lb-drawer-head-main">
            <div className="lb-avatar lb-drawer-avatar" aria-hidden>
              {repInitials(detail.displayName)}
            </div>
            <div>
              <h2 id="lb-drawer-title" className="lb-drawer-title">
                {detail.displayName}
              </h2>
              {detail.badgeLabel ? (
                <div className="lb-drawer-sub">{detail.badgeLabel}</div>
              ) : null}
            </div>
          </div>
          <button type="button" className="lb-drawer-close" aria-label="Close rep details" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="lb-drawer-body">
          <dl className="lb-drawer-stats">
            <div>
              <dt>Rank</dt>
              <dd>#{detail.rank}</dd>
            </div>
            <div>
              <dt>{SALES_EXECUTION_SCORE_LABEL}</dt>
              <dd>{detail.pathwayTotalPointsLabel}</dd>
            </div>
            <div>
              <dt>Observations</dt>
              <dd>{observations}</dd>
            </div>
            <div>
              <dt>Opportunities</dt>
              <dd>{opportunities}</dd>
            </div>
          </dl>

          <div className="lb-drawer-trend-row">
            <span className="lb-drawer-section-title">Trend</span>
            <div className={trendClass(detail.trend)}>
              {trendArrow(detail.trend)} {detail.trendLabel}
            </div>
          </div>

          <section className="lb-drawer-section" aria-labelledby="lb-drawer-badges-title">
            <h3 id="lb-drawer-badges-title" className="lb-drawer-section-title">
              Badges
            </h3>
            {hasBadges ? (
              <div className="lb-drawer-badges">
                {detail.pathwayBadges.length > 0 ? (
                  <PathwayBadgesRow badges={detail.pathwayBadges} max={8} />
                ) : null}
                {detail.achievementBadges.length > 0 ? (
                  <AchievementBadgesRow badges={detail.achievementBadges} max={8} />
                ) : null}
              </div>
            ) : (
              <p className="lb-drawer-empty">
                No badges earned this period yet. Complete observations, capture intelligence, and create opportunities
                to unlock milestones.
              </p>
            )}
          </section>

          <section className="lb-drawer-section" aria-labelledby="lb-drawer-breakdown-title">
            <h3 id="lb-drawer-breakdown-title" className="lb-drawer-section-title">
              Score breakdown
            </h3>
            <div className="lb-score-breakdown-table-wrap">
              <table className="lb-score-breakdown-table">
                <thead>
                  <tr>
                    <th scope="col">Activity</th>
                    <th scope="col">Count</th>
                    <th scope="col">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.scorecardActivityRows.map((row) => (
                    <tr key={row.id} className={row.pointsEarned > 0 ? "has-points" : undefined}>
                      <td className="lb-score-breakdown-category">{row.label}</td>
                      <td className="lb-score-breakdown-count">{row.count > 0 ? row.count : "—"}</td>
                      <td className="lb-score-breakdown-points">{row.pointsEarnedLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="lb-drawer-section" aria-labelledby="lb-drawer-recent-title">
            <h3 id="lb-drawer-recent-title" className="lb-drawer-section-title">
              Recent point activity
            </h3>
            {detail.recentScoringEvents.length > 0 ? (
              <ul className="lb-score-breakdown-activity">
                {detail.recentScoringEvents.map((item, index) => (
                  <li key={`${item.activityId}-${index}`} className="lb-score-breakdown-activity-row">
                    <span className="lb-score-breakdown-activity-points">{item.pointsDisplay}</span>
                    <span className="lb-score-breakdown-activity-label">{item.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lb-drawer-empty">No scoring events recorded for this period.</p>
            )}
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
