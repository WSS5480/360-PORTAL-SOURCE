/**
 * 360 Medical Sales Pathway — canonical stage model (source of truth for rep workflow).
 *
 * Stages: Discovery → Observation → Debrief → Evaluation → Commitment → Outcomes
 * Note: 360 Experience is an Evaluation activity, not a pathway stage.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

export const SALES_PATHWAY_STAGE_IDS = [
  "discovery",
  "observe",
  "debrief",
  "evaluation",
  "commitment",
  "outcomes",
] as const;

export type SalesPathwayStageId = (typeof SALES_PATHWAY_STAGE_IDS)[number];

/** Legacy persisted/API values mapped to current stage ids. */
const LEGACY_SALES_PATHWAY_STAGE_IDS: Record<string, SalesPathwayStageId> = {
  experience: "evaluation",
};

export function normalizeSalesPathwayStageId(
  value: string | null | undefined,
): SalesPathwayStageId | null {
  const id = String(value ?? "").trim();
  if (!id) return null;
  if ((SALES_PATHWAY_STAGE_IDS as readonly string[]).includes(id)) {
    return id as SalesPathwayStageId;
  }
  return LEGACY_SALES_PATHWAY_STAGE_IDS[id] ?? null;
}

/** Minimum completed OR observations before product-led selling. */
export const SALES_PATHWAY_MIN_OBSERVATIONS = 5;

/** Minimum committed case target for commitment stage. */
export const SALES_PATHWAY_MIN_COMMITTED_CASES = 10;

/** Evaluation activity paths — not pathway stages. */
export const SALES_PATHWAY_EVALUATION_ACTIVITIES = [
  "Product Trial",
  "360 Experience",
  "In-Service",
  "Surgeon Education",
  "Additional Observation",
] as const;

export type SalesPathwayEvaluationActivity = (typeof SALES_PATHWAY_EVALUATION_ACTIVITIES)[number];

export function isSalesPathwayEvaluationActivity(
  value: string,
): value is SalesPathwayEvaluationActivity {
  return (SALES_PATHWAY_EVALUATION_ACTIVITIES as readonly string[]).includes(value);
}

/** Discovery gate — observation approval only; other access intel is optional. */
export const SALES_PATHWAY_DISCOVERY_MILESTONE_IDS = ["observation_approved"] as const;

export type SalesPathwayDiscoveryMilestoneId = (typeof SALES_PATHWAY_DISCOVERY_MILESTONE_IDS)[number];

export const SALES_PATHWAY_DISCOVERY_MILESTONE_LABELS: Record<SalesPathwayDiscoveryMilestoneId, string> = {
  observation_approved: "Observation permission confirmed",
};

/** Compact labels for discovery status on overview + mission board. */
export const SALES_PATHWAY_DISCOVERY_PROGRESS_LABELS: Record<SalesPathwayDiscoveryMilestoneId, string> = {
  observation_approved: "Permission Confirmed",
};

export const SALES_PATHWAY_STAGE_DEFINITIONS: Record<SalesPathwayStageId, string> = {
  discovery: "Get provider permission to observe before the first OR observation.",
  observe: "Complete observation cases, capture field intelligence, and observe workflow and pain points.",
  debrief: "Review findings with the provider, validate observations, and confirm product relevance.",
  evaluation:
    "Product trial, 360 experience, in-service, surgeon education, or additional observation.",
  commitment: "Provider agrees to evaluate or utilize product clinically.",
  outcomes: "Adoption, utilization, clinical outcomes, and business outcomes.",
};

export const SALES_PATHWAY_STAGE_LABELS: Record<SalesPathwayStageId, string> = {
  discovery: "Discovery",
  observe: "Observation",
  debrief: "Debrief",
  evaluation: "Evaluation",
  commitment: "Commitment",
  outcomes: "Outcomes",
};

export const SALES_PATHWAY_STAGE_SHORT_LABELS: Record<SalesPathwayStageId, string> = {
  discovery: "Discovery",
  observe: "Observation",
  debrief: "Debrief",
  evaluation: "Evaluation",
  commitment: "Commitment",
  outcomes: "Outcomes",
};

/** Mission board column headers — official 360 Medical Sales Pathway. */
export const SALES_PATHWAY_MISSION_BOARD_LABELS: Record<SalesPathwayStageId, string> = {
  discovery: "Discovery",
  observe: "Observation",
  debrief: "Debrief",
  evaluation: "Evaluation",
  commitment: "Commitment",
  outcomes: "Outcomes",
};

export const SALES_PATHWAY_STAGE_OBJECTIVES: Record<SalesPathwayStageId, string> = {
  discovery: "Secure observation approval.",
  observe: "Complete 5 observed cases.",
  debrief:
    "Review findings with the provider and validate whether a 360 Medical solution adds value.",
  evaluation:
    "Evaluate a product through Product Trial, 360 Experience, In-Service, Surgeon Education, or Additional Observation.",
  commitment: "Provider agrees to structured product use.",
  outcomes: "Track utilization, outcomes, and QTi.",
};

