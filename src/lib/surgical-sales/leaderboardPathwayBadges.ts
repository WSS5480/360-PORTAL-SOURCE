import type { ExecutionLeaderboardCounts } from "@/lib/surgical-sales/executionLeaderboardMetrics";

export type PathwayAchievementBadgeId =
  | "field_investigator"
  | "debrief_driver"
  | "evaluation_leader"
  | "case_commander";

export type PathwayAchievementBadge = {
  id: PathwayAchievementBadgeId;
  title: string;
  shortLabel: string;
  description: string;
  requirement: string;
  accent: "cyan" | "gold" | "violet" | "emerald" | "teal" | "rose";
};

export type PathwayAchievementBadgeThresholds = {
  field_investigator_five_obs: number;
  debrief_driver_completed: number;
  evaluation_leader_started: number;
  case_commander_support_cases: number;
};

export const DEFAULT_PATHWAY_ACHIEVEMENT_BADGE_THRESHOLDS: PathwayAchievementBadgeThresholds = {
  field_investigator_five_obs: 1,
  debrief_driver_completed: 3,
  evaluation_leader_started: 1,
  case_commander_support_cases: 3,
};

/** Milestone badges — celebrate pathway success; never affect ranking. */
export const PATHWAY_ACHIEVEMENT_BADGE_DEFINITIONS: Record<PathwayAchievementBadgeId, PathwayAchievementBadge> = {
  field_investigator: {
    id: "field_investigator",
    title: "Field Investigator",
    shortLabel: "Investigator",
    description: "Completed the five-observation milestone with a provider.",
    requirement: "1 provider at 5 observations",
    accent: "cyan",
  },
  debrief_driver: {
    id: "debrief_driver",
    title: "Debrief Driver",
    shortLabel: "Debrief Driver",
    description: "Completed structured provider debriefs after observation series.",
    requirement: "3 debriefs completed",
    accent: "teal",
  },
  evaluation_leader: {
    id: "evaluation_leader",
    title: "Evaluation Leader",
    shortLabel: "Eval Leader",
    description: "Moved providers into active product evaluation.",
    requirement: "1 evaluation started",
    accent: "emerald",
  },
  case_commander: {
    id: "case_commander",
    title: "Case Commander",
    shortLabel: "Case Cmdr",
    description: "Executed product support cases through to completion.",
    requirement: "3 product support cases completed",
    accent: "rose",
  },
};

export const PATHWAY_ACHIEVEMENT_CATALOG = Object.values(PATHWAY_ACHIEVEMENT_BADGE_DEFINITIONS);

export type PathwayBadgeProgress = {
  id: PathwayAchievementBadgeId;
  label: string;
  current: number;
  target: number;
};

export function computePathwayAchievementBadges(
  counts: ExecutionLeaderboardCounts,
  thresholds: Partial<PathwayAchievementBadgeThresholds> = {},
): PathwayAchievementBadge[] {
  const t = { ...DEFAULT_PATHWAY_ACHIEVEMENT_BADGE_THRESHOLDS, ...thresholds };
  const earned: PathwayAchievementBadge[] = [];
  const fiveObs = counts.five_observations_completed || 0;
  const debriefs = counts.debrief_completed || 0;
  const evaluations = counts.evaluation_started || 0;
  const supportCases = counts.product_support_case_completed || 0;

  if (fiveObs >= t.field_investigator_five_obs) {
    earned.push(PATHWAY_ACHIEVEMENT_BADGE_DEFINITIONS.field_investigator);
  }
  if (debriefs >= t.debrief_driver_completed) {
    earned.push(PATHWAY_ACHIEVEMENT_BADGE_DEFINITIONS.debrief_driver);
  }
  if (evaluations >= t.evaluation_leader_started) {
    earned.push(PATHWAY_ACHIEVEMENT_BADGE_DEFINITIONS.evaluation_leader);
  }
  if (supportCases >= t.case_commander_support_cases) {
    earned.push(PATHWAY_ACHIEVEMENT_BADGE_DEFINITIONS.case_commander);
  }

  return earned;
}

/** Next milestone a rep is closest to earning — for engagement nudges. */
export function nearestPathwayBadgeProgress(
  counts: ExecutionLeaderboardCounts,
  thresholds: Partial<PathwayAchievementBadgeThresholds> = {},
): PathwayBadgeProgress | null {
  const t = { ...DEFAULT_PATHWAY_ACHIEVEMENT_BADGE_THRESHOLDS, ...thresholds };
  const earnedIds = new Set(computePathwayAchievementBadges(counts, t).map((b) => b.id));
  const fiveObs = counts.five_observations_completed || 0;
  const debriefs = counts.debrief_completed || 0;
  const evaluations = counts.evaluation_started || 0;
  const supportCases = counts.product_support_case_completed || 0;

  const candidates: PathwayBadgeProgress[] = [
    {
      id: "field_investigator",
      label: "Field Investigator",
      current: fiveObs,
      target: t.field_investigator_five_obs,
    },
    {
      id: "debrief_driver",
      label: "Debrief Driver",
      current: debriefs,
      target: t.debrief_driver_completed,
    },
    {
      id: "evaluation_leader",
      label: "Evaluation Leader",
      current: evaluations,
      target: t.evaluation_leader_started,
    },
    {
      id: "case_commander",
      label: "Case Commander",
      current: supportCases,
      target: t.case_commander_support_cases,
    },
  ];

  const incomplete = candidates.filter((c) => !earnedIds.has(c.id) && c.current < c.target);
  if (incomplete.length === 0) return null;
  incomplete.sort((a, b) => b.current / b.target - a.current / a.target);
  return incomplete[0] ?? null;
}

/** All milestone badges with progress — for scorecard badge progress section. */
export function listPathwayBadgeProgress(
  counts: ExecutionLeaderboardCounts,
  thresholds: Partial<PathwayAchievementBadgeThresholds> = {},
): PathwayBadgeProgress[] {
  const t = { ...DEFAULT_PATHWAY_ACHIEVEMENT_BADGE_THRESHOLDS, ...thresholds };
  const fiveObs = counts.five_observations_completed || 0;
  const debriefs = counts.debrief_completed || 0;
  const evaluations = counts.evaluation_started || 0;
  const supportCases = counts.product_support_case_completed || 0;

  return [
    {
      id: "field_investigator",
      label: "Field Investigator",
      current: fiveObs,
      target: t.field_investigator_five_obs,
    },
    {
      id: "debrief_driver",
      label: "Debrief Driver",
      current: debriefs,
      target: t.debrief_driver_completed,
    },
    {
      id: "evaluation_leader",
      label: "Evaluation Leader",
      current: evaluations,
      target: t.evaluation_leader_started,
    },
    {
      id: "case_commander",
      label: "Case Commander",
      current: supportCases,
      target: t.case_commander_support_cases,
    },
  ];
}
