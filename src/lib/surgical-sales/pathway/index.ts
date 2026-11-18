/**
 * 360 Medical Sales Pathway — global rules layer.
 *
 * Import from here across Providers, Engagements, Cases, Intelligence,
 * Opportunities, Leaderboard, and Dashboard.
 */

export {
  SALES_PATHWAY_OFFICIAL_STAGE_ORDER,
  SALES_PATHWAY_STAGE_GOALS,
  SALES_PATHWAY_EVALUATION_ACTIVITY_LABELS,
  SALES_PATHWAY_TRANSITION_RULES,
  SALES_PATHWAY_NON_ADVANCING_EVENTS,
  isNonAdvancingPathwayEvent,
  nextSalesPathwayStage,
  salesPathwayStageGoal,
  type SalesPathwayEvaluationActivityLabel,
  type SalesPathwayNonAdvancingEvent,
} from "./salesPathwayRules";

export {
  resolveSalesPathwayStage,
  resolveSalesPathwayStageFromProviderRow,
  type ResolveSalesPathwayStageInput,
} from "./resolveSalesPathwayStage";

/** Re-export gate engine — implementation stays in pathwayStageGates for test stability. */
export {
  deriveGatedPathwayStage,
  isStageGateComplete,
  isDiscoveryReadyForObserve,
  isObserveStageComplete,
  isDebriefStageComplete,
  isEvaluationStageComplete,
  isCommitmentStageComplete,
  isOutcomesStageComplete,
  isProductSalesConversationAllowed,
  countObservedProcedures,
  hasObservationApproved,
  hasDebriefCompleted,
  hasProductFitSignal,
  hasProviderEvaluationInterest,
  hasProductFitValidated,
  hasExplicitProviderCommitment,
  hasObservationSequenceMarkedComplete,
  providerSkipsObservationSequence,
  countCommittedProductCases,
  type PathwayGateInput,
} from "@/lib/surgical-sales/pathwayStageGates";

export {
  evaluatePathwayAdvancement,
  explainWhyAtStage,
  explainStageExitBlocker,
  buildPathwayGateChecks,
  engagementOutcomeAdvancesPathway,
  debriefSignalMustNotAdvancePathway,
  PATHWAY_NON_ADVANCING_SIGNAL_KINDS,
  PATHWAY_CONTACT_OBSERVATION_SEQUENCE_COMPLETE,
  PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED,
  PATHWAY_CONTACT_COMMITMENT_CONFIRMED,
  type PathwayAdvancementEvaluation,
  type PathwayGateCheck,
} from "./pathwayStageAdvancement";

/** Canonical stage model */
export {
  SALES_PATHWAY_STAGE_IDS,
  SALES_PATHWAY_STAGE_LABELS,
  SALES_PATHWAY_STAGE_SHORT_LABELS,
  SALES_PATHWAY_STAGE_OBJECTIVES,
  SALES_PATHWAY_MIN_OBSERVATIONS,
  SALES_PATHWAY_MIN_COMMITTED_CASES,
  SALES_PATHWAY_EVALUATION_ACTIVITIES,
  normalizeSalesPathwayStageId,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";

export { deriveSalesPathwayState, type SalesPathwayState } from "@/lib/surgical-sales/deriveSalesPathwayState";

/** Required progression vs optional intelligence — platform rule. */
export {
  PATHWAY_PROGRESSION_POLICY_LEAD,
  SALES_PATHWAY_REQUIRED_STAGE_GATES,
  pathwayStageHardGateBlockers,
  isPathwayIntelligenceInformational,
  optionalIntelligenceAffectsProgression,
  observationProgressPercent,
  type PathwayHardGateBlocker,
} from "./pathwayProgressionPolicy";
