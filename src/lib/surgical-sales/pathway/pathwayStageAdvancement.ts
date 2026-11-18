/**

 * Strict pathway advancement — evidence gates only, with rep-facing explanations.

 */



import {

  SALES_PATHWAY_MIN_COMMITTED_CASES,

  SALES_PATHWAY_MIN_OBSERVATIONS,

  SALES_PATHWAY_STAGE_LABELS,

  type SalesPathwayStageId,

} from "@/lib/surgical-sales/salesPathwayCanonical";

import {

  countCommittedProductCases,

  countObservedProcedures,

  deriveGatedPathwayStage,

  hasDebriefCompleted,

  hasObservationApproved,

  hasObservationSequenceMarkedComplete,

  hasProductFitValidated,

  hasExplicitProviderCommitment,

  hasCompletedEvaluationActivity,

  isDiscoveryReadyForObserve,

  isObserveStageComplete,

  isDebriefStageComplete,

  isEvaluationStageComplete,

  isCommitmentStageComplete,

  providerSkipsObservationSequence,

  type PathwayGateInput,

} from "@/lib/surgical-sales/pathwayStageGates";

import { nextSalesPathwayStage } from "@/lib/surgical-sales/pathway/salesPathwayRules";



export {

  PATHWAY_CONTACT_COMMITMENT_CONFIRMED,

  PATHWAY_CONTACT_OBSERVATION_SEQUENCE_COMPLETE,

  PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED,

} from "@/lib/surgical-sales/pathway/pathwayContactFlags";



export const PATHWAY_NON_ADVANCING_SIGNAL_KINDS = [

  "positive_sentiment",

  "interest_signal",

  "implied_openness",

  "follow_up_needed",

  "conditional_access",

  "scheduling_lead_only",

  "credentialing_path_only",

  "engagement_created",

  "briefing_without_outcome",

] as const;



export type PathwayGateCheck = {

  id: string;

  label: string;

  met: boolean;

  detail: string;

};



export type PathwayAdvancementEvaluation = {

  currentStage: SalesPathwayStageId;

  /** Plain-language reason the provider is at this stage. */

  stageSummary: string;

  nextStage: SalesPathwayStageId | null;

  canAdvanceToNext: boolean;

  /** Why the next stage is blocked, when applicable. */

  blockedSummary: string | null;

  gateChecks: PathwayGateCheck[];

};



export {

  hasObservationSequenceMarkedComplete,

  hasProductFitValidated,

  hasExplicitProviderCommitment,

};



export const isDiscoveryReadyForObserveStrict = isDiscoveryReadyForObserve;

export const isObserveStageCompleteStrict = isObserveStageComplete;

export const canAdvanceFromDebriefToEvaluation = isDebriefStageComplete;

export const isDebriefStageCompleteStrict = isDebriefStageComplete;

export const canAdvanceFromEvaluationToCommitment = isEvaluationStageComplete;

export const isEvaluationStageCompleteStrict = isEvaluationStageComplete;

export const isCommitmentStageCompleteStrict = isCommitmentStageComplete;

export const deriveGatedPathwayStageStrict = deriveGatedPathwayStage;



function observationProgressDetail(input: PathwayGateInput): string {

  if (providerSkipsObservationSequence(input.contact)) {

    return "Customer — observation series is not required.";

  }

  if (hasObservationSequenceMarkedComplete(input.contact)) {

    return "Rep marked the observation sequence complete.";

  }

  const count = countObservedProcedures(input);

  return `${count} of ${SALES_PATHWAY_MIN_OBSERVATIONS} observations complete on file.`;

}



export function buildPathwayGateChecks(input: PathwayGateInput): PathwayGateCheck[] {

  const committedCount = countCommittedProductCases(input);



  return [

    {

      id: "observation_approved",

      label: "Observation approved",

      met: hasObservationApproved(input),

      detail: hasObservationApproved(input)

        ? "Observation Approved = Yes on file."

        : "Observation approval is not validated — interest or follow-up alone does not advance.",

    },

    {

      id: "observation_sequence",

      label: "Observation sequence complete",

      met: isObserveStageComplete(input),

      detail: observationProgressDetail(input),

    },

    {

      id: "debrief_completed",

      label: "Debrief completed",

      met: hasDebriefCompleted(input),

      detail: hasDebriefCompleted(input)

        ? "Provider debrief engagement marked complete."

        : "Complete the provider debrief before evaluation.",

    },

    {

      id: "product_fit_validated",

      label: "Product fit validated",

      met: hasProductFitValidated(input),

      detail: hasProductFitValidated(input)

        ? "Product fit validated on file — not sentiment or interest alone."

        : "Validate product fit after debrief; implied openness does not advance the stage.",

    },

    {

      id: "evaluation_or_commitment",

      label: "Product evaluation or commitment",

      met: isEvaluationStageComplete(input),

      detail: isEvaluationStageComplete(input)

        ? hasExplicitProviderCommitment(input)

          ? "Explicit provider commitment recorded."

          : "A product evaluation activity completed (360 Experience is optional)."

        : "Complete a product trial, in-service, education, additional observation, or record explicit commitment.",

    },

    {

      id: "commitment_cases",

      label: "Commitment case target",

      met: isCommitmentStageComplete(input),

      detail: `${committedCount} of ${SALES_PATHWAY_MIN_COMMITTED_CASES} committed product cases on file.`,

    },

  ];

}



