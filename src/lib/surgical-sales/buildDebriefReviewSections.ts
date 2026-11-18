/**
 * Maps pipeline output to rep-facing review sections.
 * Review Updates UI uses actionable cards only — no Pass 3 card copy here.
 */

import type { DebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type {
  DebriefIntelligenceCapturedItem,
  DebriefRecommendedAction,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import type { RepFriendlySuggestedUpdate } from "@/lib/surgical-sales/debriefRepFriendlyReview";

export type DebriefReviewSections = {
  intelligenceCaptured: RepFriendlySuggestedUpdate[];
  recommendedActions: DebriefRecommendedAction[];
};

/** @deprecated Pass 3 intel items are not visible Review Updates output. */
export function intelligenceItemToRepFriendlyUpdate(
  _item: DebriefIntelligenceCapturedItem,
): RepFriendlySuggestedUpdate {
  throw new Error("Pass 3 intelligenceCaptured is not a Review Updates input");
}

export function buildDebriefReviewSections(
  _extraction: DebriefIntelligenceExtractionReview,
): DebriefReviewSections {
  return { intelligenceCaptured: [], recommendedActions: [] };
}
