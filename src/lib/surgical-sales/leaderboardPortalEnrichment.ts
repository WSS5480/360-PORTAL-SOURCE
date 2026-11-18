import type { ExecutionLeaderboardConfig } from "@/lib/surgical-sales/executionLeaderboardConfig";
import type { ExecutionLeaderboardCounts } from "@/lib/surgical-sales/executionLeaderboardMetrics";
import { computePathwayAchievementBadges } from "@/lib/surgical-sales/leaderboardPathwayBadges";
import type { LeaderboardPortalRepRow } from "@/lib/surgical-sales/leaderboardPortalTypes";
import {
  buildPathwayScoringGuide,
  computePathwayRepScore,
} from "@/lib/surgical-sales/leaderboardTransparentScoring";

export function enrichLeaderboardPortalRow(args: {
  rank: number;
  user_id: string;
  name: string;
  leaderboard_score: number;
  category_scores: Record<string, number>;
  metrics: ExecutionLeaderboardCounts;
  best_category: string;
  achievement_badges: LeaderboardPortalRepRow["achievement_badges"];
  config: ExecutionLeaderboardConfig;
}): LeaderboardPortalRepRow {
  return {
    rank: args.rank,
    user_id: args.user_id,
    name: args.name,
    leaderboard_score: args.leaderboard_score,
    category_scores: args.category_scores,
    metrics: args.metrics,
    best_category: args.best_category,
    achievement_badges: args.achievement_badges,
    pathway_score: computePathwayRepScore(args.metrics, args.config),
    pathway_badges: computePathwayAchievementBadges(args.metrics),
  };
}

export function buildLeaderboardPortalScoringPayload(config: ExecutionLeaderboardConfig) {
  return {
    scoring_config: config,
    scoring_guide: buildPathwayScoringGuide(config),
  };
}