export function explainStageExitBlocker(

  stageId: SalesPathwayStageId,

  input: PathwayGateInput,

): string {

  const nextLabel = nextSalesPathwayStage(stageId)

    ? SALES_PATHWAY_STAGE_LABELS[nextSalesPathwayStage(stageId)!]

    : "the next stage";



  switch (stageId) {

    case "discovery":

      return `${nextLabel} stays locked until Observation Approved = Yes is validated on file.`;

    case "observe":

      if (hasObservationSequenceMarkedComplete(input.contact)) {

        return `${nextLabel} unlocks when the rep confirms the observation sequence is complete.`;

      }

      return `${nextLabel} requires ${SALES_PATHWAY_MIN_OBSERVATIONS} completed observations (${countObservedProcedures(input)} of ${SALES_PATHWAY_MIN_OBSERVATIONS} on file), or a rep mark that the sequence is complete.`;

    case "debrief":

      if (!hasDebriefCompleted(input)) {

        return `${nextLabel} requires a completed provider debrief.`;

      }

      return `${nextLabel} requires validated product fit after debrief — positive sentiment, interest, or follow-up needed do not advance the stage.`;

    case "evaluation":

      return `${nextLabel} requires a completed product evaluation activity or explicit provider commitment (360 Experience is optional).`;

    case "commitment":

      return `${nextLabel} requires ${SALES_PATHWAY_MIN_COMMITTED_CASES} committed product-support cases on file.`;

    default:

      return `Complete ${SALES_PATHWAY_STAGE_LABELS[stageId]} work to progress.`;

  }

}



export function explainWhyAtStage(stageId: SalesPathwayStageId, input: PathwayGateInput): string {

  switch (stageId) {

    case "discovery":

      return hasObservationApproved(input)

        ? "Observation approval is validated — provider can move into Observation motion."

        : "Provider remains in Discovery until Observation Approved = Yes is on file.";

    case "observe":

      return isObserveStageComplete(input)

        ? "Observation requirements are met — prepare or run the provider debrief."

        : `Provider remains in Observation until ${SALES_PATHWAY_MIN_OBSERVATIONS} cases are complete or the rep marks the sequence complete.`;

    case "debrief":

      if (!hasDebriefCompleted(input)) {

        return "Provider remains in Debrief until the debrief engagement is completed.";

      }

      if (!hasProductFitValidated(input)) {

        return "Debrief is complete, but product fit is not validated yet — stage stays in Debrief until fit is confirmed.";

      }

      return "Debrief and product fit are validated — provider can enter Evaluation.";

    case "evaluation":

      return isEvaluationStageComplete(input)

        ? "Evaluation requirements are met — track Case Commitment."

        : "Provider remains in Evaluation until a product evaluation activity completes or commitment is explicit.";

    case "commitment":

      return isCommitmentStageComplete(input)

        ? "Commitment case target met — outcomes tracking is active."

        : `Provider remains in Case Commitment until ${SALES_PATHWAY_MIN_COMMITTED_CASES} product cases are on file.`;

    default:

      return "Outcomes tracking is the active pathway stage.";

  }

}



function canAdvanceFromStage(stageId: SalesPathwayStageId, input: PathwayGateInput): boolean {

  switch (stageId) {

    case "discovery":

      return isDiscoveryReadyForObserve(input);

    case "observe":

      return isObserveStageComplete(input);

    case "debrief":

      return isDebriefStageComplete(input);

    case "evaluation":

      return isEvaluationStageComplete(input);

    case "commitment":

      return isCommitmentStageComplete(input);

    case "outcomes":

      return false;

    default:

      return false;

  }

}



export function evaluatePathwayAdvancement(input: PathwayGateInput): PathwayAdvancementEvaluation {

  const currentStage = deriveGatedPathwayStage(input);

  const nextStage = nextSalesPathwayStage(currentStage);

  const canAdvanceToNext = nextStage ? canAdvanceFromStage(currentStage, input) : false;



  return {

    currentStage,

    stageSummary: explainWhyAtStage(currentStage, input),

    nextStage,

    canAdvanceToNext,

    blockedSummary: canAdvanceToNext ? null : explainStageExitBlocker(currentStage, input),

    gateChecks: buildPathwayGateChecks(input),

  };

}



/** Events that must never auto-advance pathway stage. */

export function debriefSignalMustNotAdvancePathway(signalKind: string): boolean {

  const k = signalKind.trim().toLowerCase();

  if (k === "approval_signal") return false;

  return (

    k === "interest_signal" ||

    k === "inferred_signal" ||

    k === "confirmed_fact" ||

    k === "confirmed_contact" ||

    k === "mentioned_person" ||

    k === "product_interest" ||

    k === "completed_action" ||

    k === "unknown" ||

    k === "next_step" ||

    k === "pain_point"

  );

}



export type PathwayAdvancementFromEngagementInput = {

  outcomeId?: string | null;

  engagementType?: string | null;

  debriefCompleted?: boolean;

};



/** Engagement/debrief outcomes alone never advance pathway — gates recompute from provider evidence. */

export function engagementOutcomeAdvancesPathway(_input: PathwayAdvancementFromEngagementInput): false {

  return false;

}


