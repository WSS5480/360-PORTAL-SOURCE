/**

 * Sales pathway — stage completion gates (canonical rules, no premature unlock).

 *

 * Rule definitions: @/lib/surgical-sales/pathway/salesPathwayRules

 * Progression policy (required gates vs optional intelligence): @/lib/surgical-sales/pathway/pathwayProgressionPolicy

 * Global API: @/lib/surgical-sales/pathway

 */



import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

import { hasProviderObservationApprovalOnFile } from "@/lib/surgical-sales/providerObservationApproval";
import {
  DISCOVERY_FIELD_STATUS,
  resolveDiscoveryStructuredSignalStatus,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import {
  PATHWAY_CONTACT_COMMITMENT_CONFIRMED,
  PATHWAY_CONTACT_EVALUATION_MARKED_SUCCESSFUL,
  PATHWAY_CONTACT_OBSERVATION_SEQUENCE_COMPLETE,
  PATHWAY_CONTACT_OUTCOMES_TRACKING_ACTIVE,
  PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED,
} from "@/lib/surgical-sales/pathway/pathwayContactFlags";

import { isProviderActiveCustomer } from "@/lib/surgical-sales/providerCommercialStatus";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";

import {
  isObservationCaseComplete,
  observationCountFromProviderContact,
} from "@/lib/surgical-sales/observationCaseCompletion";

import {

  SALES_PATHWAY_MIN_COMMITTED_CASES,

  SALES_PATHWAY_MIN_OBSERVATIONS,

  type SalesPathwayStageId,

} from "@/lib/surgical-sales/salesPathwayCanonical";



const OBSERVATION_ENGAGEMENT_TYPES = new Set([

  "or_visit",

  "or_observation",

]);



const SCHEDULED_OBSERVATION_STATUSES = new Set([

  "scheduled",

  "confirmed",

  "in_progress",

  "active",

  "booked",

  "planned",

]);



const EVALUATION_ENGAGEMENT_TYPES = new Set([

  "office_visit_360",

  "lab_visit",

  "peer_discussion",

  "product_demo",

  "evaluation_planning",

  "evaluation_follow_up",

  "in_service_training",

]);



const COMPLETED_ENGAGEMENT_STATUSES = new Set(["completed", "done", "closed"]);

const CANCELLED_STATUSES = new Set(["cancelled", "canceled"]);



export type PathwayGateEngagementRef = Pick<
  ProviderEngagementSummary,
  "id" | "engagement_type" | "status"
> & {
  debrief_completed?: boolean | null;
};

export type PathwayGateInput = {

  contact: Record<string, unknown>;

  engagements?: PathwayGateEngagementRef[];

  cases?: Array<Record<string, unknown>>;

};



function fieldReady(dbKey: string, contact: Record<string, unknown>): boolean {

  return (

    isIntelligenceFieldValidatedOnFile(dbKey, contact) ||

    fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined)

  );

}





export function countObservedProcedures(input: PathwayGateInput): number {

  const seen = new Set<string>();

  let count = 0;



  for (const row of input.cases ?? []) {

    if (String(row.case_type || "").toLowerCase() !== "observation") continue;

    // Canonical completion predicate — same source as observationProgramGate so
    // provider overview, pathway gating, and the Intelligence tab never disagree.
    if (!isObservationCaseComplete(row)) continue;

    const id = String(row.id || row.case_id || `case-${count}`);

    if (seen.has(id)) continue;

    seen.add(id);

    // A case migrated from (or linked to) a legacy observation engagement
    // carries engagement_id — mark it seen so the same OR day never counts
    // twice across the case and engagement namespaces (audit W6).
    const linkedEngagementId = String(row.engagement_id || "").trim();

    if (linkedEngagementId) seen.add(linkedEngagementId);

    count += 1;

  }



  for (const engagement of input.engagements ?? []) {

    const type = String(engagement.engagement_type || "").toLowerCase();

    if (!OBSERVATION_ENGAGEMENT_TYPES.has(type)) continue;

    if (!COMPLETED_ENGAGEMENT_STATUSES.has(String(engagement.status || "").toLowerCase())) continue;

    const id = String(engagement.id || `eng-${count}`);

    if (seen.has(id)) continue;

    seen.add(id);

    count += 1;

  }

  return Math.max(count, observationCountFromProviderContact(input.contact));

}



/** Milestone: observation approval validated on file. */

export function hasObservationApproved(input: PathwayGateInput): boolean {

  return hasProviderObservationApprovalOnFile(input.contact);

}



export function hasObservationScheduled(input: PathwayGateInput): boolean {

  for (const row of input.cases ?? []) {

    if (String(row.case_type || "").toLowerCase() !== "observation") continue;

    const status = String(row.status || "").toLowerCase();

    if (CANCELLED_STATUSES.has(status)) continue;

    return true;

  }



  for (const engagement of input.engagements ?? []) {

    const type = String(engagement.engagement_type || "").toLowerCase();

    if (!OBSERVATION_ENGAGEMENT_TYPES.has(type)) continue;

    const status = String(engagement.status || "").toLowerCase();

    if (CANCELLED_STATUSES.has(status)) continue;

    if (

      COMPLETED_ENGAGEMENT_STATUSES.has(status) ||

      SCHEDULED_OBSERVATION_STATUSES.has(status)

    ) {

      return true;

    }

  }



  return false;

}



