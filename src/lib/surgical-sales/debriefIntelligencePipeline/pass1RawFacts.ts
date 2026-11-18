/**
 * PASS 1 adapter — exposes flat DebriefRawFact[] from atomic facts on the parse result.
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import {
  flattenExtractedFacts,
  runPass1FromAtomicFacts,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { DebriefRawFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";

export { runPass1FactExtraction, flattenExtractedFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass1FactExtraction";

export function runPass1RawFactExtraction(
  dictation: string,
  review: LogUpdateParseResult,
): DebriefRawFact[] {
  return flattenExtractedFacts(
    runPass1FromAtomicFacts(review.atomicFacts ?? [], dictation),
  );
}
