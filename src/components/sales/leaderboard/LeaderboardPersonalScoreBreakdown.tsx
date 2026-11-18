"use client";

import type {
  PersonalScoreBreakdown,
  RecentPointActivityItem,
} from "@/lib/surgical-sales/leaderboardTransparentScoring";
import { formatPathwayPoints } from "@/lib/surgical-sales/leaderboardTransparentScoring";

function formatActivityCount(count: number): string {
  if (Math.abs(count - Math.round(count)) < 0.05) return String(Math.round(count));
  return count.toFixed(1);
}

export function LeaderboardPersonalScoreBreakdown({
  breakdown,
  recentActivity,
  headline,
  subline,
  compact = false,
}: {
  breakdown: PersonalScoreBreakdown;
  recentActivity: RecentPointActivityItem[];
  headline?: string;
  subline?: string;
  compact?: boolean;
}) {
  return (
    <div className={`lb-score-breakdown${compact ? " lb-score-breakdown--compact" : ""}`}>
      <div className="lb-score-breakdown-hero">
        <div>
          {headline ? <div className="lb-score-breakdown-kicker">{headline}</div> : null}
          <div className="lb-score-breakdown-total">
            {breakdown.totalPointsLabel} <span>points</span>
          </div>
          {subline ? <p className="lb-score-breakdown-sub">{subline}</p> : null}
        </div>
        <div className="lb-score-breakdown-total-label">Sales Execution Score</div>
      </div>

      <section className="lb-score-breakdown-section" aria-labelledby="lb-score-breakdown-categories">
        <h3 id="lb-score-breakdown-categories" className="lb-score-breakdown-section-title">
          Points By Activity
        </h3>
        <div className="lb-score-breakdown-table-wrap">
          <table className="lb-score-breakdown-table">
            <thead>
              <tr>
                <th scope="col">Activity</th>
                <th scope="col">Points Earned</th>
                <th scope="col">Percent Of Total</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.categories.map((row) => (
                <tr key={row.id}>
                  <td className="lb-score-breakdown-category">{row.label}</td>
                  <td className="lb-score-breakdown-points">{formatPathwayPoints(row.points)}</td>
                  <td className="lb-score-breakdown-percent">{row.percentLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="lb-score-breakdown-section" aria-labelledby="lb-score-breakdown-recent">
        <h3 id="lb-score-breakdown-recent" className="lb-score-breakdown-section-title">
          Recent Point Activity
        </h3>
        {recentActivity.length > 0 ? (
          <ul className="lb-score-breakdown-activity">
            {recentActivity.map((item) => (
              <li key={item.activityId} className="lb-score-breakdown-activity-row">
                <span className="lb-score-breakdown-activity-points">{item.pointsDisplay}</span>
                <span className="lb-score-breakdown-activity-label">
                  {item.label}
                  {item.count > 1 ? (
                    <span className="lb-score-breakdown-activity-count"> · {formatActivityCount(item.count)}×</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="lb-score-breakdown-empty">
            Point activity appears as you complete observations, capture intelligence, and advance opportunities.
          </p>
        )}
      </section>
    </div>
  );
}
