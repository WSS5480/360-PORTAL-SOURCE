/**
 * Observation case workflow fields — canonical definitions, labels, and ownership.
 *
 * Case workflow retains only what happened on THIS case (live notes, debrief, outcome, routing).
 * Provider profile retains persistent surgeon/org intelligence. Pre-Call Plan is on engagements.
 *
 * When ownership is ambiguous, the field stays on the case and `ownershipUncertain` is true
 * with a TODO in `ownershipNotes` (see promote / clinical discovery paths for provider copy).
 */

import type {
  WorkflowFieldFutureOwner,
  WorkflowFieldOwnershipEntry,
  WorkflowFieldRequiredRule,
} from "@/lib/surgical-sales/workflowFieldOwnershipMap";

export type ObservationCaseWorkflowStageId =
  | "setup"
  | "live"
  | "debrief"
  | "follow_up"
  | "routing";

export const OBSERVATION_CASE_STAGE_LABELS: Record<ObservationCaseWorkflowStageId, string> = {
  setup: "Case Setup",
  live: "Live Observation",
  debrief: "Debrief",
  follow_up: "Follow-Up",
  routing: "Outcome Routing",
};

export const OBSERVATION_CASE_STAGE_ORDER: ObservationCaseWorkflowStageId[] = [
  "setup",
  "live",
  "debrief",
  "follow_up",
  "routing",
];

export type ObservationCaseWorkflowFieldKey =
  | "live_observation_workflow"
  | "live_observation_clinical_pain_points"
  | "live_observation_surgeon_reactions"
  | "live_observation_product_fit"
  | "live_observation_competitors"
  | "live_observation_staff_process"
  | "live_observation_questions"
  | "live_observation_follow_up_items"
  | "debrief_key_findings"
  | "debrief_opportunity_score"
  | "debrief_recommended_next_stage"
  | "debrief_product_opportunity_identified"
  | "follow_up_needed"
  | "debrief_suggested_next_action"
  | "debrief_convert_to_product_support_case"
  | "related_opportunity_id";

export type ObservationCaseWorkflowFieldDef = {
  key: ObservationCaseWorkflowFieldKey;
  label: string;
  helper?: string;
  rows?: number;
  multiline?: boolean;
  inputKind?: "textarea" | "text";
  stage: ObservationCaseWorkflowStageId;
  recommendedFutureOwner: WorkflowFieldFutureOwner;
  remainsRequired: boolean;
  requiredRule: WorkflowFieldRequiredRule;
  /** True when the topic also exists on provider profile — field stays case-level until promoted. */
  ownershipUncertain?: boolean;
  ownershipNotes?: string;
};

