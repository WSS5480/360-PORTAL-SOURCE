import {
  ALL_PATHWAY_LEADERBOARD_METRICS,
  DEFAULT_EXECUTION_LEADERBOARD_METRIC_POINTS,
  EXECUTION_LEADERBOARD_CATEGORY_LABELS,
  EXECUTION_LEADERBOARD_METRIC_LABELS,
  type ExecutionLeaderboardCategory,
  type ExecutionLeaderboardMetricKey,
} from "@/lib/surgical-sales/executionLeaderboardConfig";
export type LeaderboardMetricCaptureStatus = "wired" | "planned";

export const LEADERBOARD_EXTENSION_METRIC_KEYS = [
  "or_visit_completed",
  "post_case_follow_up_completed",
  "guided_intelligence_finding",
  "observation_note_captured",
  "debrief_intelligence_applied",
  "pre_call_plan_prepared",
  "case_documentation_complete",
  "provider_relationship_advanced",
  "opportunity_pipeline_advance",
  "clinical_discovery_answer",
  "case_rescheduled_recovered",
  "product_demo_completed",
] as const;

export type LeaderboardExtensionMetricKey = (typeof LEADERBOARD_EXTENSION_METRIC_KEYS)[number];

export type LeaderboardCatalogMetricKey = ExecutionLeaderboardMetricKey | LeaderboardExtensionMetricKey;

export type LeaderboardCatalogMetric = {
  key: LeaderboardCatalogMetricKey;
  label: string;
  description: string;
  category: ExecutionLeaderboardCategory;
  captureStatus: LeaderboardMetricCaptureStatus;
  defaultPoints: number;
  dataSource: string;
};

const EXTENSION_METRIC_DEFINITIONS: LeaderboardCatalogMetric[] = [
  {
    key: "or_visit_completed",
    label: "OR Visit Completed",
    description: "Completed OR field visit engagement tied to a provider.",
    category: "evaluation",
    captureStatus: "planned",
    defaultPoints: 40,
    dataSource: "surgical_sales_engagements (or_visit)",
  },
  {
    key: "post_case_follow_up_completed",
    label: "Post-Case Follow-Up Completed",
    description: "Completed post-case follow-up engagement linked to a support case.",
    category: "product_support_case",
    captureStatus: "planned",
    defaultPoints: 35,
    dataSource: "surgical_sales_engagements (post_case_follow_up)",
  },
  {
    key: "guided_intelligence_finding",
    label: "Guided Intelligence Finding",
    description: "Structured intelligence finding saved through guided capture (not bulk freeform).",
    category: "observation_debrief",
    captureStatus: "planned",
    defaultPoints: 10,
    dataSource: "provider intelligence capture API",
  },
  {
    key: "observation_note_captured",
    label: "Observation Note Captured",
    description: "Observation or product-support note with extracted clinical entities.",
    category: "observation",
    captureStatus: "planned",
    defaultPoints: 12,
    dataSource: "sales_operational_notes + AI extraction",
  },
  {
    key: "debrief_intelligence_applied",
    label: "Debrief Intelligence Applied",
    description: "Rep accepted and applied debrief intelligence to the provider profile.",
    category: "observation_debrief",
    captureStatus: "planned",
    defaultPoints: 20,
    dataSource: "engagement debrief workflow + log-update",
  },
  {
    key: "pre_call_plan_prepared",
    label: "Pre-Call Plan Prepared",
    description: "Meeting prepared with a pre-call plan before an engagement.",
    category: "provider_discovery",
    captureStatus: "planned",
    defaultPoints: 8,
    dataSource: "engagement meeting_prepared + pre-call templates",
  },
  {
    key: "case_documentation_complete",
    label: "Case Documentation Complete",
    description: "Case closed with required PO and invoice documentation in place.",
    category: "product_support_case",
    captureStatus: "planned",
    defaultPoints: 25,
    dataSource: "surgical_sales_cases + case documents",
  },
  {
    key: "provider_relationship_advanced",
    label: "Provider Relationship Advanced",
    description: "Provider relationship stage progressed (e.g. discovery → evaluation).",
    category: "evaluation",
    captureStatus: "planned",
    defaultPoints: 30,
    dataSource: "surgical_sales_contacts.relationship_stage",
  },
  {
    key: "opportunity_pipeline_advance",
    label: "Opportunity Pipeline Advance",
    description: "Opportunity advanced with provider, product, and field evidence attached.",
    category: "commitment",
    captureStatus: "planned",
    defaultPoints: 45,
    dataSource: "sales_opportunities + unified_activity_events",
  },
  {
    key: "clinical_discovery_answer",
    label: "Clinical Discovery Answer",
    description: "Structured clinical discovery question answered for a provider.",
    category: "provider_discovery",
    captureStatus: "planned",
    defaultPoints: 10,
    dataSource: "provider_clinical_discovery answers",
  },
  {
    key: "case_rescheduled_recovered",
    label: "Rescheduled Case Recovered",
    description: "Observation case rescheduled after delay and completed in the field.",
    category: "observation",
    captureStatus: "planned",
    defaultPoints: 20,
    dataSource: "surgical_sales_cases (rescheduled lifecycle)",
  },
  {
    key: "product_demo_completed",
    label: "Product Demo Completed",
    description: "Completed product demo engagement with provider context.",
    category: "evaluation",
    captureStatus: "planned",
    defaultPoints: 50,
    dataSource: "surgical_sales_engagements (product_demo)",
  },
];

