import { EXECUTION_LEADERBOARD_CATEGORY_LABELS, type ExecutionLeaderboardCategory } from "@/lib/surgical-sales/executionLeaderboardConfig";

import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";

import type { ExecutionLeaderboardCategoryScores } from "@/lib/surgical-sales/executionLeaderboardMetrics";

import type { LeaderboardPeriodKey } from "@/lib/surgical-sales/leaderboardPeriod";

import type { LeaderboardTeamFilterType } from "@/lib/surgical-sales/leaderboardTeamFilters";



export type LeaderboardTabId = "overall";

export const LEADERBOARD_UI_TABS: Array<{ id: LeaderboardTabId; label: string; boardId: "field_commander" }> = [
  { id: "overall", label: "Overall", boardId: "field_commander" },
];

/** Primary portal views — competition vs personal performance. */
export type LeaderboardPageView = "leaderboard" | "scorecard";

export const LEADERBOARD_PAGE_VIEWS: Array<{ id: LeaderboardPageView; label: string }> = [
  { id: "leaderboard", label: "Leaderboard" },
  { id: "scorecard", label: "My Scorecard" },
];

/** Period filter pills — label copy is fixed for UI consistency. */
export const LEADERBOARD_PERIOD_FILTERS: Array<{ id: LeaderboardPeriodKey; label: string }> = [
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "quarter", label: "Quarter" },
  { id: "custom", label: "Custom" },
];

/** Team scope filter pills — label copy is fixed for UI consistency. */
export const LEADERBOARD_TEAM_FILTERS: Array<{ id: LeaderboardTeamFilterType; label: string }> = [
  { id: "all", label: "All Reps" },
  { id: "territory", label: "Territory" },
  { id: "region", label: "Region" },
  { id: "product_line", label: "Product Line" },
];



export function repInitials(name: string): string {

  const parts = String(name || "")

    .trim()

    .split(/\s+/)

    .filter(Boolean);

  if (parts.length === 0) return "?";

  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();

  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();

}



export function bestCategoryLabel(scores: ExecutionLeaderboardCategoryScores): string {

  const ranked = (Object.keys(scores) as ExecutionLeaderboardCategory[]).sort(

    (a, b) => (scores[b] || 0) - (scores[a] || 0),

  );

  const top = ranked[0];

  if (!top || (scores[top] || 0) <= 0) return "Provider Discovery";

  return EXECUTION_LEADERBOARD_CATEGORY_LABELS[top];

}



export function leaderboardMicrocopy(args: {

  entry: LeaderboardBoardEntry;

  rank: number;

}): string | null {

  const { entry, rank } = args;

  if (entry.trend >= 50) return "Rising Star";

  if (entry.trend >= 8) return "Hot Streak";

  if (entry.trend >= 3 && rank <= 5) return "Rising Fast";

  if (rank === 1) return "Top Rep";

  if (entry.trend <= -3) return "Recalibrating";

  if (entry.score <= 0) return "Building Momentum";

  return null;

}



export function scoreProgressPct(score: number, maxScore: number): number {

  if (maxScore <= 0) return 0;

  return Math.max(4, Math.min(100, Math.round((score / maxScore) * 100)));

}



export function trendArrow(trend: number): string {

  if (trend > 0) return "↑";

  if (trend < 0) return "↓";

  return "→";

}



export type LeaderboardStreakKind = "hot" | "rising" | "surge" | null;



export function leaderboardStreakKind(entry: LeaderboardBoardEntry): LeaderboardStreakKind {

  if (entry.trend >= 50) return "surge";

  if (entry.trend >= 8) return "hot";

  if (entry.trend >= 3) return "rising";

  return null;

}



export function streakLabel(kind: LeaderboardStreakKind): string | null {

  if (kind === "hot") return "Hot streak";

  if (kind === "surge") return "Rising star";

  if (kind === "rising") return "Building momentum";

  return null;

}



export function formatRankMovement(delta: number | null | undefined): string | null {

  if (delta == null || delta === 0) return null;

  if (delta > 0) return `▲ ${delta} rank${delta === 1 ? "" : "s"}`;

  return `▼ ${Math.abs(delta)} rank${Math.abs(delta) === 1 ? "" : "s"}`;

}

/** Compact table format: ↑2 or ↓1 */
export function formatRankMovementCompact(delta: number | null | undefined): string | null {
  if (delta == null || delta === 0) return null;
  if (delta > 0) return `↑${delta}`;
  return `↓${Math.abs(delta)}`;
}

export function rankMovementCompactClass(delta: number | null | undefined): string {
  if (delta == null || delta === 0) return "lb-rank-table-rank-move lb-rank-table-rank-move-flat";
  return delta > 0
    ? "lb-rank-table-rank-move lb-rank-table-rank-move-up"
    : "lb-rank-table-rank-move lb-rank-table-rank-move-down";
}



export function rankMovementClass(delta: number | null | undefined): string {

  if (delta == null || delta === 0) return "lb-rank-move lb-rank-move-flat";

  return delta > 0 ? "lb-rank-move lb-rank-move-up" : "lb-rank-move lb-rank-move-down";

}



export function awardTierFromLabel(label: string | null): "gold" | "silver" | "bronze" | null {

  if (!label) return null;

  if (label.startsWith("Gold")) return "gold";

  if (label.startsWith("Silver")) return "silver";

  if (label.startsWith("Bronze")) return "bronze";

  return null;

}

/** Primary badge for a leaderboard row: podium award, then streak, then top pathway milestone. */
export function showLeaderboardRowPrimaryAward(entry: LeaderboardBoardEntry): boolean {
  return Boolean(entry.badge_label);
}

export function showLeaderboardRowPrimaryStreak(entry: LeaderboardBoardEntry): boolean {
  if (entry.badge_label) return false;
  return leaderboardStreakKind(entry) != null;
}

export function showLeaderboardRowPrimaryPathway(pathwayBadgeCount: number, entry: LeaderboardBoardEntry): boolean {
  if (entry.badge_label) return false;
  if (leaderboardStreakKind(entry)) return false;
  return pathwayBadgeCount > 0;
}

/** Pathway badges that fit on a podium card (max two badges total including award). */
export function pickPodiumPathwayBadges<T extends { id: string }>(
  awardLabel: string | null,
  pathwayBadges: T[],
  maxTotal = 2,
): T[] {
  const slots = Math.max(0, maxTotal - (awardLabel ? 1 : 0));
  return pathwayBadges.slice(0, slots);
}

