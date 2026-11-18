import {
  extractObservationFacts,
  findUnmatchedSignalFragments,
} from "./extractObservationFacts";
import { runLlmObservationFactExtraction } from "./llmObservationFactExtraction";
import type { ObservationFact, ObservationFactExtraction } from "./observationFactTypes";

export type ExtractObservationFactsHybridOptions = {
  llmExtractor?: (fragment: string) => Promise<ObservationFact[]>;
  enableLlmFallback?: boolean;
};

function mergeFacts(...groups: ObservationFact[][]): ObservationFact[] {
  const seen = new Set<string>();
  const merged: ObservationFact[] = [];
  for (const group of groups) {
    for (const fact of group) {
      const key = `${fact.type}:${fact.value.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(fact);
    }
  }
  return merged;
}

function isLlmFallbackEnabled(options?: ExtractObservationFactsHybridOptions): boolean {
  if (options?.enableLlmFallback !== undefined) return options.enableLlmFallback;
  if (process.env.OBSERVATION_FACT_LLM_FALLBACK === "0") return false;
  if (process.env.OBSERVATION_FACT_LLM_FALLBACK === "1") return true;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** Rules-first extraction with optional LLM fallback for unmatched signal fragments. */
export async function extractObservationFactsHybrid(
  rawText: string,
  options?: ExtractObservationFactsHybridOptions,
): Promise<ObservationFactExtraction> {
  const rulesResult = extractObservationFacts(rawText);

  if (!isLlmFallbackEnabled(options)) {
    return rulesResult;
  }

  const unmatched = findUnmatchedSignalFragments(rawText);
  if (unmatched.length === 0) {
    return rulesResult;
  }

  const llmExtractor = options?.llmExtractor ?? runLlmObservationFactExtraction;
  const llmFacts: ObservationFact[] = [];

  for (const fragment of unmatched) {
    const fragmentFacts = await llmExtractor(fragment);
    llmFacts.push(...fragmentFacts);
  }

  if (llmFacts.length === 0) {
    return rulesResult;
  }

  return {
    facts: mergeFacts(rulesResult.facts, llmFacts).slice(0, 24),
    extractedAt: new Date().toISOString(),
    model: "facts-v1-hybrid",
  };
}

export function observationFactLlmFallbackEnabled(): boolean {
  if (process.env.OBSERVATION_FACT_LLM_FALLBACK === "0") return false;
  if (process.env.OBSERVATION_FACT_LLM_FALLBACK === "1") return true;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
