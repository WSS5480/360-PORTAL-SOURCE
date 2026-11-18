"use client";

import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import type { PathwayAchievementBadge } from "@/lib/surgical-sales/leaderboardPathwayBadges";
import { LeaderboardRowPrimaryBadge } from "@/components/sales/leaderboard/LeaderboardRowPrimaryBadge";
import { LeaderboardRepAvatar } from "@/components/sales/leaderboard/LeaderboardVisuals";

export function LeaderboardRepIdentity({
  name,
  entry,
  pathwayBadges = [],
  avatarSize = "sm",
  celebrate,
  trophySize,
  nameSuffix,
  onNameClick,
  align = "center",
  className,
}: {
  name: string;
  entry?: LeaderboardBoardEntry;
  pathwayBadges?: PathwayAchievementBadge[];
  avatarSize?: "sm" | "md" | "lg";
  celebrate?: boolean;
  trophySize?: number;
  nameSuffix?: string;
  onNameClick?: () => void;
  align?: "center" | "start";
  className?: string;
}) {
  const displayName = `${name}${nameSuffix ?? ""}`;
  const alignClass = align === "start" ? " lb-rep-identity--start" : "";

  return (
    <div className={`lb-rep-identity${alignClass}${className ? ` ${className}` : ""}`}>
      <LeaderboardRepAvatar name={name} size={avatarSize} celebrate={celebrate} trophySize={trophySize} />
      <div className="lb-rep-identity-name">
        {onNameClick ? (
          <button type="button" className="lb-rep-identity-name-btn" onClick={onNameClick}>
            {displayName}
          </button>
        ) : (
          <span className="lb-rep-identity-name-text">{displayName}</span>
        )}
      </div>
      <div className="lb-rep-identity-badge" aria-label="Achievement badge">
        {entry ? <LeaderboardRowPrimaryBadge entry={entry} pathwayBadges={pathwayBadges} /> : null}
      </div>
    </div>
  );
}
