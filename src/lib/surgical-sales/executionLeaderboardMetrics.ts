import {
  ALL_PATHWAY_LEADERBOARD_METRICS,
  categoryMetrics,
  effectiveLeaderboardMetricPoints,
  EXECUTION_LEADERBOARD_CATEGORIES,
  mergeExecutionLeaderboardConfig,
  type ExecutionLeaderboardCategory,
  type ExecutionLeaderboardConfig,
  type ExecutionLeaderboardMetricKey,
  type PartialExecutionLeaderboardConfig,
} from "@/lib/surgical-sales/executionLeaderboardConfig";
import type { LeaderboardBoard } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import type { EarnedAchievementBadge } from "@/lib/surgical-sales/executionAchievementBadges";

export type ExecutionLeaderboardCounts = Record<ExecutionLeaderboardMetricKey, number>;

export type ExecutionLeaderboardCategoryScores = Record<ExecutionLeaderboardCategory, number>;

export type ExecutionLeaderboardRepRow = {
  user_id: string;
  display_name: string;
  email: string | null;
  rank: number;
  leaderboard_score: number;
  category_scores: ExecutionLeaderboardCategoryScores;
  metrics: ExecutionLeaderboardCounts;
};

export type ExecutionLeaderboardResult = {
  period_start: string;
  period_end: string;
  period_label: string;
  prior_period_start?: string;
  prior_period_end?: string;
  prior_period_label?: string;
  config: ExecutionLeaderboardConfig;
  reps: ExecutionLeaderboardRepRow[];
  boards?: LeaderboardBoard[];
  achievement_badges_by_rep?: Record<string, EarnedAchievementBadge[]>;
  self_user_id?: string;
  self_rank?: number | null;
};

export function emptyExecutionLeaderboardCounts(): ExecutionLeaderboardCounts {
  const counts = {} as ExecutionLeaderboardCounts;
  for (const key of ALL_PATHWAY_LEADERBOARD_METRICS) {
    counts[key] = 0;
  }
  return counts;
}

export function computeCategoryScore(
  counts: ExecutionLeaderboardCounts,
  category: ExecutionLeaderboardCategory,
  config: ExecutionLeaderboardConfig,
): number {
  let total = 0;
  for (const metric of categoryMetrics(category)) {
    total += (counts[metric] || 0) * effectiveLeaderboardMetricPoints(config, metric);
  }
  return total;
}

export function computeCategoryScores(
  counts: ExecutionLeaderboardCounts,
  config: ExecutionLeaderboardConfig,
): ExecutionLeaderboardCategoryScores {
  const scores = {} as ExecutionLeaderboardCategoryScores;
  for (const category of EXECUTION_LEADERBOARD_CATEGORIES) {
    scores[category] = computeCategoryScore(counts, category, config);
  }
  return scores;
}

/** Sum of pathway progression points across all metrics. */
export function computeLeaderboardScore(
  categoryScores: ExecutionLeaderboardCategoryScores,
  config: ExecutionLeaderboardConfig,
): number {
  let total = 0;
  for (const category of EXECUTION_LEADERBOARD_CATEGORIES) {
    total += categoryScores[category] * config.categoryWeights[category];
  }
  return Math.round(total * 10) / 10;
}

export function computeLeaderboardScoreFromCounts(
  counts: ExecutionLeaderboardCounts,
  config: ExecutionLeaderboardConfig,
): number {
  return computeLeaderboardScore(computeCategoryScores(counts, config), config);
}

export function buildExecutionLeaderboard(args: {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  internalReps: Array<{ user_id: string; display_name: string; email: string | null }>;
  countsByRep: Map<string, ExecutionLeaderboardCounts>;
  config?: PartialExecutionLeaderboardConfig | null;
  selfUserId?: string | null;
}): ExecutionLeaderboardResult {
  const config = mergeExecutionLeaderboardConfig(args.config);
  const reps: ExecutionLeaderboardRepRow[] = [];

  for (const rep of args.internalReps) {
    const metrics = args.countsByRep.get(rep.user_id) ?? emptyExecutionLeaderboardCounts();
    const category_scores = computeCategoryScores(metrics, config);
    reps.push({
      user_id: rep.user_id,
      display_name: rep.display_name,
      email: rep.email,
      rank: 0,
      leaderboard_score: computeLeaderboardScore(category_scores, config),
      category_scores,
      metrics,
    });
  }

  reps.sort(
    (a, b) =>
      b.leaderboard_score - a.leaderboard_score ||
      b.category_scores.observation - a.category_scores.observation ||
      a.display_name.localeCompare(b.display_name),
  );

  reps.forEach((row, idx) => {
    row.rank = idx + 1;
  });

  const selfUserId = args.selfUserId ? String(args.selfUserId) : undefined;
  const selfRow = selfUserId ? reps.find((r) => r.user_id === selfUserId) : undefined;

  return {
    period_start: args.periodStart,
    period_end: args.periodEnd,
    period_label: args.periodLabel,
    config,
    reps,
    self_user_id: selfUserId,
    self_rank: selfRow?.rank ?? null,
  };
}

export function hasTextContent(value: unknown): boolean {
  return String(value ?? "").trim().length > 0;
}

export function tsInYmdRange(iso: string | null | undefined, startYmd: string, endYmd: string): boolean {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return false;
  const d = iso.slice(0, 10);
  return d >= startYmd && d <= endYmd;
}

export function isCompletedCaseStatus(status: string | null | undefined): boolean {
  const s = String(status || "").toLowerCase();
  return s === "completed" || s === "closed";
}

export function isScheduledObservationCaseStatus(status: string | null | undefined): boolean {
  const s = String(status || "").toLowerCase();
  return s === "scheduled" || s === "confirmed" || s === "planned" || s === "in_progress";
}

export function isCompletedEngagementStatus(status: string | null | undefined): boolean {
  return String(status || "").toLowerCase() === "completed";
}

export function engagementCompletionYmd(row: {
  debrief_completed_at?: string | null;
  updated_at?: string | null;
  engagement_date?: string | null;
}): string | null {
  if (row.debrief_completed_at) return row.debrief_completed_at.slice(0, 10);
  if (row.engagement_date) return String(row.engagement_date).slice(0, 10);
  if (row.updated_at) return row.updated_at.slice(0, 10);
  return null;
}

export function isDebriefCompleted(row: {
  debrief_completed?: boolean | null;
  debrief_completed_at?: string | null;
}): boolean {
  if (row.debrief_completed === true) return true;
  return hasTextContent(row.debrief_completed_at);
}
