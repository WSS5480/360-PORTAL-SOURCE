/**
 * Mirrors DebriefRepFriendlyReview outcome auto-selection on load (Save Updates path).
 */

import {
  buildDebriefActionableReviewCards,
  type DebriefActionableReviewCard,
} from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import type { DebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import {
  buildDebriefIntelligenceBrief,
  buildIntelligenceBriefOutcomes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import type { ReviewUpdateGuardContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";
import { fieldUpdateIdsExcludingUnresolvedConflicts } from "@/lib/surgical-sales/debriefFieldConflictResolution";
import { acceptIntelligenceReviewItems } from "@/lib/surgical-sales/debriefReviewItemState";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

/** Field rows extracted from debrief but often not linked on workflow_participant cards. */
const DEBRIEF_PERSIST_SUPPLEMENT_DB_KEYS = [
  "provider_observation_feasibility",
  "provider_observation_scheduling_control",
  "provider_scheduling_contact",
  "provider_observation_coordinator_contact",
  "provider_observation_credentialing_needed",
] as const;

export function fieldUpdateIdsFromDebriefOutcomeAutoAccept(input: {
  dictation: string;
  extraction: DebriefIntelligenceExtractionReview;
  proposedContacts: DebriefProposedContactItem[];
  guardContext?: ReviewUpdateGuardContext;
}): string[] {
  const cards = buildDebriefActionableReviewCards({
    extraction: input.extraction,
    proposedContacts: input.proposedContacts,
    dictation: input.dictation,
    guardContext: input.guardContext,
  });
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const brief = buildDebriefIntelligenceBrief({ cards });
  const outcomes = buildIntelligenceBriefOutcomes(brief);

  const fieldIds: string[] = [];
  for (const outcome of outcomes) {
    for (const cardId of outcome.cardIds) {
      const card = cardById.get(cardId);
      if (!card) continue;
      if (card.category === "workflow_participant") continue;
      if (card.category === "follow_up_task") continue;
      fieldIds.push(...card.linkedFieldUpdateIds);
    }
  }
  return [...new Set(fieldIds)];
}

export function supplementDebriefPersistFieldAcceptance(
  review: LogUpdateParseResult,
): LogUpdateParseResult {
  if (!review.usesProviderIntelligence) return review;
  const supplementIds = review.fieldUpdates
    .filter(
      (u) =>
        (DEBRIEF_PERSIST_SUPPLEMENT_DB_KEYS as readonly string[]).includes(u.dbKey) &&
        !u.accepted &&
        !(u.conflict && !u.conflict.resolution),
    )
    .map((u) => u.id);
  if (supplementIds.length === 0) return review;
  return acceptIntelligenceReviewItems(review, supplementIds);
}

export function simulateDebriefReviewOutcomeAcceptance(input: {
  review: LogUpdateParseResult;
  dictation: string;
  extraction: DebriefIntelligenceExtractionReview;
  proposedContacts: DebriefProposedContactItem[];
  guardContext?: ReviewUpdateGuardContext;
}): LogUpdateParseResult {
  const ids = fieldUpdateIdsExcludingUnresolvedConflicts(
    input.review,
    fieldUpdateIdsFromDebriefOutcomeAutoAccept(input),
  );
  let next = input.review;
  if (ids.length > 0) {
    next = acceptIntelligenceReviewItems(next, ids);
  }
  return supplementDebriefPersistFieldAcceptance(next);
}

export function acceptedFieldUpdatesAfterDebriefOutcomeAutoAccept(input: {
  review: LogUpdateParseResult;
  dictation: string;
  extraction: DebriefIntelligenceExtractionReview;
  proposedContacts: DebriefProposedContactItem[];
  guardContext?: ReviewUpdateGuardContext;
}): LogUpdateParseResult["fieldUpdates"] {
  const next = simulateDebriefReviewOutcomeAcceptance(input);
  return next.fieldUpdates.filter((u) => u.accepted);
}
