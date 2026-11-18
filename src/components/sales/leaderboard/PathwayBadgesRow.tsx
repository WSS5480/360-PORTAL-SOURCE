"use client";

import type { PathwayAchievementBadge } from "@/lib/surgical-sales/leaderboardPathwayBadges";

export function PathwayBadgesRow({
  badges,
  compact,
  max = 4,
}: {
  badges: PathwayAchievementBadge[];
  compact?: boolean;
  max?: number;
}) {
  if (badges.length === 0) return null;
  const visible = badges.slice(0, max);
  const overflow = badges.length - visible.length;

  return (
    <div className={`lb-path-badge-row${compact ? " lb-path-badge-row--compact" : ""}`}>
      {visible.map((badge) => (
        <span
          key={badge.id}
          className={`lb-path-badge lb-path-badge--${badge.accent}${compact ? " lb-path-badge--compact" : ""}`}
          title={badge.description}
        >
          {badge.shortLabel}
        </span>
      ))}
      {overflow > 0 ? <span className="lb-ach-overflow">+{overflow}</span> : null}
    </div>
  );
}
