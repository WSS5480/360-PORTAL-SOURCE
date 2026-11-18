"use client";

import React from "react";
import type { EarnedAchievementBadge } from "@/lib/surgical-sales/executionAchievementBadges";
import { AchievementBadgeIcon } from "@/components/sales/leaderboard/LeaderboardIcons";

export function AchievementBadgeChip({
  badge,
  compact,
}: {
  badge: Pick<EarnedAchievementBadge, "id" | "title" | "shortLabel" | "description" | "accent">;
  compact?: boolean;
}) {
  return (
    <span
      className={`lb-ach-badge lb-ach-badge--${badge.accent}${compact ? " lb-ach-badge--compact" : ""}`}
      title={badge.description}
    >
      <span className="lb-ach-badge-icon" aria-hidden>
        <AchievementBadgeIcon id={badge.id} />
      </span>
      {badge.shortLabel}
    </span>
  );
}

export function AchievementBadgesRow({
  badges,
  compact,
  max = 4,
}: {
  badges: EarnedAchievementBadge[];
  compact?: boolean;
  max?: number;
}) {
  if (badges.length === 0) return null;
  const visible = badges.slice(0, max);
  const overflow = badges.length - visible.length;

  return (
    <div className={`lb-ach-row${compact ? " lb-ach-row--compact" : ""}`}>
      {visible.map((badge) => (
        <AchievementBadgeChip key={badge.id} badge={badge} compact={compact} />
      ))}
      {overflow > 0 ? <span className="lb-ach-overflow">+{overflow}</span> : null}
    </div>
  );
}
