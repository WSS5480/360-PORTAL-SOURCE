/**
 * @deprecated Pass 6 merged into Pass 3 (`runPass3ReviewRendering`). Thin delegate for legacy imports.
 */

import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import { runPass3ReviewRendering } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass3ReviewRendering";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type {
  DebriefClassifiedFact,
  DebriefPass4Synthesis,
  DebriefRecommendedAction,
  DebriefRulesOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/types";

export function runPass6RecommendedActions(input: {
  dictation: string;
  review: LogUpdateParseResult;
  acceptedFacts: DebriefClassifiedFact[];
  synthesis: DebriefPass4Synthesis;
  rules: DebriefRulesOutcome;
  proposedContacts: DebriefProposedContactItem[];
}): DebriefRecommendedAction[] {
  return runPass3ReviewRendering(input).recommendedActions;
}
