/**
 * AI debrief review — per-item accept / ignore / edit disposition.
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateConflictResolution } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  applyExtractionItemAccepted,
  applyExtractionItemValue,
} from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";

export { applyExtractionItemAccepted };

export type DebriefReviewItemDisposition = "needs_review" | "accepted" | "ignored" | "edited";

export function resolveIntelligenceItemDisposition(input: {
  itemId: string;
  accepted: boolean;
  ignoredIds: ReadonlySet<string>;
  editedIds: ReadonlySet<string>;
}): DebriefReviewItemDisposition {
  if (input.ignoredIds.has(input.itemId)) return "ignored";
  if (input.accepted) return input.editedIds.has(input.itemId) ? "edited" : "accepted";
  return "needs_review";
}

export function acceptIntelligenceReviewItem(
  review: LogUpdateParseResult,
  itemId: string,
): LogUpdateParseResult {
  return applyExtractionItemAccepted(review, itemId, true);
}

export function acceptIntelligenceReviewItems(
  review: LogUpdateParseResult,
  itemIds: ReadonlySet<string> | readonly string[],
): LogUpdateParseResult {
  if (!review.usesProviderIntelligence) return review;
  const ids = itemIds instanceof Set ? itemIds : new Set(itemIds);
  if (ids.size === 0) return review;
  return {
    ...review,
    fieldUpdates: review.fieldUpdates.map((field) =>
      ids.has(field.id) ? { ...field, accepted: true } : field,
    ),
  };
}

export function ignoreIntelligenceReviewItem(
  review: LogUpdateParseResult,
  itemId: string,
): LogUpdateParseResult {
  return applyExtractionItemAccepted(review, itemId, false);
}

export function ignoreIntelligenceReviewItems(
  review: LogUpdateParseResult,
  itemIds: ReadonlySet<string> | readonly string[],
): LogUpdateParseResult {
  if (!review.usesProviderIntelligence) return review;
  const ids = itemIds instanceof Set ? itemIds : new Set(itemIds);
  if (ids.size === 0) return review;
  return {
    ...review,
    fieldUpdates: review.fieldUpdates.map((field) =>
      ids.has(field.id) ? { ...field, accepted: false } : field,
    ),
  };
}

export function editIntelligenceReviewItem(
  review: LogUpdateParseResult,
  itemId: string,
  value: string,
): LogUpdateParseResult {
  return applyExtractionItemValue(review, itemId, value);
}

export function acceptedIntelligenceFieldUpdates(review: LogUpdateParseResult) {
  if (!review.usesProviderIntelligence) return [];
  return review.fieldUpdates.filter((field) => field.accepted);
}

export function resolveDebriefFieldConflict(
  review: LogUpdateParseResult,
  itemId: string,
  resolution: LogUpdateConflictResolution,
): LogUpdateParseResult {
  if (!review.usesProviderIntelligence) return review;
  return {
    ...review,
    fieldUpdates: review.fieldUpdates.map((field) => {
      if (field.id !== itemId || !field.conflict) return field;
      return {
        ...field,
        accepted: true,
        conflict: { ...field.conflict, resolution },
      };
    }),
  };
}

/** Accept every update that does not need an unresolved conflict decision. */
export function acceptAllDebriefReviewUpdates(review: LogUpdateParseResult): LogUpdateParseResult {
  return {
    ...review,
    saveAsNoteAccepted: true,
    fieldUpdates: review.fieldUpdates.map((field) => {
      if (field.conflict && !field.conflict.resolution) return field;
      return { ...field, accepted: true };
    }),
    suggestedUpdates: review.suggestedUpdates.map((field) => ({ ...field, accepted: true })),
  };
}
