import type { LeaderboardCatalogMetricKey } from "@/lib/surgical-sales/leaderboardMetricCatalog";

/**
 * Sales Execution Score — rewards provider progression through the 360 Portal pathway.
 *
 * Discovery → Observation → Debrief → Evaluation → Commitment → Outcomes
 */

export const SALES_EXECUTION_SCORE_LABEL = "Sales Execution Score";

/** Short label for table headers and other tight layouts. */
export const SALES_EXECUTION_SCORE_COMPACT_LABEL = "Score";

export const EXECUTION_LEADERBOARD_CATEGORIES = [
  "provider_discovery",
  "observation_request",
  "observation",
  "observation_debrief",
  "evaluation",
  "commitment",
  "product_support_case",
  "outcomes",
] as const;

export type ExecutionLeaderboardCategory = (typeof EXECUTION_LEADERBOARD_CATEGORIES)[number];

export const PROVIDER_DISCOVERY_METRICS = ["intro_call_completed"] as const;

export const OBSERVATION_REQUEST_METRICS = ["observation_approved"] as const;

export const OBSERVATION_METRICS = ["observation_completed", "five_observations_completed"] as const;

export const OBSERVATION_DEBRIEF_METRICS = [
  "debrief_completed",
  "validated_intelligence_captured",
] as const;

export const EVALUATION_METRICS = ["evaluation_started"] as const;

export const COMMITMENT_METRICS = ["commitment_secured"] as const;

export const PRODUCT_SUPPORT_CASE_METRICS = ["product_support_case_completed"] as const;

export const OUTCOMES_METRICS = ["outcome_qti_started"] as const;

export type ProviderDiscoveryMetric = (typeof PROVIDER_DISCOVERY_METRICS)[number];
export type ObservationRequestMetric = (typeof OBSERVATION_REQUEST_METRICS)[number];
export type ObservationMetric = (typeof OBSERVATION_METRICS)[number];
export type ObservationDebriefMetric = (typeof OBSERVATION_DEBRIEF_METRICS)[number];
export type EvaluationMetric = (typeof EVALUATION_METRICS)[number];
export type CommitmentMetric = (typeof COMMITMENT_METRICS)[number];
export type ProductSupportCaseMetric = (typeof PRODUCT_SUPPORT_CASE_METRICS)[number];
export type OutcomesMetric = (typeof OUTCOMES_METRICS)[number];

export type ExecutionLeaderboardMetricKey =
  | ProviderDiscoveryMetric
  | ObservationRequestMetric
  | ObservationMetric
  | ObservationDebriefMetric
  | EvaluationMetric
  | CommitmentMetric
  | ProductSupportCaseMetric
  | OutcomesMetric;

export const ALL_PATHWAY_LEADERBOARD_METRICS: ExecutionLeaderboardMetricKey[] = [
  ...PROVIDER_DISCOVERY_METRICS,
  ...OBSERVATION_REQUEST_METRICS,
  ...OBSERVATION_METRICS,
  ...OBSERVATION_DEBRIEF_METRICS,
  ...EVALUATION_METRICS,
  ...COMMITMENT_METRICS,
  ...PRODUCT_SUPPORT_CASE_METRICS,
  ...OUTCOMES_METRICS,
];

export type ExecutionLeaderboardCategoryWeights = Record<ExecutionLeaderboardCategory, number>;

export type ExecutionLeaderboardMetricPoints = Record<ExecutionLeaderboardMetricKey, number>;

export type ExecutionLeaderboardConfig = {
  enabledMetrics: LeaderboardCatalogMetricKey[];
  categoryWeights: ExecutionLeaderboardCategoryWeights;
  metricPoints: ExecutionLeaderboardMetricPoints;
};

export const DEFAULT_ENABLED_LEADERBOARD_METRICS: ExecutionLeaderboardMetricKey[] =
  ALL_PATHWAY_LEADERBOARD_METRICS.filter((key) => key !== "validated_intelligence_captured");

export const DEFAULT_EXECUTION_LEADERBOARD_CATEGORY_WEIGHTS: ExecutionLeaderboardCategoryWeights = {
  provider_discovery: 1,
  observation_request: 1,
  observation: 1,
  observation_debrief: 1,
  evaluation: 1,
  commitment: 1,
  product_support_case: 1,
  outcomes: 1,
};

