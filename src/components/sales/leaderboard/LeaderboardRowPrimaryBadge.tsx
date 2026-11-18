"use client";

import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import type { PathwayAchievementBadge } from "@/lib/surgical-sales/leaderboardPathwayBadges";
import { PathwayBadgesRow } from "@/components/sales/leaderboard/PathwayBadgesRow";
import {
  LeaderboardAwardBadge,
  LeaderboardStreakChip,
} from "@/components/sales/leaderboard/LeaderboardVisuals";
import {
  showLeaderboardRowPrimaryAward,
  showLeaderboardRowPrimaryPathway,
  showLeaderboardRowPrimaryStreak,
} from "@/lib/surgical-sales/leaderboardPresentation";

export function LeaderboardRowPrimaryBadge({
  entry,
  pathwayBadges,
}: {
  entry: LeaderboardBoardEntry;
  pathwayBadges: PathwayAchievementBadge[];
}) {
  if (showLeaderboardRowPrimaryAward(entry)) {
    return <LeaderboardAwardBadge label={entry.badge_label} />;
  }
  if (showLeaderboardRowPrimaryStreak(entry)) {
    return <LeaderboardStreakChip entry={entry} />;
  }
  if (showLeaderboardRowPrimaryPathway(pathwayBadges.length, entry)) {
    return <PathwayBadgesRow badges={pathwayBadges.slice(0, 1)} compact max={1} />;
  }
  return null;
}