export const OBSERVATION_CASE_WORKFLOW_FIELDS: readonly ObservationCaseWorkflowFieldDef[] = [
  {
    key: "live_observation_workflow",
    label: "Workflow observations",
    rows: 4,
    multiline: true,
    stage: "live",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "ui_progress_only",
    ownershipNotes: "What happened in the room during this procedure — not persistent workflow preferences.",
  },
  {
    key: "live_observation_clinical_pain_points",
    label: "Clinical pain points",
    rows: 4,
    multiline: true,
    stage: "live",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "ui_progress_only",
    ownershipUncertain: true,
    ownershipNotes:
      "TODO: Per-case clinical signals observed live. Recurring pain points belong on provider clinical discovery; use promote or case insight when pattern persists.",
  },
  {
    key: "live_observation_surgeon_reactions",
    label: "Surgeon reactions",
    rows: 4,
    multiline: true,
    stage: "live",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "ui_progress_only",
    ownershipNotes: "Surgeon reactions during this case — not general communication style (provider relationship).",
  },
  {
    key: "live_observation_product_fit",
    label: "Product fit observations",
    rows: 4,
    multiline: true,
    stage: "live",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "ui_progress_only",
    ownershipUncertain: true,
    ownershipNotes:
      "TODO: Products and fit observed on this case. Persistent product interests live on provider procedural profile.",
  },
  {
    key: "live_observation_competitors",
    label: "Competitor products seen",
    rows: 4,
    multiline: true,
    stage: "live",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "ui_progress_only",
    ownershipUncertain: true,
    ownershipNotes:
      "TODO: Competitors seen on this case. Long-term competitor usage patterns belong on provider profile (provider_competitive_products).",
  },
  {
    key: "live_observation_staff_process",
    label: "Staff/process observations",
    rows: 4,
    multiline: true,
    stage: "live",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "ui_progress_only",
    ownershipUncertain: true,
    ownershipNotes:
      "TODO: Room/team notes from this visit. Persistent OR team dynamics belong on provider planning (provider_or_team_dynamics).",
  },
  {
    key: "live_observation_questions",
    label: "Questions raised",
    rows: 4,
    multiline: true,
    stage: "live",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "ui_progress_only",
    ownershipNotes: "Questions raised during this case — not standing questions for future observations (provider planning).",
  },
  {
    key: "live_observation_follow_up_items",
    label: "Follow-up items",
    rows: 4,
    multiline: true,
    stage: "follow_up",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "ui_progress_only",
    ownershipNotes: "Follow-up items from this case. Also counted toward live stage progress in UI.",
  },
  {
    key: "debrief_key_findings",
    label: "Key findings",
    rows: 5,
    multiline: true,
    stage: "debrief",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "ui_progress_only",
    ownershipNotes: "Debrief summary for this observation case.",
  },
  {
    key: "debrief_opportunity_score",
    label: "Product fit score",
    inputKind: "text",
    stage: "debrief",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "none",
    ownershipUncertain: true,
    ownershipNotes:
      "TODO: Score for this case outcome (0–100). May inform linked opportunity; opportunity pipeline stage remains on opportunity record.",
  },
  {
    key: "debrief_suggested_next_action",
    label: "Suggested next action",
    rows: 4,
    multiline: true,
    stage: "follow_up",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "ui_progress_only",
    ownershipNotes: "Next action arising from this case debrief.",
  },
  {
    key: "follow_up_needed",
    label: "Follow-up needed",
    stage: "follow_up",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "none",
    ownershipNotes: "Boolean; also settable at case create.",
  },
  {
    key: "related_opportunity_id",
    label: "Related opportunity",
    stage: "routing",
    recommendedFutureOwner: "opportunity",
    remainsRequired: false,
    requiredRule: "none",
    ownershipNotes: "FK on case; opportunity record is system of record for pipeline.",
  },
  {
    key: "debrief_recommended_next_stage",
    label: "Recommended next stage",
    stage: "routing",
    recommendedFutureOwner: "opportunity",
    remainsRequired: false,
    requiredRule: "none",
    ownershipNotes: "SALES_STAGES enum; may move linked opportunity via case detail action.",
  },
  {
    key: "debrief_product_opportunity_identified",
    label: "Product fit identified",
    stage: "routing",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "none",
    ownershipNotes: "Boolean signal from this observation; opportunity qualification may follow.",
  },
  {
    key: "debrief_convert_to_product_support_case",
    label: "Convert to Product Support Case",
    stage: "routing",
    recommendedFutureOwner: "case",
    remainsRequired: false,
    requiredRule: "none",
    ownershipNotes: "Case outcome / type conversion for this observation.",
  },
] as const;

const FIELD_BY_KEY = new Map(OBSERVATION_CASE_WORKFLOW_FIELDS.map((f) => [f.key, f]));

export function getObservationCaseWorkflowField(
  key: ObservationCaseWorkflowFieldKey,
): ObservationCaseWorkflowFieldDef | undefined {
  return FIELD_BY_KEY.get(key);
}

/** Textarea/text fields rendered in case workflow accordions (excludes booleans and selects). */
export type ObservationCaseWorkflowTextFieldConfig = {
  key: ObservationCaseWorkflowFieldKey;
  label: string;
  helper?: string;
  rows?: number;
  multiline?: boolean;
  inputKind?: "textarea" | "text";
};

function toTextConfig(field: ObservationCaseWorkflowFieldDef): ObservationCaseWorkflowTextFieldConfig | null {
  if (field.key === "follow_up_needed") return null;
  if (field.key === "debrief_product_opportunity_identified") return null;
  if (field.key === "debrief_convert_to_product_support_case") return null;
  if (field.key === "related_opportunity_id") return null;
  if (field.key === "debrief_recommended_next_stage") return null;
  return {
    key: field.key,
    label: field.label,
    helper: field.helper,
    rows: field.rows,
    multiline: field.multiline,
    inputKind: field.inputKind,
  };
}

