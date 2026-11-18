"use client";

import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import type { PathwayAchievementBadge } from "@/lib/surgical-sales/leaderboardPathwayBadges";
import { LeaderboardRowPrimaryBadge } from "@/components/sales/leaderboard/LeaderboardRowPrimaryBadge";
import { LeaderboardRepAvatar } from "@/components/sales/leaderboard/LeaderboardVisuals";

/** Compact single-line rep cell for the operational ranking table. */
export function LeaderboardRankTableRepLine({
  name,
  entry,
  pathwayBadges = [],
  celebrate,
  isSelf,
  onNameClick,
}: {
  name: string;
  entry: LeaderboardBoardEntry;
  pathwayBadges?: PathwayAchievementBadge[];
  celebrate?: boolean;
  nameSuffix?: string;
  isSelf?: boolean;
  onNameClick?: () => void;
}) {
  return (
    <div className={`lb-rank-table-rep-line${isSelf ? " is-self" : ""}`}>
      <LeaderboardRepAvatar name={name} size="xs" celebrate={celebrate} trophySize={12} />
      <div className="lb-rank-table-rep-meta">
        {isSelf ? (
          <span className="lb-you-pill" aria-label="Your row">
            YOU
          </span>
        ) : null}
        {onNameClick ? (
          <button type="button" className="lb-rank-table-name-btn" onClick={onNameClick}>
            {name}
          </button>
        ) : (
          <span className="lb-rank-table-name">{name}</span>
        )}
        <span className="lb-rank-table-rep-badge" aria-label="Achievement badge">
          <LeaderboardRowPrimaryBadge entry={entry} pathwayBadges={pathwayBadges} />
        </span>
      </div>
    </div>
  );
}
