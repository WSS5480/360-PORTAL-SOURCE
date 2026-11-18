"use client";

import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import type { LeaderboardPortalRepRow } from "@/lib/surgical-sales/leaderboardPortalTypes";
import {
  SALES_EXECUTION_SCORE_COMPACT_LABEL,
  SALES_EXECUTION_SCORE_LABEL,
} from "@/lib/surgical-sales/executionLeaderboardConfig";
import { LeaderboardRankCell } from "@/components/sales/leaderboard/LeaderboardRankCell";
import { LeaderboardRankTableRepLine } from "@/components/sales/leaderboard/LeaderboardRankTableRepLine";
import { LeaderboardTrendLine } from "@/components/sales/leaderboard/LeaderboardVisuals";
import { formatPathwayPoints } from "@/lib/surgical-sales/leaderboardTransparentScoring";

export function LeaderboardRankTable({
  entries,
  repById,
  selfUserId,
  onViewDetails,
}: {
  entries: LeaderboardBoardEntry[];
  repById: Map<string, LeaderboardPortalRepRow>;
  selfUserId?: string | null;
  onViewDetails: (entry: LeaderboardBoardEntry) => void;
}) {
  return (
    <div className="lb-rank-table-wrap">
      <table className="lb-rank-table" aria-label="Sales execution leaderboard rankings">
        <thead>
          <tr>
            <th scope="col" className="lb-rank-table-rank">
              Rank
            </th>
            <th scope="col">Rep</th>
            <th
              scope="col"
              className="lb-rank-table-num lb-rank-table-score-head"
              title={SALES_EXECUTION_SCORE_LABEL}
            >
              {SALES_EXECUTION_SCORE_COMPACT_LABEL}
            </th>
            <th scope="col" className="lb-rank-table-num lb-hide-sm">
              Obs
            </th>
            <th scope="col" className="lb-rank-table-num lb-hide-sm">
              Eval
            </th>
            <th scope="col" className="lb-rank-table-num lb-hide-sm">
              Trend
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const rep = repById.get(entry.user_id);
            const pathway = rep?.pathway_score;
            const isSelf = selfUserId === entry.user_id;
            const totalPoints = pathway?.total_points ?? 0;

            return (
              <tr
                key={entry.user_id}
                className={`lb-rank-table-row${isSelf ? " is-self" : ""}${entry.rank <= 3 ? " is-top-three" : ""}`}
              >
                <td className="lb-rank-table-rank">
                  <LeaderboardRankCell rank={entry.rank} delta={entry.rank_delta} />
                </td>
                <td className="lb-rank-table-rep">
                  <LeaderboardRankTableRepLine
                    name={entry.display_name}
                    entry={entry}
                    pathwayBadges={rep?.pathway_badges ?? []}
                    celebrate={entry.rank === 1}
                    isSelf={isSelf}
                    onNameClick={() => onViewDetails(entry)}
                  />
                  <div className="lb-rank-table-mobile-stats lb-show-sm">
                    <span className="lb-rank-table-mobile-score">{formatPathwayPoints(totalPoints)}</span>
                    <span>Obs {Math.round(pathway?.stats.observations ?? 0)}</span>
                    <span>Eval {Math.round(pathway?.stats.evaluations ?? 0)}</span>
                    <LeaderboardTrendLine entry={entry} />
                  </div>
                </td>
                <td className="lb-rank-table-num lb-rank-table-score-cell">
                  <strong className="lb-rank-table-score">{formatPathwayPoints(totalPoints)}</strong>
                </td>
                <td className="lb-rank-table-num lb-hide-sm">{Math.round(pathway?.stats.observations ?? 0)}</td>
                <td className="lb-rank-table-num lb-hide-sm">{Math.round(pathway?.stats.evaluations ?? 0)}</td>
                <td className="lb-rank-table-num lb-hide-sm lb-rank-table-trend-cell">
                  <LeaderboardTrendLine entry={entry} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