const WIRED_METRIC_DATA_SOURCES: Record<ExecutionLeaderboardMetricKey, string> = {
  intro_call_completed: "surgical_sales_engagements (intro_call)",
  observation_approved: "surgical_sales_cases (observation scheduled)",
  observation_completed: "surgical_sales_cases (observation completed)",
  five_observations_completed: "surgical_sales_cases (5 obs per provider milestone)",
  debrief_completed: "surgical_sales_engagements (provider_debrief)",
  validated_intelligence_captured: "observation notes + promoted intelligence (partial wiring)",
  evaluation_started: "engagements + unified_activity_events (EVALUATION_ACTIVE)",
  commitment_secured: "provider activities + unified_activity_events (OPPORTUNITY_WON)",
  product_support_case_completed: "surgical_sales_cases (product_support)",
  outcome_qti_started: "provider activities + unified_activity_events (OUTCOMES/QTI)",
};

const WIRED_METRIC_DESCRIPTIONS: Record<ExecutionLeaderboardMetricKey, string> = {
  intro_call_completed: "Completed intro call with provider context.",
  observation_approved: "Observation case scheduled with provider and case date.",
  observation_completed: "Live observation case completed in the field.",
  five_observations_completed: "Provider reached five completed OR observations.",
  debrief_completed: "Structured provider debrief completed after observation series.",
  validated_intelligence_captured:
    "Validated clinical, workflow, competitor, or product signal captured from field notes.",
  evaluation_started: "Provider entered active product evaluation.",
  commitment_secured: "Provider agreed to structured product use.",
  product_support_case_completed: "Product support case completed for a provider.",
  outcome_qti_started: "Outcomes tracking or QTi work started for a committed provider.",
};

function metricCategory(key: ExecutionLeaderboardMetricKey): ExecutionLeaderboardCategory {
  if (key === "intro_call_completed") return "provider_discovery";
  if (key === "observation_approved") return "observation_request";
  if (key === "observation_completed" || key === "five_observations_completed") return "observation";
  if (key === "debrief_completed" || key === "validated_intelligence_captured") return "observation_debrief";
  if (key === "evaluation_started") return "evaluation";
  if (key === "commitment_secured") return "commitment";
  if (key === "product_support_case_completed") return "product_support_case";
  return "outcomes";
}

function wiredMetricDefinition(key: ExecutionLeaderboardMetricKey): LeaderboardCatalogMetric {
  const captureStatus: LeaderboardMetricCaptureStatus =
    key === "validated_intelligence_captured" ? "planned" : "wired";

  return {
    key,
    label: EXECUTION_LEADERBOARD_METRIC_LABELS[key],
    description: WIRED_METRIC_DESCRIPTIONS[key],
    category: metricCategory(key),
    captureStatus,
    defaultPoints: DEFAULT_EXECUTION_LEADERBOARD_METRIC_POINTS[key],
    dataSource: WIRED_METRIC_DATA_SOURCES[key],
  };
}

export const LEADERBOARD_WIRED_METRICS: LeaderboardCatalogMetric[] =
  ALL_PATHWAY_LEADERBOARD_METRICS.map(wiredMetricDefinition);

export const LEADERBOARD_EXTENSION_METRICS: LeaderboardCatalogMetric[] = EXTENSION_METRIC_DEFINITIONS;

export const LEADERBOARD_CATALOG_METRICS: LeaderboardCatalogMetric[] = [
  ...LEADERBOARD_WIRED_METRICS,
  ...LEADERBOARD_EXTENSION_METRICS,
];

const CATALOG_BY_KEY = new Map(LEADERBOARD_CATALOG_METRICS.map((metric) => [metric.key, metric]));

export function isLeaderboardCatalogMetricKey(value: string): value is LeaderboardCatalogMetricKey {
  return CATALOG_BY_KEY.has(value as LeaderboardCatalogMetricKey);
}

export function getLeaderboardCatalogMetric(key: LeaderboardCatalogMetricKey): LeaderboardCatalogMetric {
  const metric = CATALOG_BY_KEY.get(key);
  if (!metric) throw new Error(`Unknown leaderboard metric: ${key}`);
  return metric;
}

export function categoryLabel(category: ExecutionLeaderboardCategory): string {
  return EXECUTION_LEADERBOARD_CATEGORY_LABELS[category];
}