function fieldsForStage(stage: ObservationCaseWorkflowStageId): ObservationCaseWorkflowTextFieldConfig[] {
  return OBSERVATION_CASE_WORKFLOW_FIELDS.filter((f) => f.stage === stage)
    .map(toTextConfig)
    .filter((f): f is ObservationCaseWorkflowTextFieldConfig => f != null);
}

/** Pre-call / SMART goal fields live on engagements (see preCallPlanFields.ts). */
export const CASE_OBSERVATION_GOAL_FIELDS: ObservationCaseWorkflowTextFieldConfig[] = [];
export const OBSERVATION_LIVE_FIELDS = fieldsForStage("live");
export const OBSERVATION_LIVE_CORE_FIELDS = OBSERVATION_LIVE_FIELDS.filter(
  (f) => f.key !== "live_observation_follow_up_items",
);

export const OBSERVATION_DEBRIEF_TEXT_FIELDS = fieldsForStage("debrief");
export const OBSERVATION_FOLLOW_UP_TEXT_FIELDS = fieldsForStage("follow_up").filter(
  (f) => f.key === "live_observation_follow_up_items" || f.key === "debrief_suggested_next_action",
);

/** Map registry text fields to portal workflow subitem shape. */
export function toWorkflowTextFieldConfigs(
  fields: readonly ObservationCaseWorkflowTextFieldConfig[],
): ObservationCaseWorkflowTextFieldConfig[] {
  return [...fields];
}

export const CASE_OBSERVATION_GOAL_KEYS: ObservationCaseWorkflowFieldKey[] = [];
export const OBSERVATION_LIVE_KEYS = OBSERVATION_LIVE_FIELDS.map((f) => f.key);
export const OBSERVATION_DEBRIEF_CORE_KEYS: ObservationCaseWorkflowFieldKey[] = ["debrief_key_findings", "debrief_opportunity_score"];
export const OBSERVATION_FOLLOW_UP_KEYS: ObservationCaseWorkflowFieldKey[] = [
  "live_observation_follow_up_items",
  "follow_up_needed",
  "debrief_suggested_next_action",
];
export const OBSERVATION_ROUTING_KEYS: ObservationCaseWorkflowFieldKey[] = [
  "related_opportunity_id",
  "debrief_recommended_next_stage",
  "debrief_product_opportunity_identified",
  "debrief_convert_to_product_support_case",
];
export const OBSERVATION_DEBRIEF_KEYS: ObservationCaseWorkflowFieldKey[] = [
  ...OBSERVATION_DEBRIEF_CORE_KEYS,
  ...OBSERVATION_FOLLOW_UP_KEYS,
  ...OBSERVATION_ROUTING_KEYS,
];

/** All keys stored on surgical_sales_cases for the observation workflow (excludes legacy pre_observation_*). */
export const ACTIVE_OBSERVATION_CASE_WORKFLOW_FIELD_KEYS: ObservationCaseWorkflowFieldKey[] =
  OBSERVATION_CASE_WORKFLOW_FIELDS.map((f) => f.key);

export const OBSERVATION_CASE_WORKFLOW_AUDIT_LABELS: Record<string, string> = Object.fromEntries(
  OBSERVATION_CASE_WORKFLOW_FIELDS.map((f) => [f.key, f.label]),
);

export function observationCaseWorkflowOwnershipEntries(): WorkflowFieldOwnershipEntry[] {
  return OBSERVATION_CASE_WORKFLOW_FIELDS.map((field) => ({
    fieldKey: field.key,
    currentLabel: field.label,
    currentSection: `observation_${field.stage}` as WorkflowFieldOwnershipEntry["currentSection"],
    currentSectionLabel: OBSERVATION_CASE_STAGE_LABELS[field.stage],
    recommendedFutureOwner: field.recommendedFutureOwner,
    whereStoredToday: "surgical_sales_cases" as const,
    remainsRequired: field.remainsRequired,
    requiredRule: field.requiredRule,
    notes: [field.ownershipNotes, field.ownershipUncertain ? "Ownership kept on case (see ownershipUncertain)." : null]
      .filter(Boolean)
      .join(" "),
  }));
}

/** Case-owned keys only (excludes opportunity-owned routing fields for strict case UI lists). */
export const CASE_OWNED_OBSERVATION_WORKFLOW_KEYS = OBSERVATION_CASE_WORKFLOW_FIELDS.filter(
  (f) => f.recommendedFutureOwner === "case",
).map((f) => f.key);
