import type { ExecutionLeaderboardConfig } from "@/lib/surgical-sales/executionLeaderboardConfig";
import {
  DEFAULT_EXECUTION_LEADERBOARD_CONFIG,
  EXECUTION_LEADERBOARD_CATEGORY_LABELS,
  type ExecutionLeaderboardCategory,
} from "@/lib/surgical-sales/executionLeaderboardConfig";
import type { ExecutionLeaderboardCounts } from "@/lib/surgical-sales/executionLeaderboardMetrics";
import { qualityInsightCount } from "@/lib/surgical-sales/executionAchievementBadges";
import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import type { LeaderboardPortalRepRow } from "@/lib/surgical-sales/leaderboardPortalTypes";
import type { PathwayAchievementBadge } from "@/lib/surgical-sales/leaderboardPathwayBadges";
import {
  buildRecentPointActivity,
  buildRecentScoringEvents,
  computePersonalScoreBreakdown,
  computeScorecardActivityRows,
  PATHWAY_SCORING_ACTIVITIES,
  type PathwayRepScore,
} from "@/lib/surgical-sales/leaderboardTransparentScoring";

export function formatLeaderboardMetricCount(value: number): string {
  if (Math.abs(value - Math.round(value)) < 0.05) return String(Math.round(value));
  return value.toFixed(1);
}

export function buildLeaderboardRecentWins(metrics: ExecutionLeaderboardCounts): string[] {
  const wins: string[] = [];

  if ((metrics.intro_call_completed || 0) > 0) {
    wins.push(`${formatLeaderboardMetricCount(metrics.intro_call_completed)} intro call(s) completed`);
  }
  if ((metrics.observation_completed || 0) > 0) {
    wins.push(`${formatLeaderboardMetricCount(metrics.observation_completed)} observation(s) completed`);
  }
  if ((metrics.five_observations_completed || 0) > 0) {
    wins.push(`${formatLeaderboardMetricCount(metrics.five_observations_completed)} five-observation milestone(s)`);
  }
  if ((metrics.debrief_completed || 0) > 0) {
    wins.push(`${formatLeaderboardMetricCount(metrics.debrief_completed)} debrief(s) completed`);
  }
  if ((metrics.evaluation_started || 0) > 0) {
    wins.push(`${formatLeaderboardMetricCount(metrics.evaluation_started)} evaluation(s) started`);
  }
  if ((metrics.commitment_secured || 0) > 0) {
    wins.push(`${formatLeaderboardMetricCount(metrics.commitment_secured)} commitment(s) secured`);
  }
  if ((metrics.product_support_case_completed || 0) > 0) {
    wins.push(
      `${formatLeaderboardMetricCount(metrics.product_support_case_completed)} product support case(s) closed`,
    );
  }
  if ((metrics.outcome_qti_started || 0) > 0) {
    wins.push(`${formatLeaderboardMetricCount(metrics.outcome_qti_started)} outcome/QTi started`);
  }

  return wins.slice(0, 5);
}

export function categoryScoreBreakdown(
  categoryScores: Record<string, number>,
): Array<{ id: ExecutionLeaderboardCategory; label: string; score: number }> {
  const order: ExecutionLeaderboardCategory[] = [
    "provider_discovery",
    "observation_request",
    "observation",
    "observation_debrief",
    "evaluation",
    "commitment",
    "product_support_case",
    "outcomes",
  ];
  return order.map((id) => ({
    id,
    label: EXECUTION_LEADERBOARD_CATEGORY_LABELS[id],
    score: categoryScores[id] || 0,
  }));
}

export function repDetailFromBoardEntry(args: {
  entry: LeaderboardBoardEntry;
  repRow?: Pick<
    LeaderboardPortalRepRow,
    | "metrics"
    | "category_scores"
    | "leaderboard_score"
    | "best_category"
    | "achievement_badges"
    | "pathway_score"
    | "pathway_badges"
  > | null;
  boardTitle?: string;
  scoringConfig?: ExecutionLeaderboardConfig;
}) {
  const metrics = args.repRow?.metrics ?? ({} as ExecutionLeaderboardCounts);
  const config = args.scoringConfig ?? DEFAULT_EXECUTION_LEADERBOARD_CONFIG;
  const pathwayScore: PathwayRepScore | null = args.repRow?.pathway_score ?? null;
  const pathwayBadges: PathwayAchievementBadge[] = args.repRow?.pathway_badges ?? [];
  const personalBreakdown = computePersonalScoreBreakdown(metrics, config);
  const recentPointActivity = buildRecentPointActivity(metrics, config);
  const scorecardActivityRows = computeScorecardActivityRows(metrics, config);
  const recentScoringEvents = buildRecentScoringEvents(metrics, config);

  const pathwayBreakdown = PATHWAY_SCORING_ACTIVITIES.map((activity) => ({
    id: activity.id,
    label: activity.label,
    count: metrics[activity.metricKey] || 0,
    points: Math.round((metrics[activity.metricKey] || 0) * (config.metricPoints[activity.metricKey] || 0)),
  })).filter((row) => row.points > 0);

  return {
    userId: args.entry.user_id,
    displayName: args.entry.display_name,
    rank: args.entry.rank,
    score: args.entry.score,
    trend: args.entry.trend,
    trendLabel: args.entry.trend_label,
    badgeLabel: args.entry.badge_label,
    keyStat: args.entry.key_stat,
    boardTitle: args.boardTitle ?? "Sales Execution",
    leaderboardScore: args.repRow?.leaderboard_score ?? args.entry.score,
    bestCategory: args.repRow?.best_category ?? "Observation",
    categoryScores: args.repRow?.category_scores ?? {},
    metrics,
    achievementBadges: args.repRow?.achievement_badges ?? [],
    pathwayBadges,
    pathwayTotalPoints: personalBreakdown.totalPoints,
    pathwayTotalPointsLabel: personalBreakdown.totalPointsLabel,
    personalBreakdown,
    recentPointActivity,
    scorecardActivityRows,
    recentScoringEvents,
    pathwayBreakdown,
    intelligenceCaptured: qualityInsightCount(metrics),
    observationsCompleted: metrics.observation_completed || 0,
    opportunitiesCreated: 0,
    productSupportCompleted: metrics.product_support_case_completed || 0,
    debriefsCompleted: metrics.debrief_completed || 0,
    recentWins: buildLeaderboardRecentWins(metrics),
    scoreBreakdown: categoryScoreBreakdown(args.repRow?.category_scores ?? {}),
    pathwayStats: pathwayScore?.stats ?? null,
  };
}

export type LeaderboardRepDetail = ReturnType<typeof repDetailFromBoardEntry>;
