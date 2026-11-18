/**
 * @deprecated Pass 4 merged into Pass 3 (`runPass3ReviewRendering`). Thin delegate for legacy imports.
 */

import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import { runPass3ReviewRendering } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass3ReviewRendering";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type {
  DebriefClassifiedFact,
  DebriefPass4Synthesis,
  DebriefRulesOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/types";

export function runPass4Synthesis(input: {
  dictation: string;
  acceptedFacts: DebriefClassifiedFact[];
  rules: DebriefRulesOutcome;
  proposedContacts?: DebriefProposedContactItem[];
  review?: LogUpdateParseResult;
}): DebriefPass4Synthesis {
  return runPass3ReviewRendering({
    dictation: input.dictation,
    review: input.review ?? ({ sourceText: input.dictation, aiMapping: null } as LogUpdateParseResult),
    acceptedFacts: input.acceptedFacts,
    rules: input.rules,
    proposedContacts: input.proposedContacts ?? [],
  }).synthesis;
}