/** Nine pathway progression milestones — one Sales Execution Score. */
export const DEFAULT_EXECUTION_LEADERBOARD_METRIC_POINTS: ExecutionLeaderboardMetricPoints = {
  intro_call_completed: 10,
  observation_approved: 25,
  observation_completed: 50,
  five_observations_completed: 75,
  debrief_completed: 30,
  validated_intelligence_captured: 15,
  evaluation_started: 100,
  commitment_secured: 100,
  product_support_case_completed: 50,
  outcome_qti_started: 75,
};

export const DEFAULT_EXECUTION_LEADERBOARD_CONFIG: ExecutionLeaderboardConfig = {
  enabledMetrics: [...DEFAULT_ENABLED_LEADERBOARD_METRICS],
  categoryWeights: DEFAULT_EXECUTION_LEADERBOARD_CATEGORY_WEIGHTS,
  metricPoints: DEFAULT_EXECUTION_LEADERBOARD_METRIC_POINTS,
};

export type PartialExecutionLeaderboardConfig = {
  enabledMetrics?: LeaderboardCatalogMetricKey[];
  categoryWeights?: Partial<ExecutionLeaderboardCategoryWeights>;
  metricPoints?: Partial<ExecutionLeaderboardMetricPoints>;
};

export function isLeaderboardMetricEnabled(
  config: ExecutionLeaderboardConfig,
  key: ExecutionLeaderboardMetricKey,
): boolean {
  return config.enabledMetrics.includes(key);
}

export function effectiveLeaderboardMetricPoints(
  config: ExecutionLeaderboardConfig,
  key: ExecutionLeaderboardMetricKey,
): number {
  if (!isLeaderboardMetricEnabled(config, key)) return 0;
  return config.metricPoints[key] ?? 0;
}

export function mergeExecutionLeaderboardConfig(
  overrides?: PartialExecutionLeaderboardConfig | null,
): ExecutionLeaderboardConfig {
  const categoryWeights = {
    ...DEFAULT_EXECUTION_LEADERBOARD_CATEGORY_WEIGHTS,
    ...(overrides?.categoryWeights ?? {}),
  };
  const metricPoints = {
    ...DEFAULT_EXECUTION_LEADERBOARD_METRIC_POINTS,
    ...(overrides?.metricPoints ?? {}),
  };
  const enabledMetrics =
    overrides?.enabledMetrics && overrides.enabledMetrics.length > 0
      ? [...overrides.enabledMetrics]
      : [...DEFAULT_ENABLED_LEADERBOARD_METRICS];
  return { enabledMetrics, categoryWeights, metricPoints };
}

export function categoryMetrics(category: ExecutionLeaderboardCategory): readonly ExecutionLeaderboardMetricKey[] {
  switch (category) {
    case "provider_discovery":
      return PROVIDER_DISCOVERY_METRICS;
    case "observation_request":
      return OBSERVATION_REQUEST_METRICS;
    case "observation":
      return OBSERVATION_METRICS;
    case "observation_debrief":
      return OBSERVATION_DEBRIEF_METRICS;
    case "evaluation":
      return EVALUATION_METRICS;
    case "commitment":
      return COMMITMENT_METRICS;
    case "product_support_case":
      return PRODUCT_SUPPORT_CASE_METRICS;
    case "outcomes":
      return OUTCOMES_METRICS;
  }
}

export const EXECUTION_LEADERBOARD_METRIC_LABELS: Record<ExecutionLeaderboardMetricKey, string> = {
  intro_call_completed: "Intro Call Completed",
  observation_approved: "Observation Approved",
  observation_completed: "Observation Completed",
  five_observations_completed: "5 Observations Completed",
  debrief_completed: "Debrief Completed",
  validated_intelligence_captured: "Validated Intelligence Captured",
  evaluation_started: "Evaluation Started",
  commitment_secured: "Commitment Secured",
  product_support_case_completed: "Product Support Case Completed",
  outcome_qti_started: "Outcome/QTi Started",
};

export const EXECUTION_LEADERBOARD_CATEGORY_LABELS: Record<ExecutionLeaderboardCategory, string> = {
  provider_discovery: "Provider Discovery",
  observation_request: "Observation Request",
  observation: "Observation",
  observation_debrief: "Debrief",
  evaluation: "Evaluation",
  commitment: "Commitment",
  product_support_case: "Product Support",
  outcomes: "Outcomes",
};
