import type { ExecutionLeaderboardMetricKey } from "@/lib/surgical-sales/executionLeaderboardConfig";
import { ALL_PATHWAY_LEADERBOARD_METRICS } from "@/lib/surgical-sales/executionLeaderboardConfig";

export const LEADERBOARD_PATHWAY_PURPOSE =
  "Earn points by moving providers through the sales pathway — not by completing optional metadata.";

export type PathwayMetricAuditRow = {
  metric: ExecutionLeaderboardMetricKey;
  pathwayQuestion: string;
  rationale: string;
};

export const LEADERBOARD_PATHWAY_METRIC_AUDIT: PathwayMetricAuditRow[] = [
  {
    metric: "intro_call_completed",
    pathwayQuestion: "Did the rep advance provider discovery?",
    rationale: "Completed intro call with provider context.",
  },
  {
    metric: "observation_approved",
    pathwayQuestion: "Did the provider move into a scheduled observation?",
    rationale: "Observation case scheduled with provider and case date — not admin access metadata.",
  },
  {
    metric: "observation_completed",
    pathwayQuestion: "Did the rep complete a live observation?",
    rationale: "Completed field observation.",
  },
  {
    metric: "five_observations_completed",
    pathwayQuestion: "Did the provider complete the five-observation series?",
    rationale: "Milestone after five completed OR observations.",
  },
  {
    metric: "debrief_completed",
    pathwayQuestion: "Did the rep complete a provider debrief?",
    rationale: "Structured debrief after the observation series.",
  },
  {
    metric: "evaluation_started",
    pathwayQuestion: "Did the provider enter product evaluation?",
    rationale: "Active evaluation milestone — trial, 360 experience, in-service, or education.",
  },
  {
    metric: "commitment_secured",
    pathwayQuestion: "Did the provider commit to structured product use?",
    rationale: "Commercial commitment secured after evaluation.",
  },
  {
    metric: "product_support_case_completed",
    pathwayQuestion: "Did the rep close a product support case?",
    rationale: "Completed product support execution.",
  },
  {
    metric: "outcome_qti_started",
    pathwayQuestion: "Did outcomes or QTi tracking begin?",
    rationale: "Outcomes / QTi work started for a committed provider.",
  },
];

export function pathwayMetricAudit(
  metric: ExecutionLeaderboardMetricKey,
): PathwayMetricAuditRow | undefined {
  return LEADERBOARD_PATHWAY_METRIC_AUDIT.find((row) => row.metric === metric);
}

export function allScoredMetricsHaveAuditRecords(): boolean {
  return ALL_PATHWAY_LEADERBOARD_METRICS.every((metric) =>
    LEADERBOARD_PATHWAY_METRIC_AUDIT.some((row) => row.metric === metric),
  );
}
