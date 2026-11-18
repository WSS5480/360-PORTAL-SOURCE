"use client";

import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import type { LeaderboardPortalRepRow } from "@/lib/surgical-sales/leaderboardPortalTypes";
import type { ExecutionLeaderboardConfig } from "@/lib/surgical-sales/executionLeaderboardConfig";
import { DEFAULT_EXECUTION_LEADERBOARD_CONFIG, SALES_EXECUTION_SCORE_LABEL } from "@/lib/surgical-sales/executionLeaderboardConfig";
import { LeaderboardBadgeProgress } from "@/components/sales/leaderboard/LeaderboardBadgeProgress";
import { LeaderboardPersonalPerformanceSummary } from "@/components/sales/leaderboard/LeaderboardPersonalPerformanceSummary";
import { LeaderboardRepIdentity } from "@/components/sales/leaderboard/LeaderboardRepIdentity";
import { listV1ScorecardBadgeProgress } from "@/lib/surgical-sales/executionAchievementBadges";
import {
  buildRecentScoringEvents,
  computeScorecardActivityRows,
  formatPathwayPoints,
} from "@/lib/surgical-sales/leaderboardTransparentScoring";

export function LeaderboardMyScorecard({
  repRow,
  boardEntry,
  periodLabel,
  priorPeriodLabel,
  scoringConfig,
  entries = [],
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
  const config = scoringConfig ?? DEFAULT_EXECUTION_LEADERBOARD_CONFIG;
  const activityRows = computeScorecardActivityRows(repRow.metrics, config);
  const recentEvents = buildRecentScoringEvents(repRow.metrics, config);
  const totalPoints = repRow.pathway_score.total_points;
  const badgeProgress = listV1ScorecardBadgeProgress({
    counts: repRow.metrics,
    scoreTrend: boardEntry?.trend,
    earnedBadgeIds: [
      ...repRow.pathway_badges.map((b) => b.id),
      ...repRow.achievement_badges.map((b) => b.id),
    ],
  });

  const identityEntry: LeaderboardBoardEntry =
    boardEntry ??
    ({
      rank: repRow.rank,
      user_id: repRow.user_id,
      display_name: repRow.name,
      score: repRow.leaderboard_score,
      key_stat: "",
      trend: 0,
      trend_label: "—",
      badge_label: null,
      prior_rank: null,
      rank_delta: null,
    } satisfies LeaderboardBoardEntry);

  return (
    <div className="lb-scorecard">
      <header className="lb-scorecard-header">
        <h2 className="lb-scorecard-title">My Scorecard</h2>
        {periodLabel ? <p className="lb-scorecard-period">{periodLabel}</p> : null}
        <LeaderboardRepIdentity
          className="lb-rep-identity--scorecard"
          name={repRow.name}
          entry={identityEntry}
          pathwayBadges={repRow.pathway_badges}
          avatarSize="md"
          celebrate={identityEntry.rank === 1}
          align="start"
        />
      </header>

      {boardEntry && repById && entries.length > 0 ? (
        <LeaderboardPersonalPerformanceSummary
          selfRank={boardEntry.rank}
          totalReps={entries.length}
          selfUserId={repRow.user_id}
          entries={entries}
          repById={repById}
          variant="card"
        />
      ) : (
        <section className="lb-scorecard-main" aria-labelledby="lb-scorecard-main-title">
          <h3 id="lb-scorecard-main-title" className="lb-visually-hidden">
            {SALES_EXECUTION_SCORE_LABEL}
          </h3>
          <div className="lb-scorecard-main-grid">
            <div className="lb-scorecard-main-stat">
              <span className="lb-scorecard-main-label">{SALES_EXECUTION_SCORE_LABEL}</span>
              <span className="lb-scorecard-main-value">{formatPathwayPoints(totalPoints)}</span>
              <span className="lb-scorecard-main-unit">pts</span>
            </div>
            <div className="lb-scorecard-main-stat">
              <span className="lb-scorecard-main-label">Current rank</span>
              <span className="lb-scorecard-main-value">
                {boardEntry ? `#${boardEntry.rank}` : repRow.rank ? `#${repRow.rank}` : "—"}
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="lb-scorecard-section" aria-labelledby="lb-scorecard-activities-title">
        <h3 id="lb-scorecard-activities-title" className="lb-scorecard-section-title">
          Points by activity
        </h3>
        <div className="lb-score-breakdown-table-wrap">
          <table className="lb-score-breakdown-table">
            <thead>
              <tr>
                <th scope="col">Activity</th>
                <th scope="col">Count</th>
                <th scope="col">Points earned</th>
              </tr>
            </thead>
            <tbody>
              {activityRows.map((row) => (
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

      <section className="lb-scorecard-section" aria-labelledby="lb-scorecard-recent-title">
        <h3 id="lb-scorecard-recent-title" className="lb-scorecard-section-title">
          Recent point activity
        </h3>
        {recentEvents.length > 0 ? (
          <ul className="lb-score-breakdown-activity">
            {recentEvents.map((item, index) => (
              <li key={`${item.activityId}-${index}`} className="lb-score-breakdown-activity-row">
                <span className="lb-score-breakdown-activity-points">{item.pointsDisplay}</span>
                <span className="lb-score-breakdown-activity-label">{item.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="lb-score-breakdown-empty">
            Scoring events appear as you complete intro calls, observations, intelligence captures, and opportunities.
          </p>
        )}
      </section>

      <LeaderboardBadgeProgress items={badgeProgress} />
    </div>
  );
}
