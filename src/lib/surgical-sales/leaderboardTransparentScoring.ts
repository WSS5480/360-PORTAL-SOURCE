import type {
  ExecutionLeaderboardConfig,
  ExecutionLeaderboardMetricKey,
} from "@/lib/surgical-sales/executionLeaderboardConfig";
import {
  effectiveLeaderboardMetricPoints,
  EXECUTION_LEADERBOARD_METRIC_LABELS,
  SALES_EXECUTION_SCORE_LABEL,
} from "@/lib/surgical-sales/executionLeaderboardConfig";
import type { ExecutionLeaderboardCounts } from "@/lib/surgical-sales/executionLeaderboardMetrics";

export { SALES_EXECUTION_SCORE_LABEL };

/** One-line summary for the collapsed scoring help on the leaderboard. */
export const LEADERBOARD_SCORING_GUIDE_SUMMARY =
  "You earn points by moving providers through the sales pathway — not by filling optional metadata.";

export type PathwayActivityId =
  | "intro_call_completed"
  | "observation_approved"
  | "observation_completed"
  | "five_observations_completed"
  | "debrief_completed"
  | "evaluation_started"
  | "commitment_secured"
  | "product_support_case_completed"
  | "outcome_qti_started";

export type PathwayScoringActivity = {
  id: string;
  label: string;
  description: string;
  metricKey: ExecutionLeaderboardMetricKey;
};

export const PATHWAY_SCORING_ACTIVITIES: PathwayScoringActivity[] = [
  {
    id: "intro_call_completed",
    label: "Intro Call Completed",
    description: "Completed intro call with provider context.",
    metricKey: "intro_call_completed",
  },
  {
    id: "observation_approved",
    label: "Observation Approved",
    description: "Observation case scheduled with provider and case date.",
    metricKey: "observation_approved",
  },
  {
    id: "observation_completed",
    label: "Observation Completed",
    description: "Live observation case completed in the field.",
    metricKey: "observation_completed",
  },
  {
    id: "five_observations_completed",
    label: "5 Observations Completed",
    description: "Provider reached five completed OR observations.",
    metricKey: "five_observations_completed",
  },
  {
    id: "debrief_completed",
    label: "Debrief Completed",
    description: "Structured provider debrief completed after observation series.",
    metricKey: "debrief_completed",
  },
  {
    id: "evaluation_started",
    label: "Evaluation Started",
    description: "Provider entered active product evaluation.",
    metricKey: "evaluation_started",
  },
  {
    id: "commitment_secured",
    label: "Commitment Secured",
    description: "Provider agreed to structured product use.",
    metricKey: "commitment_secured",
  },
  {
    id: "product_support_case_completed",
    label: "Product Support Case Completed",
    description: "Product support case completed for a provider.",
    metricKey: "product_support_case_completed",
  },
  {
    id: "outcome_qti_started",
    label: "Outcome/QTi Started",
    description: "Outcomes tracking or QTi work started for a committed provider.",
    metricKey: "outcome_qti_started",
  },
];

export type PathwayScoringGuideRow = {
  id: string;
  label: string;
  description: string;
  points: number;
  pointsLabel: string;
  pointsDisplay: string;
};

export function formatScoringGuidePoints(value: number): string {
  return `+${Math.round(value).toLocaleString("en-US")}`;
}

export type PathwayRepStats = {
  observations: number;
  evaluations: number;
  commitments: number;
};

export type PathwayRepScore = {
  total_points: number;
  stats: PathwayRepStats;
};

