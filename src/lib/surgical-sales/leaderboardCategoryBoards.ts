import {
  DEFAULT_EXECUTION_LEADERBOARD_METRIC_POINTS,
  SALES_EXECUTION_SCORE_LABEL,
  type ExecutionLeaderboardConfig,
  type ExecutionLeaderboardMetricKey,
} from "@/lib/surgical-sales/executionLeaderboardConfig";
import {
  computeLeaderboardScoreFromCounts,
  type ExecutionLeaderboardCounts,
  type ExecutionLeaderboardRepRow,
} from "@/lib/surgical-sales/executionLeaderboardMetrics";

export const LEADERBOARD_BOARD_IDS = ["field_commander"] as const;

export type LeaderboardBoardId = (typeof LEADERBOARD_BOARD_IDS)[number];

export type LeaderboardBoardEntry = {
  rank: number;
  user_id: string;
  display_name: string;
  score: number;
  key_stat: string;
  trend: number;
  trend_label: string;
  badge_label: string | null;
  prior_rank: number | null;
  rank_delta: number | null;
};

export type LeaderboardBoard = {
  id: LeaderboardBoardId;
  title: string;
  description: string;
  award_name: string;
  entries: LeaderboardBoardEntry[];
  self_rank: number | null;
};

export type LeaderboardBoardsResult = {
  boards: LeaderboardBoard[];
  prior_period_label: string;
};

const BADGE_TIER_BY_RANK: Record<number, string> = {
  1: "Gold",
  2: "Silver",
  3: "Bronze",
};

function roundScore(n: number): number {
  return Math.round(n * 10) / 10;
}

export function formatLeaderboardTrend(delta: number): string {
  if (delta > 0) return `+${delta.toFixed(0)} pts`;
  if (delta < 0) return `${delta.toFixed(0)} pts`;
  return "No change";
}

export function leaderboardBadgeLabel(awardName: string, rank: number): string | null {
  const tier = BADGE_TIER_BY_RANK[rank];
  if (!tier) return null;
  return `${tier} ${awardName}`;
}

function keyStat(counts: ExecutionLeaderboardCounts, score: number): string {
  const observations = counts.observation_completed || 0;
  const evaluations = counts.evaluation_started || 0;
  return `${score.toFixed(0)} pts · ${observations} obs · ${evaluations} evals`;
}

export function buildLeaderboardCategoryBoards(args: {
  reps: ExecutionLeaderboardRepRow[];
  priorCountsByRep: Map<string, ExecutionLeaderboardCounts>;
  config: ExecutionLeaderboardConfig;
  priorPeriodLabel: string;
  selfUserId?: string | null;
}): LeaderboardBoardsResult {
  const { reps, priorCountsByRep, config, priorPeriodLabel, selfUserId } = args;

  const rows = reps.map((rep) => {
    const priorCounts = priorCountsByRep.get(rep.user_id);
    const priorOverall = priorCounts ? computeLeaderboardScoreFromCounts(priorCounts, config) : 0;
    const score = roundScore(rep.leaderboard_score);
    const trend = roundScore(score - priorOverall);

    return {
      user_id: rep.user_id,
      display_name: rep.display_name,
      score,
      key_stat: keyStat(rep.metrics, score),
      trend,
      trend_label: formatLeaderboardTrend(trend),
    };
  });

  rows.sort(
    (a, b) =>
      b.score - a.score ||
      b.trend - a.trend ||
      a.display_name.localeCompare(b.display_name),
  );

  const priorRows = reps
    .map((rep) => {
      const priorCounts = priorCountsByRep.get(rep.user_id);
      return {
        user_id: rep.user_id,
        score: priorCounts ? computeLeaderboardScoreFromCounts(priorCounts, config) : 0,
      };
    })
    .sort((a, b) => b.score - a.score || a.user_id.localeCompare(b.user_id));

  const priorRankByUserId = new Map<string, number>();
  priorRows.forEach((row, idx) => {
    if (row.score > 0) priorRankByUserId.set(row.user_id, idx + 1);
  });

  const entries: LeaderboardBoardEntry[] = rows.map((row, idx) => {
    const rank = idx + 1;
    const priorRank = priorRankByUserId.get(row.user_id) ?? null;
    const rankDelta = priorRank != null ? priorRank - rank : null;

    return {
      rank,
      user_id: row.user_id,
      display_name: row.display_name,
      score: row.score,
      key_stat: row.key_stat,
      trend: row.trend,
      trend_label: row.trend_label,
      badge_label: leaderboardBadgeLabel("Leader", rank),
      prior_rank: priorRank,
      rank_delta: rankDelta,
    };
  });

  const selfRank =
    selfUserId && entries.length ? (entries.find((e) => e.user_id === selfUserId)?.rank ?? null) : null;

  return {
    boards: [
      {
        id: "field_commander",
        title: SALES_EXECUTION_SCORE_LABEL,
        description: "Rankings by total points earned moving providers through the sales pathway.",
        award_name: "Leader",
        entries,
        self_rank: selfRank,
      },
    ],
    prior_period_label: priorPeriodLabel,
  };
}
