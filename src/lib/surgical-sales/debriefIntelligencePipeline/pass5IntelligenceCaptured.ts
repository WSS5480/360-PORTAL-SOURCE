/**
 * @deprecated Pass 5 merged into Pass 3 (`runPass3ReviewRendering`). Thin delegate for legacy imports.
 */

import { runPass3ReviewRendering } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass3ReviewRendering";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type {
  DebriefClassifiedFact,
  DebriefIntelligenceCapturedItem,
  DebriefPass4Synthesis,
  DebriefRulesOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/types";

export function runPass5IntelligenceCaptured(input: {
  acceptedFacts: DebriefClassifiedFact[];
  synthesis: DebriefPass4Synthesis;
  rules: DebriefRulesOutcome;
  dictation?: string;
  review?: LogUpdateParseResult;
}): DebriefIntelligenceCapturedItem[] {
  return runPass3ReviewRendering({
    dictation: input.dictation ?? "",
    review: input.review ?? ({ sourceText: "", aiMapping: null } as LogUpdateParseResult),
    acceptedFacts: input.acceptedFacts,
    rules: input.rules,
    proposedContacts: [],
  }).intelligenceCaptured;
}