export const SALES_PATHWAY_WORKSPACE_IDS = [
  "discovery_mapping",
  "observation_tracking",
  "debrief_review",
  "evaluation_planning",
  "commitment_tracker",
  "outcomes_builder",
] as const;

export type SalesPathwayWorkspaceId = (typeof SALES_PATHWAY_WORKSPACE_IDS)[number];

/** @deprecated Use evaluation_planning */
export type LegacySalesPathwayWorkspaceId =
  | "surgeon_debrief_review"
  | "experience_planning"
  | "case_commitment_tracker"
  | "outcomes_qti_builder";

export const SALES_PATHWAY_STAGE_WORKSPACE: Record<SalesPathwayStageId, SalesPathwayWorkspaceId> = {
  discovery: "discovery_mapping",
  observe: "observation_tracking",
  debrief: "debrief_review",
  evaluation: "evaluation_planning",
  commitment: "commitment_tracker",
  outcomes: "outcomes_builder",
};

export const SALES_PATHWAY_WORKSPACE_LABELS: Record<SalesPathwayWorkspaceId, string> = {
  discovery_mapping: "Field intelligence",
  observation_tracking: "Observation tracking",
  debrief_review: "Debrief review",
  evaluation_planning: "Evaluation planning",
  commitment_tracker: "Commitment tracker",
  outcomes_builder: "Outcomes builder",
};

export const SALES_PATHWAY_STAGE_RANK: Record<SalesPathwayStageId, number> = {
  discovery: 0,
  observe: 1,
  debrief: 2,
  evaluation: 3,
  commitment: 4,
  outcomes: 5,
};

export function maxSalesPathwayStage(...stages: SalesPathwayStageId[]): SalesPathwayStageId {
  return stages.reduce((best, next) =>
    SALES_PATHWAY_STAGE_RANK[next] > SALES_PATHWAY_STAGE_RANK[best] ? next : best,
  );
}

export type PathwayIntelligenceSignalId =
  | "surgeon_relationship_owner"
  | "observation_approval"
  | "scheduling_owner"
  | "facility_access_requirements"
  | "credentialing_requirement"
  | "target_observation_dates"
  | "observed_case_count"
  | "procedure_types_observed"
  | "surgeon_workflow_preferences"
  | "staff_workflow_issues"
  | "patient_pathway_notes"
  | "recurring_clinical_challenges"
  | "notes_reviewed_with_surgeon"
  | "validated_pain_points"
  | "surgeon_confirmed_priorities"
  | "product_fit_signals"
  | "clinical_value_opportunity"
  | "evaluation_path_selected"
  | "evaluation_area_of_interest"
  | "clinical_expert_match"
  | "evaluation_scheduled_or_completed"
  | "evaluation_fit_notes"
  | "selected_product"
  | "committed_case_target"
  | "commitment_expectations_set"
  | "case_cadence"
  | "evaluation_plan"
  | "outcomes_to_track"
  | "outcomes_data_capture_plan"
  | "patient_outcomes_captured"
  | "referral_growth_story"
  | "qti_report_status";

export type PathwayIntelligenceSignalSpec = {
  id: PathwayIntelligenceSignalId;
  label: string;
  stageId: SalesPathwayStageId;
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
};

export const PATHWAY_INTELLIGENCE_BY_STAGE: Record<
  SalesPathwayStageId,
  readonly PathwayIntelligenceSignalSpec[]
