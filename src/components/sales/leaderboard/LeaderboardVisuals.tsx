"use client";

import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import {
  awardTierFromLabel,
  formatRankMovement,
  leaderboardStreakKind,
  rankMovementClass,
  repInitials,
  scoreProgressPct,
  streakLabel,
  trendArrow,
} from "@/lib/surgical-sales/leaderboardPresentation";
import {
  LeaderboardMedalIcon,
  LeaderboardRankDownIcon,
  LeaderboardRankUpIcon,
  LeaderboardStreakIcon,
  LeaderboardTrophyIcon,
} from "@/components/sales/leaderboard/LeaderboardIcons";

export function LeaderboardAwardBadge({ label }: { label: string | null }) {
  if (!label) return null;
  const tier = awardTierFromLabel(label);
  return (
    <span className={`lb-badge${tier ? ` lb-badge-${tier}` : ""}`}>
      {tier ? <LeaderboardMedalIcon tier={tier} /> : null}
      {label}
    </span>
  );
}

export function LeaderboardStreakChip({ entry }: { entry: LeaderboardBoardEntry }) {
  const kind = leaderboardStreakKind(entry);
  const label = streakLabel(kind);
  if (!kind || !label) return null;
  return (
    <span className={`lb-streak lb-streak--${kind}`}>
      <LeaderboardStreakIcon />
      {label}
    </span>
  );
}

export function LeaderboardRankMovement({ delta }: { delta: number | null | undefined }) {
  const text = formatRankMovement(delta);
  if (!text) return null;
  return (
    <span className={rankMovementClass(delta)}>
      {delta != null && delta > 0 ? <LeaderboardRankUpIcon /> : delta != null && delta < 0 ? <LeaderboardRankDownIcon /> : null}
      {text}
    </span>
  );
}

export function LeaderboardScoreProgress({
  score,
  maxScore,
  label,
}: {
  score: number;
  maxScore: number;
  label?: string;
}) {
  const pct = scoreProgressPct(score, maxScore);
  return (
    <div className="lb-progress-wrap">
      <div className="lb-progress-header">
        <span className="lb-progress-label">{label ?? "Execution score"}</span>
        <span className="lb-progress-pct">{pct}% of leader</span>
      </div>
      <div className="lb-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="lb-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LeaderboardTrendLine({ entry }: { entry: LeaderboardBoardEntry }) {
  const cls =
    entry.trend > 0 ? "lb-trend lb-trend-up" : entry.trend < 0 ? "lb-trend lb-trend-down" : "lb-trend lb-trend-flat";
  return (
    <div className={cls}>
      {trendArrow(entry.trend)} {entry.trend_label}
    </div>
  );
}

export function LeaderboardRepAvatar({
  name,
  size = "md",
  celebrate,
  trophySize,
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  celebrate?: boolean;
  /** Trophy icon px size when celebrate is true (defaults by avatar size). */
  trophySize?: number;
}) {
  const resolvedTrophySize =
    trophySize ?? (size === "lg" ? 18 : size === "md" ? 16 : size === "xs" ? 12 : 14);

  return (
    <div className={`lb-avatar lb-avatar--${size}${celebrate ? " lb-avatar--celebrate" : ""}`} aria-hidden>
      {celebrate ? (
        <span className="lb-avatar-crown" aria-hidden>
          <LeaderboardTrophyIcon size={resolvedTrophySize} />
        </span>
      ) : null}
      {repInitials(name)}
    </div>
  );
}
