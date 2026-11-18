/**
 * Build debrief review display artifacts from UF extraction runs (Phase 1).
 */

import type { DebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import type { DebriefActionableReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import {
  buildDebriefIntelligenceBrief,
  type DebriefIntelligenceBrief,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { mapUniversalFactsToActionableReviewCards } from "@/lib/surgical-sales/universalExtractor/mapUniversalFactsToActionableReviewCards";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import type { ReviewUpdateGuardContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";

export type BuildDebriefReviewFromUniversalFactsResult = {
  extraction: Pick<DebriefIntelligenceExtractionReview, "intelligenceUpdates">;
  actionableCards: DebriefActionableReviewCard[];
  brief: DebriefIntelligenceBrief;
  ufFactIdsByCardId: Record<string, string[]>;
};

export function buildDebriefReviewFromUniversalFacts(input: {
  dictation: string;
  debriefRuns: UniversalFactExtractionRun[];
  logUpdate?: LogUpdateParseResult | null;
  discoveryContext?: DebriefIntelligenceExtractionContext | null;
  providerContact?: Record<string, unknown> | null;
  proposedContacts?: DebriefProposedContactItem[];
  guardContext?: ReviewUpdateGuardContext;
}): BuildDebriefReviewFromUniversalFactsResult {
  const { cards, ufFactIdsByCardId } = mapUniversalFactsToActionableReviewCards({
    dictation: input.dictation,
    debriefRuns: input.debriefRuns,
    proposedContacts: input.proposedContacts,
    guardContext: input.guardContext,
    supportContacts: input.discoveryContext?.supportContacts,
  });

  const brief = buildDebriefIntelligenceBrief({ cards });

  return {
    extraction: { intelligenceUpdates: [] },
    actionableCards: cards,
    brief,
    ufFactIdsByCardId,
  };
}
