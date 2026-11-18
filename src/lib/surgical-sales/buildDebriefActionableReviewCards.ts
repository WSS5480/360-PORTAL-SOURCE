/**
 * Review Updates UI cards — rendered only from canonical DebriefReviewDecision model.
 */

import { missionContactInfoStatusLabel } from "@/lib/surgical-sales/providerMissionExecutionLanguage";
import type { DebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import {
  normalizeClinicalFocusCard,
  normalizeContactCandidateCard,
  normalizeFollowUpTaskCard,
  normalizeObservationAccessCard,
  normalizeOrganizationIntelligenceCard,
  normalizeProductIntelligenceCard,
} from "@/lib/surgical-sales/debriefActionableReviewCardNormalize";
import {
  DEBRIEF_REVIEW_ADD_CLINICAL_INSIGHT,
  DEBRIEF_REVIEW_CREATE_TASK,
  DEBRIEF_REVIEW_SAVE_ACCESS_INTELLIGENCE,
  DEBRIEF_REVIEW_SAVE_INTELLIGENCE,
  DEBRIEF_WORKFLOW_PARTICIPANT_CREATE,
  DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE,
  DEBRIEF_WORKFLOW_PARTICIPANT_LINK,
  DEBRIEF_CONFIRMED_CONTACT_STATUS,
} from "@/lib/surgical-sales/debriefApprovalUx";
import { normalizeCardEvidenceQuotes } from "@/lib/surgical-sales/debriefReviewEvidencePipeline";
import {
  buildDebriefReviewDecisions,
  reviewDecisionToLegacyItem,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDecisions";
import type { ReviewUpdateItem } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateItems";
import {
  pushReviewUpdateDebug,
  type ReviewUpdateDebugTrace,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateDebug";
import type { ReviewUpdateGuardContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";
import { reconcileObservationReviewItem } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewObservationReconcile";
import { dedupeDebriefActionableReviewCards } from "@/lib/surgical-sales/debriefReviewIntelligenceDedup";
import { isGenericClinicalFactText } from "@/lib/surgical-sales/debriefClinicalFactExtraction";

export type {
  DebriefActionableReviewCard,
  DebriefReviewCardAction,
  DebriefReviewCardCategory,
  DebriefReviewCardField,
} from "@/lib/surgical-sales/debriefActionableReviewCardTypes";

export { DEBRIEF_REVIEW_CATEGORY_LABELS } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";

import type { DebriefActionableReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";

function evidenceForCard(
  item: ReviewUpdateItem,
  dictation: string,
  cardCategory: DebriefActionableReviewCard["category"],
  personName?: string,
): string[] {
  return normalizeCardEvidenceQuotes(item.evidenceQuotes, {
    cardCategory,
    dictation,
    personName,
  });
}

function reviewItemToCard(
  item: ReviewUpdateItem,
  dictation: string,
  proposedContacts: DebriefProposedContactItem[] = [],
): DebriefActionableReviewCard | null {
  switch (item.type) {
    case "contact_candidate": {
      const displayName = item.displayName?.trim();
      if (!displayName) return null;
      const contactId = item.contactId ?? item.id;
      const fields: Array<{ label: string; value: string }> = [];
      if (item.roleLabel && item.roleValue) {
        fields.push({ label: item.roleLabel, value: item.roleValue });
      }
      if (item.contactDetailsMissing) {
        fields.push({ label: "Contact Info", value: missionContactInfoStatusLabel("Missing") });
      } else {
        const matched = proposedContacts.find(
          (contact) =>
            contact.id === contactId ||
            contact.displayName.toLowerCase() === displayName.toLowerCase(),
        );
        fields.push({ label: "Status", value: DEBRIEF_CONFIRMED_CONTACT_STATUS });
        if (matched?.phone.trim()) fields.push({ label: "Phone", value: "Captured" });
        if (matched?.email.trim()) fields.push({ label: "Email", value: "Captured" });
      }
      fields.push({ label: "Confidence", value: item.confidence });
      return normalizeContactCandidateCard({
        id: contactId,
        category: "workflow_participant",
        headline: displayName,
        displayName,
        roleLabel: item.roleLabel,
        roleValue: item.roleValue,
        fields,
        evidenceQuotes: evidenceForCard(item, dictation, "workflow_participant", displayName),
        confidence: item.confidence,
        actions: [
          {
            id: `${contactId}-create`,
            type: "create_contact",
            label: DEBRIEF_WORKFLOW_PARTICIPANT_CREATE,
            primary: true,
          },
          { id: `${contactId}-link`, type: "link_contact", label: DEBRIEF_WORKFLOW_PARTICIPANT_LINK },
          { id: `${contactId}-ignore`, type: "ignore", label: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE },
        ],
        contactId,
        linkedFieldUpdateIds: item.linkedFieldUpdateIds,
        linkedIntelligenceIds: [],
      });
    }
    case "observation_access":
      return normalizeObservationAccessCard({
        id: item.id,
        category: "observation_access",
        headline: "Observation Access",
        observationStatus: item.observationStatus ?? "Needs validation",
        approval: item.approval ?? "Not Confirmed",
        credentialing: item.credentialingSummary ?? "Not discussed",
        fields: [],
        evidenceQuotes: evidenceForCard(item, dictation, "observation_access"),
        confidence: item.confidence,
        actions: [
          {
            id: `${item.id}-update`,
            type: "update_access_status",
            label: DEBRIEF_REVIEW_SAVE_ACCESS_INTELLIGENCE,
            primary: true,
          },
          { id: `${item.id}-ignore`, type: "ignore", label: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE },
        ],
        linkedFieldUpdateIds: item.linkedFieldUpdateIds,
        linkedIntelligenceIds: [],
      });
    case "credentialing":
      return normalizeOrganizationIntelligenceCard({
        id: item.id,
        category: "organization_intelligence",
        headline: item.topicTitle ?? "Credentialing requirement",
        topicTitle: item.topicTitle ?? "Credentialing requirement",
        fields: [{ label: "Confidence", value: item.confidence }],
        evidenceQuotes: evidenceForCard(item, dictation, "organization_intelligence"),
        confidence: item.confidence,
        actions: [
          {
            id: `${item.id}-add`,
            type: "add_organization_intelligence",
            label: DEBRIEF_REVIEW_SAVE_INTELLIGENCE,
            primary: true,
          },
          { id: `${item.id}-ignore`, type: "ignore", label: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE },
        ],
        linkedFieldUpdateIds: item.linkedFieldUpdateIds,
        linkedIntelligenceIds: [],
      });
    case "product_intelligence":
      return normalizeProductIntelligenceCard({
        id: item.id,
        category: "product_intelligence",
        headline: item.topicTitle ?? `Current product identified: ${item.productName ?? "Unknown"}`,
        productName: item.productName ?? "Unknown",
        procedureContext: item.productProcedureContext,
        evidenceStatus: item.productEvidenceStatus ?? "Needs confirmation",
        impactLine:
          item.productImpactLine ??
          "Current product usage helps prepare observation strategy and future provider debrief.",
        nextValidationStep: item.productNextValidationStep,
        fields: [{ label: "Confidence", value: item.confidence }],
        evidenceQuotes: evidenceForCard(item, dictation, "product_intelligence"),
        confidence: item.confidence,
        actions: [
          {
            id: `${item.id}-add`,
            type: "add_product_intelligence",
            label: DEBRIEF_REVIEW_SAVE_INTELLIGENCE,
            primary: true,
          },
          { id: `${item.id}-ignore`, type: "ignore", label: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE },
        ],
        linkedFieldUpdateIds: item.linkedFieldUpdateIds,
        linkedIntelligenceIds: [],
      });
    case "clinical_focus":
      const clinicalLabels = [
        item.insightTitle,
        item.clinicalProcedureFocus,
        item.clinicalDisplayValue,
      ].filter((value): value is string => Boolean(value?.trim()));
      if (clinicalLabels.length > 0 && clinicalLabels.every(isGenericClinicalFactText)) {
        return null;
      }
      return normalizeClinicalFocusCard({
        id: item.id,
        category: "clinical_focus",
        headline: item.insightTitle ?? "Clinical focus",
        insightTitle: item.insightTitle ?? "Clinical focus",
        clinicalCategoryLabel: item.clinicalCategoryLabel,
        clinicalDisplayValue: item.clinicalDisplayValue,
        clinicalSourceText: item.clinicalSourceText,
        clinicalProcedureFocus: item.clinicalProcedureFocus,
        fields: [{ label: "Confidence", value: item.confidence }],
        evidenceQuotes: evidenceForCard(item, dictation, "clinical_focus"),
        confidence: item.confidence,
        actions: [
          {
            id: `${item.id}-add`,
            type: "add_clinical_focus",
            label: DEBRIEF_REVIEW_ADD_CLINICAL_INSIGHT,
            primary: true,
          },
          { id: `${item.id}-ignore`, type: "ignore", label: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE },
        ],
        linkedFieldUpdateIds: item.linkedFieldUpdateIds,
        linkedIntelligenceIds: [],
      });
    case "organization_intelligence":
      return normalizeOrganizationIntelligenceCard({
        id: item.id,
        category: "organization_intelligence",
        headline: item.topicTitle ?? "Organization intelligence",
        topicTitle: item.topicTitle ?? "Organization intelligence",
        fields: [{ label: "Confidence", value: item.confidence }],
        evidenceQuotes: evidenceForCard(item, dictation, "organization_intelligence"),
        confidence: item.confidence,
        actions: [
          {
            id: `${item.id}-add`,
            type: "add_organization_intelligence",
            label: DEBRIEF_REVIEW_SAVE_INTELLIGENCE,
            primary: true,
          },
          { id: `${item.id}-ignore`, type: "ignore", label: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE },
        ],
        linkedFieldUpdateIds: item.linkedFieldUpdateIds,
        linkedIntelligenceIds: [],
      });
    case "follow_up_task":
      return normalizeFollowUpTaskCard({
        id: item.id,
        category: "follow_up_task",
        headline: item.taskTitle ?? "Follow up",
        taskTitle: item.taskTitle ?? "Follow up",
        followUpReason: item.followUpReason,
        suggestedDue: item.suggestedDue ?? "Next Touch",
        fields: [],
        evidenceQuotes: evidenceForCard(item, dictation, "follow_up_task"),
        actions: [
          {
            id: `${item.id}-create`,
            type: "create_follow_up",
            label: DEBRIEF_REVIEW_CREATE_TASK,
            primary: true,
          },
          { id: `${item.id}-ignore`, type: "ignore", label: DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE },
        ],
        linkedFieldUpdateIds: [],
        linkedIntelligenceIds: [],
      });
    default:
      return null;
  }
}

export function buildReviewDecisionsForExtraction(input: {
  extraction: DebriefIntelligenceExtractionReview;
  dictation: string;
  proposedContacts: DebriefProposedContactItem[];
  guardContext?: ReviewUpdateGuardContext;
  debugLog?: ReviewUpdateDebugTrace[];
}) {
  return buildDebriefReviewDecisions({
    dictation: input.dictation,
    atomicFacts: input.extraction.atomicFacts ?? [],
    fieldUpdates: input.extraction.fieldUpdates ?? [],
    proposedContacts: input.proposedContacts,
    guardContext: input.guardContext,
    debugLog: input.debugLog,
  });
}

/** @deprecated Use buildReviewDecisionsForExtraction */
export function buildReviewUpdateItemsForExtraction(input: {
  extraction: DebriefIntelligenceExtractionReview;
  dictation: string;
  proposedContacts: DebriefProposedContactItem[];
  guardContext?: ReviewUpdateGuardContext;
  debugLog?: ReviewUpdateDebugTrace[];
}) {
  return buildReviewDecisionsForExtraction(input).map(reviewDecisionToLegacyItem);
}

export { buildDebriefReviewDecisions } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDecisions";
export type { DebriefReviewDecision } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDecisions";

function mapReviewDecisionToCard(
  decision: ReturnType<typeof buildDebriefReviewDecisions>[number],
  dictation: string,
  proposedContacts: DebriefProposedContactItem[],
): DebriefActionableReviewCard | null {
  const item = reconcileObservationReviewItem(reviewDecisionToLegacyItem(decision), dictation);
  return reviewItemToCard(item, dictation, proposedContacts);
}

export function buildDebriefActionableReviewCards(input: {
  extraction: DebriefIntelligenceExtractionReview;
  proposedContacts: DebriefProposedContactItem[];
  dictation: string;
  guardContext?: ReviewUpdateGuardContext;
  debugLog?: ReviewUpdateDebugTrace[];
  includeCategories?: import("@/lib/surgical-sales/debriefActionableReviewCardTypes").DebriefReviewCardCategory[];
}): DebriefActionableReviewCard[] {
  const decisions = buildDebriefReviewDecisions({
    dictation: input.dictation,
    atomicFacts: input.extraction.atomicFacts ?? [],
    fieldUpdates: input.extraction.fieldUpdates ?? [],
    proposedContacts: input.proposedContacts,
    guardContext: input.guardContext,
    debugLog: input.debugLog,
  });

  const cards: DebriefActionableReviewCard[] = [];
  const seen = new Set<string>();

  for (const decision of decisions) {
    const card = mapReviewDecisionToCard(decision, input.dictation, input.proposedContacts);
    if (!card) {
      pushReviewUpdateDebug(input.debugLog, {
        sourceFactId: decision.linkedFactKeys[0] ?? decision.id,
        sourceCollection: "card_renderer",
        reviewType: "review_card",
        dedupeKey: decision.dedupeKey,
        itemId: decision.id,
        outcome: "removed",
        removalReason: "card_mapping_returned_null",
        label: decision.displayName ?? decision.taskTitle ?? decision.insightTitle ?? decision.id,
      });
      continue;
    }
    const key = `${card.category}|${card.id}`;
    if (seen.has(key)) {
      pushReviewUpdateDebug(input.debugLog, {
        sourceFactId: decision.linkedFactKeys[0] ?? decision.id,
        sourceCollection: "card_renderer",
        reviewType: "review_card",
        dedupeKey: key,
        itemId: card.id,
        outcome: "removed",
        removalReason: "duplicate_card_key",
        label: card.headline,
      });
      continue;
    }
    seen.add(key);
    cards.push(card);
    pushReviewUpdateDebug(input.debugLog, {
      sourceFactId: decision.linkedFactKeys[0] ?? decision.id,
      sourceCollection: "card_renderer",
      reviewType: "review_card",
      dedupeKey: decision.dedupeKey,
      itemId: card.id,
      outcome: "emitted",
      label: card.headline,
    });
  }

  // Final dedup pass — merges duplicate people (combining their role signals
  // into one contact card) and collapses repeated insights/follow-ups that
  // slipped past per-type dedup with distinct ids.
  const deduped = dedupeDebriefActionableReviewCards(cards, input.dictation);
  if (input.includeCategories?.length) {
    const allowed = new Set(input.includeCategories);
    return deduped.filter((card) => allowed.has(card.category));
  }
  if (deduped.length < cards.length) {
    const survivorIds = new Set(deduped.map((card) => `${card.category}|${card.id}`));
    for (const card of cards) {
      if (survivorIds.has(`${card.category}|${card.id}`)) continue;
      pushReviewUpdateDebug(input.debugLog, {
        sourceFactId: card.id,
        sourceCollection: "card_renderer",
        reviewType: "review_card",
        dedupeKey: `${card.category}|${card.id}`,
        itemId: card.id,
        outcome: "removed",
        removalReason: "merged_into_deduped_card",
        label: card.headline,
      });
    }
  }
  return deduped;
}
