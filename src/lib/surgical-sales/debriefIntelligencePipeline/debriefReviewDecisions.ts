/**
 * Canonical Review Updates decision model — single source for modal rendering.
 */

import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { ReviewUpdateDebugTrace } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateDebug";
import type { ReviewUpdateGuardContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";
import {
  buildReviewUpdateItemsAudited,
  factKeyForReview,
  type ReviewUpdateItem,
  type ReviewUpdateItemType,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateItems";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type { DebriefFactConfidence } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";

export const DEBRIEF_REVIEW_DECISION_TYPES = [
  "contact_candidate",
  "observation_access_update",
  "clinical_focus_update",
  "product_intelligence_update",
  "organization_intelligence_update",
  "follow_up_task",
] as const;

export type DebriefReviewDecisionType = (typeof DEBRIEF_REVIEW_DECISION_TYPES)[number];

export type DebriefReviewDecision = {
  id: string;
  type: DebriefReviewDecisionType;
  dedupeKey: string;
  confidence: DebriefFactConfidence;
  evidenceQuotes: string[];
  linkedFactKeys: string[];
  linkedFieldUpdateIds: string[];
  contactId?: string;
  displayName?: string;
  roleLabel?: string;
  roleValue?: string;
  contactDetailsMissing?: boolean;
  observationStatus?: string;
  approval?: string;
  credentialingSummary?: string;
  insightTitle?: string;
  clinicalCategoryLabel?: string;
  clinicalDisplayValue?: string;
  clinicalSourceText?: string;
  clinicalSignalLabel?: string;
  clinicalProcedureFocus?: string;
  topicTitle?: string;
  productName?: string;
  productProcedureContext?: string;
  productEvidenceStatus?: string;
  productImpactLine?: string;
  productNextValidationStep?: string;
  taskTitle?: string;
  followUpReason?: string;
  suggestedDue?: string;
};

const LEGACY_TO_DECISION_TYPE: Record<ReviewUpdateItemType, DebriefReviewDecisionType> = {
  contact_candidate: "contact_candidate",
  observation_access: "observation_access_update",
  credentialing: "organization_intelligence_update",
  clinical_focus: "clinical_focus_update",
  product_intelligence: "product_intelligence_update",
  organization_intelligence: "organization_intelligence_update",
  follow_up_task: "follow_up_task",
};

function dedupeKeyForReviewItem(item: ReviewUpdateItem): string {
  switch (item.type) {
    case "contact_candidate":
      return `contact:${(item.displayName ?? item.id).toLowerCase()}`;
    case "observation_access":
      return "observation:readiness";
    case "credentialing":
    case "organization_intelligence":
      return `org:${(item.topicTitle ?? item.id).toLowerCase()}`;
    case "clinical_focus":
      // Trend display values ("Increasing Procedure Volume") repeat across
      // procedures, so the procedure focus must be part of the key.
      return `clinical:${(item.clinicalCategoryLabel ?? "focus")}:${(item.clinicalProcedureFocus ?? "").toLowerCase()}:${(item.clinicalDisplayValue ?? item.insightTitle ?? item.id).toLowerCase()}`;
    case "product_intelligence":
      return `product:${(item.productName ?? item.id).toLowerCase()}`;
    case "follow_up_task":
      return `task:${(item.taskTitle ?? item.id).toLowerCase().replace(/\.$/, "")}`;
    default:
      return item.id;
  }
}

export function reviewItemToDecision(item: ReviewUpdateItem): DebriefReviewDecision {
  return {
    id: item.id,
    type: LEGACY_TO_DECISION_TYPE[item.type],
    dedupeKey: dedupeKeyForReviewItem(item),
    confidence: item.confidence,
    evidenceQuotes: item.evidenceQuotes,
    linkedFactKeys: item.linkedFactKeys,
    linkedFieldUpdateIds: item.linkedFieldUpdateIds,
    contactId: item.contactId,
    displayName: item.displayName,
    roleLabel: item.roleLabel,
    roleValue: item.roleValue,
    contactDetailsMissing: item.contactDetailsMissing,
    observationStatus: item.observationStatus,
    approval: item.approval,
    credentialingSummary: item.credentialingSummary,
    insightTitle: item.insightTitle,
    clinicalCategoryLabel: item.clinicalCategoryLabel,
    clinicalDisplayValue: item.clinicalDisplayValue,
    clinicalSourceText: item.clinicalSourceText,
    clinicalSignalLabel: item.clinicalSignalLabel,
    clinicalProcedureFocus: item.clinicalProcedureFocus,
    topicTitle: item.topicTitle,
    productName: item.productName,
    productProcedureContext: item.productProcedureContext,
    productEvidenceStatus: item.productEvidenceStatus,
    productImpactLine: item.productImpactLine,
    productNextValidationStep: item.productNextValidationStep,
    taskTitle: item.taskTitle,
    followUpReason: item.followUpReason,
    suggestedDue: item.suggestedDue,
  };
}

export function reviewDecisionToLegacyItem(decision: DebriefReviewDecision): ReviewUpdateItem {
  const typeMap: Record<DebriefReviewDecisionType, ReviewUpdateItemType> = {
    contact_candidate: "contact_candidate",
    observation_access_update: "observation_access",
    clinical_focus_update: "clinical_focus",
    product_intelligence_update: "product_intelligence",
    organization_intelligence_update: "organization_intelligence",
    follow_up_task: "follow_up_task",
  };
  return {
    id: decision.id,
    type: typeMap[decision.type],
    confidence: decision.confidence,
    evidenceQuotes: decision.evidenceQuotes,
    linkedFactKeys: decision.linkedFactKeys,
    linkedFieldUpdateIds: decision.linkedFieldUpdateIds,
    contactId: decision.contactId,
    displayName: decision.displayName,
    roleLabel: decision.roleLabel,
    roleValue: decision.roleValue,
    contactDetailsMissing: decision.contactDetailsMissing,
    observationStatus: decision.observationStatus,
    approval: decision.approval,
    credentialingSummary: decision.credentialingSummary,
    insightTitle: decision.insightTitle,
    clinicalCategoryLabel: decision.clinicalCategoryLabel,
    clinicalDisplayValue: decision.clinicalDisplayValue,
    clinicalSourceText: decision.clinicalSourceText,
    clinicalSignalLabel: decision.clinicalSignalLabel,
    clinicalProcedureFocus: decision.clinicalProcedureFocus,
    topicTitle: decision.topicTitle,
    productName: decision.productName,
    productProcedureContext: decision.productProcedureContext,
    productEvidenceStatus: decision.productEvidenceStatus,
    productImpactLine: decision.productImpactLine,
    productNextValidationStep: decision.productNextValidationStep,
    taskTitle: decision.taskTitle,
    followUpReason: decision.followUpReason,
    suggestedDue: decision.suggestedDue,
  };
}

/** Canonical decision builder — all Review Updates cards derive from this output only. */
export function buildDebriefReviewDecisions(input: {
  dictation: string;
  atomicFacts: DebriefAtomicFact[];
  fieldUpdates?: LogUpdateRoutedFieldUpdate[];
  proposedContacts?: DebriefProposedContactItem[];
  guardContext?: ReviewUpdateGuardContext;
  debugLog?: ReviewUpdateDebugTrace[];
}): DebriefReviewDecision[] {
  return buildReviewUpdateItemsAudited(input).map(reviewItemToDecision);
}

export { factKeyForReview, MAX_FOLLOW_UP_DECISIONS } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateItems";
