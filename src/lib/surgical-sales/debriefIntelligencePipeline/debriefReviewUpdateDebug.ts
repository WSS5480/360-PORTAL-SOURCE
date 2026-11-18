/**
 * Debug tracing for Review Updates item generation.
 */

import type { ReviewUpdateItemType } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateItems";

export const REVIEW_UPDATE_SOURCE_COLLECTIONS = [
  "normalized_atomic_facts",
  "dictation_inference",
  "field_updates",
  "proposed_contacts",
  "card_renderer",
] as const;

export type ReviewUpdateSourceCollection = (typeof REVIEW_UPDATE_SOURCE_COLLECTIONS)[number];

export type ReviewUpdateDebugTrace = {
  sourceFactId: string;
  sourceCollection: ReviewUpdateSourceCollection;
  reviewType: ReviewUpdateItemType | "review_card";
  dedupeKey: string;
  itemId?: string;
  outcome: "emitted" | "removed";
  removalReason?: string;
  label?: string;
};

export function pushReviewUpdateDebug(
  log: ReviewUpdateDebugTrace[] | undefined,
  trace: ReviewUpdateDebugTrace,
): void {
  if (!log) return;
  log.push(trace);
}

export function logReviewUpdateDebugTraces(traces: ReviewUpdateDebugTrace[], label = "review-update-debug"): void {
  if (traces.length === 0) return;
  console.debug(`[${label}]`, traces);
}
