import { mergeExecutionLeaderboardConfig } from "@/lib/surgical-sales/executionLeaderboardConfig";
import {
  computeLeaderboardScoreFromCounts,
  type ExecutionLeaderboardCounts,
} from "@/lib/surgical-sales/executionLeaderboardMetrics";
import {
  computePathwayAchievementBadges,
  listPathwayBadgeProgress,
  nearestPathwayBadgeProgress,
  type PathwayAchievementBadge,
} from "@/lib/surgical-sales/leaderboardPathwayBadges";

export const ACHIEVEMENT_BADGE_IDS = [
  "field_investigator",
  "debrief_driver",
  "evaluation_leader",
  "case_commander",
  "rising_star",
] as const;

export type AchievementBadgeId = (typeof ACHIEVEMENT_BADGE_IDS)[number];

export type AchievementBadgeDefinition = {
  id: AchievementBadgeId;
  title: string;
  description: string;
  shortLabel: string;
  accent: PathwayAchievementBadge["accent"] | "gold";
};

export type AchievementBadgeThresholds = {
  rising_star_delta: number;
};

export const DEFAULT_ACHIEVEMENT_BADGE_THRESHOLDS: AchievementBadgeThresholds = {
  rising_star_delta: 50,
};

const RISING_STAR_BADGE: AchievementBadgeDefinition = {
  id: "rising_star",
  title: "Rising Star",
  description: "Biggest improvement in Sales Execution Score over the prior period.",
  shortLabel: "Rising Star",
  accent: "gold",
};

export type EarnedAchievementBadge = AchievementBadgeDefinition & {
  earned_at_period?: boolean;
};

export type AchievementBadgeProgress = {
  id: AchievementBadgeId;
  current: number;
  target: number;
  label: string;
};

function pathwayBadgeToEarned(badge: PathwayAchievementBadge): EarnedAchievementBadge {
  return {
    id: badge.id as AchievementBadgeId,
    title: badge.title,
    description: badge.description,
    shortLabel: badge.shortLabel,
    accent: badge.accent,
    earned_at_period: true,
  };
}

export function qualityInsightCount(counts: ExecutionLeaderboardCounts): number {
  return counts.debrief_completed || 0;
}

export function computeRepAchievementBadges(args: {
  counts: ExecutionLeaderboardCounts;
  priorCounts?: ExecutionLeaderboardCounts | null;
  currentLeaderboardScore?: number;
  priorLeaderboardScore?: number;
  thresholds?: Partial<AchievementBadgeThresholds>;
}): EarnedAchievementBadge[] {
  const t = { ...DEFAULT_ACHIEVEMENT_BADGE_THRESHOLDS, ...(args.thresholds ?? {}) };
  const earned = computePathwayAchievementBadges(args.counts).map(pathwayBadgeToEarned);

  const config = mergeExecutionLeaderboardConfig(null);
  const currentScore = args.currentLeaderboardScore ?? computeLeaderboardScoreFromCounts(args.counts, config);
  const priorScore =
    args.priorLeaderboardScore ??
    (args.priorCounts ? computeLeaderboardScoreFromCounts(args.priorCounts, config) : 0);

  if (currentScore - priorScore >= t.rising_star_delta) {
    earned.push({ ...RISING_STAR_BADGE, earned_at_period: true });
  }

  return earned;
}

export function nearestBadgeProgress(counts: ExecutionLeaderboardCounts): AchievementBadgeProgress | null {
  const next = nearestPathwayBadgeProgress(counts);
  if (!next) return null;
  return {
    id: next.id as AchievementBadgeId,
    current: next.current,
    target: next.target,
    label: next.label,
  };
}

export type ScorecardBadgeProgressItem = {
  id: AchievementBadgeId;
  label: string;
  current: number;
  target: number;
  earned: boolean;
};

/** V1 scorecard badges — four pathway milestones plus Rising Star. */
export function listV1ScorecardBadgeProgress(args: {
  counts: ExecutionLeaderboardCounts;
  scoreTrend?: number;
  earnedBadgeIds?: Iterable<AchievementBadgeId>;
}): ScorecardBadgeProgressItem[] {
  const t = DEFAULT_ACHIEVEMENT_BADGE_THRESHOLDS;
  const earnedSet = new Set(args.earnedBadgeIds ?? []);

  const items: ScorecardBadgeProgressItem[] = listPathwayBadgeProgress(args.counts).map((row) => ({
    id: row.id,
    label: row.label,
    current: row.current,
    target: row.target,
    earned: earnedSet.has(row.id) || row.current >= row.target,
  }));

  const trend = Math.max(0, Math.round(args.scoreTrend ?? 0));
  items.push({
    id: "rising_star",
    label: "Rising Star",
    current: trend,
    target: t.rising_star_delta,
    earned: earnedSet.has("rising_star") || trend >= t.rising_star_delta,
  });

  return items;
}