> = {
  discovery: [
    {
      id: "surgeon_relationship_owner",
      label: "Surgeon relationship owner",
      stageId: "discovery",
      dbKey: "provider_decision_maker_status",
      sectionId: "relationship_intelligence",
    },
    {
      id: "observation_approval",
      label: "Observation approval",
      stageId: "discovery",
      dbKey: "provider_observation_feasibility",
      sectionId: "observation_readiness",
    },
    {
      id: "scheduling_owner",
      label: "Scheduling owner",
      stageId: "discovery",
      dbKey: "provider_scheduling_contact",
      sectionId: "observation_readiness",
    },
    {
      id: "facility_access_requirements",
      label: "Facility access requirements",
      stageId: "discovery",
      dbKey: "provider_observation_access_path",
      sectionId: "observation_readiness",
    },
    {
      id: "credentialing_requirement",
      label: "Credentialing requirement",
      stageId: "discovery",
      dbKey: "provider_observation_credentialing_needed",
      sectionId: "observation_readiness",
    },
    {
      id: "target_observation_dates",
      label: "Target observation dates",
      stageId: "discovery",
      dbKey: "provider_observation_best_days_case_types",
      sectionId: "observation_readiness",
    },
  ],
  observe: [
    {
      id: "observed_case_count",
      label: "Observed case count",
      stageId: "observe",
      dbKey: "observation_history",
      sectionId: "clinical_workflow",
    },
    {
      id: "procedure_types_observed",
      label: "Procedure types observed",
      stageId: "observe",
      dbKey: "provider_procedure_focus",
      sectionId: "clinical_workflow",
    },
    {
      id: "surgeon_workflow_preferences",
      label: "Surgeon workflow preferences",
      stageId: "observe",
      dbKey: "provider_technique_preferences",
      sectionId: "clinical_workflow",
    },
    {
      id: "staff_workflow_issues",
      label: "Staff workflow issues",
      stageId: "observe",
      dbKey: "provider_workflow_pain_points",
      sectionId: "clinical_workflow",
    },
    {
      id: "patient_pathway_notes",
      label: "Patient pathway notes",
      stageId: "observe",
      dbKey: "provider_workflow_pain_points",
      sectionId: "clinical_workflow",
    },
    {
      id: "recurring_clinical_challenges",
      label: "Recurring clinical / operational challenges",
      stageId: "observe",
      dbKey: "provider_workflow_pain_points",
      sectionId: "clinical_workflow",
    },
  ],
  debrief: [
    {
      id: "notes_reviewed_with_surgeon",
      label: "Notes reviewed with provider",
      stageId: "debrief",
      dbKey: "provider_rep_strategy_notes",
      sectionId: "relationship_intelligence",
    },
    {
      id: "validated_pain_points",
      label: "Validated pain points",
      stageId: "debrief",
      dbKey: "provider_workflow_pain_points",
      sectionId: "clinical_workflow",
    },
    {
      id: "surgeon_confirmed_priorities",
      label: "Provider-confirmed priorities",
      stageId: "debrief",
      dbKey: "provider_strategic_goal",
      sectionId: "relationship_intelligence",
    },
    {
      id: "product_fit_signals",
      label: "Product fit signals",
      stageId: "debrief",
      dbKey: "provider_preference_card_signals",
      sectionId: "commercial_signals",
    },
    {
      id: "clinical_value_opportunity",
      label: "Clinical value opportunity",
      stageId: "debrief",
      dbKey: "provider_evaluation_openness",
      sectionId: "commercial_signals",
    },
  ],
  evaluation: [
    {
      id: "evaluation_path_selected",
      label: "Evaluation path selected",
      stageId: "evaluation",
      dbKey: "provider_evaluation_openness",
      sectionId: "commercial_signals",
    },
    {
      id: "evaluation_area_of_interest",
      label: "Area of interest",
      stageId: "evaluation",
      dbKey: "provider_procedure_focus",
      sectionId: "clinical_workflow",
    },
    {
      id: "clinical_expert_match",
      label: "Clinical expert match",
      stageId: "evaluation",
      dbKey: "provider_champion_potential",
      sectionId: "relationship_intelligence",
    },
    {
      id: "evaluation_scheduled_or_completed",
      label: "Evaluation activity scheduled or completed",
      stageId: "evaluation",
      dbKey: "provider_follow_up_approach",
      sectionId: "relationship_intelligence",
    },
    {
      id: "evaluation_fit_notes",
      label: "Evaluation fit notes",
      stageId: "evaluation",
      dbKey: "provider_rep_strategy_notes",
      sectionId: "relationship_intelligence",
    },
  ],
  commitment: [
    {
      id: "selected_product",
      label: "Selected product",
      stageId: "commitment",
      dbKey: "provider_preference_card_signals",
      sectionId: "commercial_signals",
    },
    {
      id: "committed_case_target",
      label: "Committed case target",
      stageId: "commitment",
      dbKey: "provider_case_volume_estimate",
      sectionId: "clinical_workflow",
    },
    {
      id: "commitment_expectations_set",
      label: "Expectations set",
      stageId: "commitment",
      dbKey: "provider_follow_up_approach",
      sectionId: "relationship_intelligence",
    },
    {
      id: "case_cadence",
      label: "Case cadence",
      stageId: "commitment",
      dbKey: "provider_observation_cadence_preference",
      sectionId: "observation_readiness",
    },
    {
      id: "evaluation_plan",
      label: "Evaluation plan",
      stageId: "commitment",
      dbKey: "provider_evaluation_openness",
      sectionId: "commercial_signals",
    },
  ],
  outcomes: [
    {
      id: "outcomes_to_track",
      label: "Outcomes to track",
      stageId: "outcomes",
      dbKey: "provider_strategic_goal",
      sectionId: "relationship_intelligence",
    },
    {
      id: "outcomes_data_capture_plan",
      label: "Data capture plan",
      stageId: "outcomes",
      dbKey: "provider_rep_strategy_notes",
      sectionId: "relationship_intelligence",
    },
    {
      id: "patient_outcomes_captured",
      label: "Clinical outcomes captured",
      stageId: "outcomes",
      dbKey: "provider_dissatisfaction_areas",
      sectionId: "commercial_signals",
    },
    {
      id: "referral_growth_story",
      label: "Adoption / utilization story",
      stageId: "outcomes",
      dbKey: "provider_champion_potential",
      sectionId: "relationship_intelligence",
    },
    {
      id: "qti_report_status",
      label: "Outcomes report status",
      stageId: "outcomes",
      dbKey: "provider_rep_strategy_notes",
      sectionId: "relationship_intelligence",
    },
  ],
};

export function pathwayIntelligenceForStage(
  stageId: SalesPathwayStageId,
): readonly PathwayIntelligenceSignalSpec[] {
  return PATHWAY_INTELLIGENCE_BY_STAGE[stageId];
}
