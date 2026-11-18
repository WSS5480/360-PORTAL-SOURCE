import type { EarnedAchievementBadge } from "@/lib/surgical-sales/executionAchievementBadges";
import type { ExecutionLeaderboardConfig } from "@/lib/surgical-sales/executionLeaderboardConfig";
import type { ExecutionLeaderboardCounts } from "@/lib/surgical-sales/executionLeaderboardMetrics";
import type { LeaderboardBoard } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import type { PathwayAchievementBadge } from "@/lib/surgical-sales/leaderboardPathwayBadges";
import type {
  PathwayRepScore,
  PathwayScoringGuideRow,
} from "@/lib/surgical-sales/leaderboardTransparentScoring";
import type { LeaderboardFilterOptions, LeaderboardTeamFilter } from "@/lib/surgical-sales/leaderboardTeamFilters";
import type { LeaderboardPeriodKey } from "@/lib/surgical-sales/leaderboardPeriod";

export type LeaderboardPortalRepRow = {
  rank: number;
  user_id: string;
  name: string;
  leaderboard_score: number;
  category_scores: Record<string, number>;
  metrics: ExecutionLeaderboardCounts;
  best_category: string;
  achievement_badges: EarnedAchievementBadge[];
  pathway_score: PathwayRepScore;
  pathway_badges: PathwayAchievementBadge[];
};

export type LeaderboardPortalResponse = {
  ok: boolean;
  demo?: boolean;
  /** True when the UI is showing in-memory demo mode (no production writes). */
  demo_mode?: boolean;
  generated_at?: string;
  period?: string;
  period_key?: LeaderboardPeriodKey;
  period_start?: string;
  period_end?: string;
  prior_period?: string;
  prior_period_start?: string;
  prior_period_end?: string;
  team_filter?: LeaderboardTeamFilter;
  filter_options?: LeaderboardFilterOptions;
  scoring_config?: ExecutionLeaderboardConfig;
  scoring_guide?: PathwayScoringGuideRow[];
  boards?: LeaderboardBoard[];
  rows?: LeaderboardPortalRepRow[];
  achievement_badges_by_rep?: Record<string, EarnedAchievementBadge[]>;
  self_user_id?: string;
  self_rank?: number | null;
  error?: string;
};
