import type { DebriefPrepareDesiredOutcome } from "@/lib/surgical-sales/engagements/debriefPrepareWorkspace";

export const DEBRIEF_COMPLETION_CONTEXT_KEY = "debrief_completion_context";
export const DEBRIEF_VALIDATION_RESULTS_KEY = "debrief_validation_results";
export const DEBRIEF_NEXT_STEP_KEY = "debrief_next_step";
export const DEBRIEF_VALIDATION_ANALYZED_AT_KEY = "debrief_validation_analyzed_at";

export type DebriefPatternValidationStatus = "confirmed" | "rejected" | "qualified" | "unmentioned";

/** Profile-side resolution for debrief findings. */
export type DebriefFindingProfileStatus = "confirmed_profile_fact" | "mentioned_only";

/** Commercial-side resolution for debrief findings. */
export type DebriefFindingCommercialStatus =
  | "mentioned_only"
  | "qualified_issue"
  | "rejected_issue"
  | "validated_pain_point"
  | "active_opportunity"
  | "no_active_opportunity";

/** @deprecated Prefer commercial_status. */
export type DebriefCommercialPainClassification =
  | "validated_pain_point"
  | "potential_future_opportunity"
  | "no_significant_issue_confirmed";

export type DebriefCompletionObservationPatternSnapshot = {
  label: string;
  normalizedKey: string;
  frequency: string;
  observationCount: number;
  totalObservationCount: number;
  priority: number;
};

/** Persisted snapshot slice — audit/reload friendly. */
export type DebriefCompletionContextSnapshot = {
  loadedAt: string;
  completedObservationCount: number;
  isPostObservationProviderDebrief: boolean;
  hypothesisText: string;
  desiredOutcome: DebriefPrepareDesiredOutcome | null;
  desiredOutcomeOther: string;
  primaryHypothesisPattern: DebriefCompletionObservationPatternSnapshot | null;
  observationPatterns: DebriefCompletionObservationPatternSnapshot[];
};

export type DebriefCompletionContext = {
  loadedAt: string;
  completedObservationCount: number;
  isPostObservationProviderDebrief: boolean;
  prepareWorkspace: import("@/lib/surgical-sales/engagements/debriefPrepareWorkspace").DebriefPrepareWorkspaceSnapshot | null;
  observationPatterns: import("@/lib/surgical-sales/engagements/debriefIntelligencePrioritization").DebriefPrioritizedPattern[];
  primaryHypothesisPattern: import("@/lib/surgical-sales/engagements/debriefIntelligencePrioritization").DebriefPrioritizedPattern | null;
  hypothesisText: string;
  desiredOutcome: DebriefPrepareDesiredOutcome | null;
  desiredOutcomeOther: string;
};

export type DebriefPatternValidationResult = {
  normalized_pattern_key: string;
  /** Clinically equivalent concepts share one canonical key after merge. */
  canonical_finding_key?: string;
  pattern_label: string;
  count: number;
  total: number;
  status: DebriefPatternValidationStatus;
  /** Commercial validation outcome for rep-facing review. */
  commercial_status?: DebriefFindingCommercialStatus | null;
  profile_status?: DebriefFindingProfileStatus | null;
  /** @deprecated Prefer commercial_status. */
  commercial_pain_classification?: DebriefCommercialPainClassification | null;
  provider_quote?: string;
  reason?: string;
  rep_accepted: boolean;
  recorded_at: string;
};

export type DebriefNextStepRecommendationId =
  | "evaluation"
  | "360_experience"
  | "follow_up"
  | "no_action"
  | "product_trial"
  | "opportunity_creation"
  | "other"
  | "unknown";

export type DebriefOpportunityStrength = "high" | "medium" | "low" | "none";
export type DebriefProviderInterest = "interested" | "curious" | "neutral" | "not_interested";

export type DebriefNextStepSnapshot = {
  recommendation: DebriefNextStepRecommendationId;
  label: string;
  detail?: string;
  evidence?: string;
  opportunity_strength: DebriefOpportunityStrength;
  provider_interest: DebriefProviderInterest;
  reason: string;
  recorded_at: string;
};
export type DebriefHypothesisValidationResult = {
  hypothesis_text: string;
  primary_pattern_label: string | null;
  status: DebriefPatternValidationStatus;
  evidence?: string;
  recorded_at: string;
};

export type DebriefValidationDebugItem = {
  pattern: string;
  result: string;
  evidence: string | null;
  reason?: string | null;
};

export type DebriefValidationDebugPayload = {
  patterns: DebriefValidationDebugItem[];
  hypothesis: DebriefValidationDebugItem | null;
  next_step: {
    recommendation: string;
    detail: string | null;
    evidence: string | null;
    opportunity_strength?: DebriefOpportunityStrength;
    provider_interest?: DebriefProviderInterest;
    reason?: string | null;
  };
};

export type DebriefProfileUpdateGroup =
  | "products_used"
  | "procedures_performed"
  | "volume_trends"
  | "contacts"
  | "facilities";

export type DebriefCommercialReviewLine = {
  label: string;
  detail?: string;
  evidence?: string;
};

export type DebriefCommercialNextStepOption = {
  id: DebriefNextStepRecommendationId;
  label: string;
};

export type DebriefCompletionCommercialReview = {
  whatWeLearned: string;
  whatChanged: string;
  whatShouldWeDoNext: string;
  providerProfileUpdates: Record<DebriefProfileUpdateGroup, DebriefCommercialReviewLine[]>;
  commercialFindings: {
    validatedPainPoints: DebriefCommercialReviewLine[];
    qualifiedPainPoints: DebriefCommercialReviewLine[];
    rejectedPainPoints: DebriefCommercialReviewLine[];
    opportunitiesIdentified: DebriefCommercialReviewLine[];
    opportunitiesRejected: DebriefCommercialReviewLine[];
  };
  recommendedNextStep: {
    selectedId: DebriefNextStepRecommendationId;
    selectedLabel: string;
    reason: string;
    options: DebriefCommercialNextStepOption[];
  };
};