/**

 * Discovery → Observation: Observation Approved = Yes only (validated on file).

 */

export function isDiscoveryReadyForObserve(input: PathwayGateInput): boolean {
  return hasObservationApproved(input);
}



function isTruthyContactFlag(contact: Record<string, unknown>, key: string): boolean {
  const raw = String(contact[key] ?? "")
    .trim()
    .toLowerCase();
  return raw === "yes" || raw === "true" || raw === "complete" || raw === "completed" || raw === "1";
}

export function hasObservationSequenceMarkedComplete(contact: Record<string, unknown>): boolean {
  return isTruthyContactFlag(contact, PATHWAY_CONTACT_OBSERVATION_SEQUENCE_COMPLETE);
}

/** Customers (and commercially active accounts) do not need the five-observation series. */
export function providerSkipsObservationSequence(contact: Record<string, unknown>): boolean {
  return isProviderActiveCustomer({
    commercialStatus: String(contact.provider_crm_status ?? ""),
    relationshipStage: String(contact.provider_relationship_stage ?? contact.relationship_stage ?? ""),
  });
}

/** Observe → Debrief: five completed observations, customer, or rep marks sequence complete. */
export function isObserveStageComplete(input: PathwayGateInput): boolean {
  return (
    providerSkipsObservationSequence(input.contact) ||
    countObservedProcedures(input) >= SALES_PATHWAY_MIN_OBSERVATIONS ||
    hasObservationSequenceMarkedComplete(input.contact)
  );
}



export function hasDebriefCompleted(input: PathwayGateInput): boolean {

  return (input.engagements ?? []).some((engagement) => {

    if (Boolean((engagement as { debrief_completed?: boolean }).debrief_completed)) return true;

    const type = String(engagement.engagement_type || "").toLowerCase();

    const status = String(engagement.status || "").toLowerCase();

    return (

      COMPLETED_ENGAGEMENT_STATUSES.has(status) &&

      (type.includes("debrief") || type === "provider_debrief")

    );

  });

}



/** Product fit signal captured during or after debrief. */

export function hasProductFitSignal(input: PathwayGateInput): boolean {

  const contact = input.contact;

  if (fieldReady("provider_preference_card_signals", contact)) return true;

  return fieldHasIntelligenceSignal(

    "provider_preference_card_signals",

    contact.provider_preference_card_signals as string | null | undefined,

  );

}



/** Provider expresses interest in evaluating a product. */

export function hasProviderEvaluationInterest(input: PathwayGateInput): boolean {

  const contact = input.contact;

  if (fieldReady("provider_evaluation_openness", contact)) return true;

  const raw = String(contact.provider_evaluation_openness ?? "").trim().toLowerCase();

  if (!raw) return false;

  return /evaluation|trial|interest|open|ready|demo|product/.test(raw);

}



/** Product fit validated on file — required for Debrief → Evaluation. */
export function hasProductFitValidated(input: PathwayGateInput): boolean {
  const contact = input.contact;
  if (isTruthyContactFlag(contact, PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED)) return true;

  if (
    resolveDiscoveryStructuredSignalStatus("product_alignment", contact) ===
    DISCOVERY_FIELD_STATUS.validated
  ) {
    return true;
  }

  if (isIntelligenceFieldValidatedOnFile("provider_preference_card_signals", contact)) {
    const text = String(contact.provider_preference_card_signals ?? "").toLowerCase();
    if (
      /\b(fit\s+validated|validated\s+fit|confirmed\s+fit|evidence\s+of\s+fit|product\s+fit\s+validated)\b/.test(
        text,
      )
    ) {
      return true;
    }
  }

  return false;
}

export function hasExplicitProviderCommitment(input: PathwayGateInput): boolean {
  const contact = input.contact;
  if (isTruthyContactFlag(contact, PATHWAY_CONTACT_COMMITMENT_CONFIRMED)) return true;

  const openness = String(contact.provider_evaluation_openness ?? "").trim().toLowerCase();
  if (openness === "committed" || openness === "commitment_confirmed") return true;

  const notes = `${contact.provider_rep_strategy_notes ?? ""} ${contact.provider_strategic_goal ?? ""}`.toLowerCase();
  if (/\bcommitted\s+to\s+(?:use|evaluate|trial|product)\b/.test(notes)) return true;

  return false;
}

/** Debrief → Evaluation: debrief completed and product fit validated. */
export function isDebriefStageComplete(input: PathwayGateInput): boolean {
  return hasDebriefCompleted(input) && hasProductFitValidated(input);
}



