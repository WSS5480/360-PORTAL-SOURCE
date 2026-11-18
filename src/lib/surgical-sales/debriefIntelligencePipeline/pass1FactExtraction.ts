/**
 * PASS 1 — Normalize atomic facts from OpenAI into structured buckets (no regex re-extraction).
 */

import {
  flattenExtractedFacts,
  runPass1FromAtomicFacts,
  type DebriefAtomicFact,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { DebriefExtractedFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefFactKeys";

export { flattenExtractedFacts } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";

export function runPass1FactExtraction(
  dictation: string,
  atomicFacts: DebriefAtomicFact[],
): DebriefExtractedFacts {
  return runPass1FromAtomicFacts(atomicFacts, dictation);
}

export type { DebriefAtomicFact };