export function formatPathwayPoints(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function metricPoints(config: ExecutionLeaderboardConfig, key: ExecutionLeaderboardMetricKey): number {
  return effectiveLeaderboardMetricPoints(config, key);
}

export function enabledPathwayScoringActivities(config: ExecutionLeaderboardConfig): PathwayScoringActivity[] {
  const enabled = new Set(config.enabledMetrics);
  return PATHWAY_SCORING_ACTIVITIES.filter((activity) => enabled.has(activity.metricKey));
}

export function enabledScoringActivitiesForConfig(config: ExecutionLeaderboardConfig): PathwayScoringActivity[] {
  const fromPathway = enabledPathwayScoringActivities(config);
  const pathwayKeys = new Set(fromPathway.map((activity) => activity.metricKey));

  const extra: PathwayScoringActivity[] = [];
  for (const key of config.enabledMetrics) {
    if (pathwayKeys.has(key as ExecutionLeaderboardMetricKey)) continue;
    if (!(key in EXECUTION_LEADERBOARD_METRIC_LABELS)) continue;
    const metricKey = key as ExecutionLeaderboardMetricKey;
    extra.push({
      id: metricKey,
      label: EXECUTION_LEADERBOARD_METRIC_LABELS[metricKey],
      description: EXECUTION_LEADERBOARD_METRIC_LABELS[metricKey],
      metricKey,
    });
  }

  return [...fromPathway, ...extra];
}

export function computeMetricRawPoints(
  counts: ExecutionLeaderboardCounts,
  key: ExecutionLeaderboardMetricKey,
  config: ExecutionLeaderboardConfig,
): number {
  return (counts[key] || 0) * metricPoints(config, key);
}

export function computeSalesExecutionScore(
  counts: ExecutionLeaderboardCounts,
  config: ExecutionLeaderboardConfig,
): number {
  return enabledScoringActivitiesForConfig(config).reduce(
    (sum, activity) => sum + computeMetricRawPoints(counts, activity.metricKey, config),
    0,
  );
}

/** @deprecated Use computeSalesExecutionScore */
export function computePathwayTotalPoints(
  counts: ExecutionLeaderboardCounts,
  config: ExecutionLeaderboardConfig,
): number {
  return computeSalesExecutionScore(counts, config);
}

export function computePathwayRepScore(
  counts: ExecutionLeaderboardCounts,
  config: ExecutionLeaderboardConfig,
): PathwayRepScore {
  return {
    total_points: Math.round(computeSalesExecutionScore(counts, config)),
    stats: {
      observations: Math.round(counts.observation_completed || 0),
      evaluations: Math.round(counts.evaluation_started || 0),
      commitments: Math.round(counts.commitment_secured || 0),
    },
  };
}

export function buildPathwayScoringGuide(config: ExecutionLeaderboardConfig): PathwayScoringGuideRow[] {
  return enabledScoringActivitiesForConfig(config).map((activity) => {
    const points = metricPoints(config, activity.metricKey);
    return {
      id: activity.id,
      label: activity.label,
      description: activity.description,
      points,
      pointsLabel: `${points} pts`,
      pointsDisplay: formatScoringGuidePoints(points),
    };
  });
}

export type DetailCategoryScoreRow = {
  id: ExecutionLeaderboardMetricKey;
  label: string;
  count: number;
  points: number;
  percentOfTotal: number;
  percentLabel: string;
};

export type PersonalScoreBreakdown = {
  totalPoints: number;
  totalPointsLabel: string;
  categories: DetailCategoryScoreRow[];
};

export function computePersonalScoreBreakdown(
  counts: ExecutionLeaderboardCounts,
  config: ExecutionLeaderboardConfig,
): PersonalScoreBreakdown {
  const totalPoints = Math.round(computeSalesExecutionScore(counts, config));

  const categories = enabledScoringActivitiesForConfig(config).map((activity) => {
    const count = counts[activity.metricKey] || 0;
    const points = Math.round(computeMetricRawPoints(counts, activity.metricKey, config));
    const percentOfTotal = totalPoints > 0 ? (points / totalPoints) * 100 : 0;
    return {
      id: activity.metricKey,
      label: activity.label,
      count,
      points,
      percentOfTotal,
      percentLabel: totalPoints > 0 ? `${Math.round(percentOfTotal)}%` : "0%",
    };
  }).filter((row) => row.points > 0);

  return {
    totalPoints,
    totalPointsLabel: formatPathwayPoints(totalPoints),
    categories,
  };
}

export type RecentPointActivityItem = {
  activityId: PathwayActivityId;
  label: string;
  count: number;
  points: number;
  pointsDisplay: string;
};

const PATHWAY_ACTIVITY_PRIORITY: Record<PathwayActivityId, number> = Object.fromEntries(
  PATHWAY_SCORING_ACTIVITIES.map((activity, index) => [activity.id, index]),
) as Record<PathwayActivityId, number>;

export type ScorecardActivityRow = {
  id: string;
  label: string;
  count: number;
  pointsPerEvent: number;
  pointsEarned: number;
  pointsEarnedLabel: string;
};

/** All nine pathway activities for the scorecard table (includes zero-point rows). */
export function computeScorecardActivityRows(
  counts: ExecutionLeaderboardCounts,
  config: ExecutionLeaderboardConfig,
): ScorecardActivityRow[] {
  return enabledScoringActivitiesForConfig(config).map((activity) => {
    const count = counts[activity.metricKey] || 0;
    const pointsPerEvent = metricPoints(config, activity.metricKey);
    const pointsEarned = Math.round(computeMetricRawPoints(counts, activity.metricKey, config));
    return {
      id: activity.id,
      label: activity.label,
      count,
      pointsPerEvent,
      pointsEarned,
      pointsEarnedLabel: formatPathwayPoints(pointsEarned),
    };
  });
}

/** One line per scoring event (best available without event timestamps). */
export function buildRecentScoringEvents(
  counts: ExecutionLeaderboardCounts,
  config: ExecutionLeaderboardConfig,
  limit = 12,
): RecentPointActivityItem[] {
  const events: RecentPointActivityItem[] = [];

  for (const activity of [...PATHWAY_SCORING_ACTIVITIES].reverse()) {
    const count = Math.floor(counts[activity.metricKey] || 0);
    if (count <= 0) continue;

    const perEvent = Math.round(metricPoints(config, activity.metricKey));
    for (let i = 0; i < count; i++) {
      events.push({
        activityId: activity.id as PathwayActivityId,
        label: activity.label,
        count: 1,
        points: perEvent,
        pointsDisplay: formatScoringGuidePoints(perEvent),
      });
    }
  }

  return events.slice(0, limit);
}

export function buildRecentPointActivity(
  counts: ExecutionLeaderboardCounts,
  config: ExecutionLeaderboardConfig,
  limit = 8,
): RecentPointActivityItem[] {
  const items: RecentPointActivityItem[] = [];

  for (const activity of PATHWAY_SCORING_ACTIVITIES) {
    const count = counts[activity.metricKey] || 0;
    if (count <= 0) continue;

    const points = Math.round(computeMetricRawPoints(counts, activity.metricKey, config));
    if (points <= 0) continue;

    items.push({
      activityId: activity.id as PathwayActivityId,
      label: activity.label,
      count,
      points,
      pointsDisplay: formatScoringGuidePoints(points),
    });
  }

  return items
    .sort(
      (a, b) =>
        b.points - a.points ||
        PATHWAY_ACTIVITY_PRIORITY[a.activityId] - PATHWAY_ACTIVITY_PRIORITY[b.activityId],
    )
    .slice(0, limit);
}