export function hasCompletedEvaluationActivity(input: PathwayGateInput): boolean {
  const completedEvaluationEngagement = (input.engagements ?? []).some(
    (e) =>
      EVALUATION_ENGAGEMENT_TYPES.has(String(e.engagement_type || "").toLowerCase()) &&
      COMPLETED_ENGAGEMENT_STATUSES.has(String(e.status || "").toLowerCase()),
  );

  const completedProductTrialCase = (input.cases ?? []).some((row) => {
    if (String(row.case_type || "").toLowerCase() !== "product_support") return false;
    const status = String(row.status || "").toLowerCase();
    return COMPLETED_ENGAGEMENT_STATUSES.has(status);
  });

  const completedAdditionalObservation = (input.engagements ?? []).some((e) => {
    const type = String(e.engagement_type || "").toLowerCase();
    if (type !== "or_visit" && type !== "or_observation") return false;
    return COMPLETED_ENGAGEMENT_STATUSES.has(String(e.status || "").toLowerCase());
  });

  return (
    completedEvaluationEngagement || completedProductTrialCase || completedAdditionalObservation
  );
}

export function hasEvaluationMarkedSuccessful(input: PathwayGateInput): boolean {
  return isTruthyContactFlag(input.contact, PATHWAY_CONTACT_EVALUATION_MARKED_SUCCESSFUL);
}

/** Evaluation → Case Commitment: evaluation completed, marked successful, or explicit commitment. */
export function isEvaluationStageComplete(input: PathwayGateInput): boolean {
  return (
    hasEvaluationMarkedSuccessful(input) ||
    hasCompletedEvaluationActivity(input) ||
    hasExplicitProviderCommitment(input) ||
    hasStructuredCommitmentSaved(input)
  );
}

export function hasStructuredCommitmentSaved(input: PathwayGateInput): boolean {
  const contact = input.contact;
  if (!isTruthyContactFlag(contact, PATHWAY_CONTACT_COMMITMENT_CONFIRMED)) return false;
  return Boolean(String(contact.provider_commitment_type ?? "").trim());
}



/** @deprecated Use isEvaluationStageComplete */

export const isExperienceStageComplete = isEvaluationStageComplete;



export function countCommittedProductCases(input: PathwayGateInput): number {

  const seen = new Set<string>();

  let count = 0;

  for (const row of input.cases ?? []) {

    if (String(row.case_type || "").toLowerCase() !== "product_support") continue;

    const status = String(row.status || "").toLowerCase();

    if (!COMPLETED_ENGAGEMENT_STATUSES.has(status)) continue;

    const id = String(row.id || row.case_id || `case-${count}`);

    if (seen.has(id)) continue;

    seen.add(id);

    count += 1;

  }

  return count;

}



/** Commitment → Outcomes: rep activated outcomes tracking or legacy committed-case target met. */
export function isCommitmentStageComplete(input: PathwayGateInput): boolean {
  if (isTruthyContactFlag(input.contact, PATHWAY_CONTACT_OUTCOMES_TRACKING_ACTIVE)) return true;
  return countCommittedProductCases(input) >= SALES_PATHWAY_MIN_COMMITTED_CASES;
}



/** Terminal stage — always active once commitment gate clears. */

export function isOutcomesStageComplete(_input: PathwayGateInput): boolean {

  return true;

}



export function isStageGateComplete(stageId: SalesPathwayStageId, input: PathwayGateInput): boolean {

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

      return isOutcomesStageComplete(input);

    default:

      return false;

  }

}



export function deriveGatedPathwayStage(input: PathwayGateInput): SalesPathwayStageId {
  if (!isDiscoveryReadyForObserve(input)) return "discovery";
  if (!isObserveStageComplete(input)) return "observe";
  if (!hasDebriefCompleted(input) || !hasProductFitValidated(input)) return "debrief";
  if (!isEvaluationStageComplete(input)) return "evaluation";
  if (!isCommitmentStageComplete(input)) return "commitment";
  return "outcomes";
}



/** @deprecated Use isDiscoveryReadyForObserve */

export function hasObservationScheduledOrCompleted(input: PathwayGateInput): boolean {

  return hasObservationScheduled(input) || countObservedProcedures(input) > 0;

}



/** @deprecated Notes-only debrief heuristics — use hasDebriefCompleted */

export function hasDebriefNotesReviewedWithSurgeon(input: PathwayGateInput): boolean {

  return hasDebriefCompleted(input);

}



/** @deprecated Use hasProductFitSignal / hasProviderEvaluationInterest */

export function hasValidatedClinicalInterest(input: PathwayGateInput): boolean {

  return hasProductFitSignal(input) || hasProviderEvaluationInterest(input);

}



export function isProductSalesConversationAllowed(input: PathwayGateInput): boolean {
  if (!hasObservationApproved(input)) return false;
  if (!isObserveStageComplete(input)) return false;
  if (!hasDebriefCompleted(input)) return false;
  return hasProductFitValidated(input);
}


