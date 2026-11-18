/**
 * Provider Debrief Plan — data model for converting observation intelligence
 * into a structured provider conversation plan.
 *
 * Generated automatically by buildProviderDebriefPlan(); persisted optionally
 * as ProviderDebriefPlanSnapshotV1 on engagements or case-linked artifacts.
 */

import type { ProviderLongitudinalIntelligence } from "@/lib/surgical-sales/buildProviderLongitudinalIntelligence";

export const PROVIDER_DEBRIEF_PLAN_VERSION = 1 as const;

export type ProviderDebriefPlanConfidence = "High" | "Medium" | "Low";

export type ProviderDebriefPlanLearningSource =
  | "observation_note"
  | "extracted_signal"
  | "quick_finding"
  | "validation_target"
  | "case_field"
  | "provider_profile"
  | "prior_observation";

export type ProviderDebriefPlanLearningCategory =
  | "clinical_pain_point"
  | "workflow_friction"
  | "competitive_usage"
  | "product_signal"
  | "staff_observation"
  | "procedure_insight";

export type ProviderDebriefPlanUnknownKind =
  | "unvalidated_target"
  | "open_question"
  | "clinical_gap"
  | "product_fit_unclear"
  | "competitive_context_missing";

export type ProviderDebriefPlanProductId = "ACSIS" | "Endolumik" | "future_opportunity";

export type ProviderDebriefPlanProductFitLevel =
  | "strong"
  | "possible"
  | "unlikely"
  | "unknown"
  | "needs_surgeon_confirmation";

export type ProviderDebriefPlanRecommendedAction =
  | "schedule_provider_debrief"
  | "confirm_product_fit_with_surgeon"
  | "create_adoption_initiative"
  | "schedule_product_support_case"
  | "capture_additional_observation_notes"
  | "update_provider_profile"
  | "no_action_yet";

export type ProviderDebriefPlanLearningItem = {
  id: string;
  category: ProviderDebriefPlanLearningCategory;
  signal: string;
  evidence: string | null;
  source: ProviderDebriefPlanLearningSource;
  confidence: ProviderDebriefPlanConfidence;
  sourceNoteId: string | null;
  sourceNoteTime: string | null;
};

export type ProviderDebriefPlanUnknownItem = {
  id: string;
  kind: ProviderDebriefPlanUnknownKind;
  question: string;
  rationale: string | null;
  priority: number;
};

export type ProviderDebriefPlanObjective = {
  id: string;
  text: string;
  derivedFrom: string[];
};

export type ProviderDebriefPlanSuggestedQuestion = {
  id: string;
  text: string;
  objectiveId: string | null;
  priority: number;
};

export type ProviderDebriefPlanProductAssessment = {
  product: ProviderDebriefPlanProductId;
  fitLevel: ProviderDebriefPlanProductFitLevel;
  fitRationale: string[];
  evidence: string[];
};

export type ProviderDebriefPlanMeetingOutcome = {
  primary: string;
  supporting: string[];
};

export type ProviderDebriefPlanNextStep = {
  action: ProviderDebriefPlanRecommendedAction;
  title: string;
  body: string;
  priority: number;
};

export type ProviderDebriefPlanSectionId =
  | "what_we_learned"
  | "what_we_still_dont_know"
  | "suggested_objectives"
  | "suggested_questions"
  | "product_opportunity_assessment"
  | "desired_meeting_outcome"
  | "recommended_next_step";

export type ProviderDebriefPlanContext = {
  caseId: string;
  providerId: string | null;
  providerName: string | null;
  facilityName: string | null;
  procedureLabel: string | null;
  caseDateLabel: string | null;
  observationMission: string | null;
};

export type ProviderDebriefPlan = {
  version: typeof PROVIDER_DEBRIEF_PLAN_VERSION;
  generatedAt: string;
  context: ProviderDebriefPlanContext;
  whatWeLearned: ProviderDebriefPlanLearningItem[];
  whatWeStillDontKnow: ProviderDebriefPlanUnknownItem[];
  suggestedObjectives: ProviderDebriefPlanObjective[];
  suggestedQuestions: ProviderDebriefPlanSuggestedQuestion[];
  productOpportunityAssessment: ProviderDebriefPlanProductAssessment[];
  desiredMeetingOutcome: ProviderDebriefPlanMeetingOutcome;
  recommendedNextStep: ProviderDebriefPlanNextStep;
  /** Secondary next steps when multiple paths are viable. */
  alternateNextSteps: ProviderDebriefPlanNextStep[];
  hasSufficientInputs: boolean;
  inputSummary: {
    noteCount: number;
    extractedSignalCount: number;
    validationTargetsObserved: number;
    validationTargetsPlanned: number;
    priorObservationCaseCount: number;
  };
  longitudinalIntelligence: ProviderLongitudinalIntelligence;
};

export type ProviderDebriefPlanSnapshotV1 = ProviderDebriefPlan & {
  sourceCaseId: string;
  sourceEngagementId: string | null;
};

export type ProviderDebriefPlanActivityInput = {
  id: string;
  activity_type: string;
  body: string;
  created_at: string;
  metadata_json?: Record<string, unknown> | null;
};

export type ProviderDebriefPlanInput = {
  caseRow: Record<string, unknown>;
  activities?: ProviderDebriefPlanActivityInput[];
  providerContact?: Record<string, unknown> | null;
  engagement?: Record<string, unknown> | null;
  facilityName?: string | null;
  providerName?: string | null;
  generatedAt?: string;
  /** Other observation cases for this provider — powers longitudinal debrief planning. */
  priorObservationCases?: Array<Record<string, unknown>>;
};
