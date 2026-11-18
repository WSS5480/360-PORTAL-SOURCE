/**
 * @deprecated Use pass5IntelligenceCaptured — kept for importers of runPass5ReviewCards.
 */

import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import { runPass5IntelligenceCaptured } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass5IntelligenceCaptured";
import type {
  DebriefClassifiedFact,
  DebriefPass4Synthesis,
  DebriefPipelineReviewCard,
  DebriefRulesOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/types";

export function runPass5ReviewCards(input: {
  acceptedFacts: DebriefClassifiedFact[];
  synthesis: DebriefPass4Synthesis;
  rules: DebriefRulesOutcome;
  proposedContacts: DebriefProposedContactItem[];
}): DebriefPipelineReviewCard[] {
  void input.proposedContacts;
  return runPass5IntelligenceCaptured({
    acceptedFacts: input.acceptedFacts,
    synthesis: input.synthesis,
    rules: input.rules,
  }) as DebriefPipelineReviewCard[];
}
