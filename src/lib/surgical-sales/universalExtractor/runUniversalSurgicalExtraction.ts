import {

  extractUniversalSurgicalFacts,

  factsContainOpportunitySignal,

} from "@/lib/surgical-sales/universalExtractor/extractUniversalSurgicalFacts";

import { dedupeUniversalFacts } from "@/lib/surgical-sales/sharedIntelligence/dedupeIntelligenceSignals";

import { enrichFactsWithApprovedProductIntelligence } from "@/lib/surgical-sales/productIntelligence";

import { runOpenAiUniversalFactExtraction } from "@/lib/surgical-sales/universalExtractor/runOpenAiUniversalFactExtraction";

import { isGptUniversalFactExtractorEnabled } from "@/lib/surgical-sales/universalExtractor/universalExtractorFeatureFlag";

import { isUniversalFactNonDisplayMetaConcept } from "@/lib/surgical-sales/universalExtractor/universalNonDisplayConcepts";

import type {

  UniversalExtractionResult,

  UniversalExtractorInput,

} from "@/lib/surgical-sales/universalExtractor/types";



function finalizeExtractionResult(input: {

  result: Omit<UniversalExtractionResult, "shadow_mode">;

}): UniversalExtractionResult {

  if (factsContainOpportunitySignal(input.result.facts)) {

    throw new Error("Universal extractor must not emit opportunity_signal facts");

  }

  return { ...input.result, shadow_mode: true };

}



/** Rules-based universal extraction — fallback and test default. */

export function runRulesUniversalSurgicalExtraction(

  input: UniversalExtractorInput,

  now: () => number = () => Date.now(),

): UniversalExtractionResult {

  const started = now();

  const { facts, suppressed_facts } = extractUniversalSurgicalFacts(input);



  return finalizeExtractionResult({

    result: {

      model: "universal-surgical-rules-v1",

      extraction_engine: "rules",

      extracted_at: new Date(started).toISOString(),

      extraction_ms: Math.max(0, now() - started),

      declared_source_type: input.declared_source_type,

      raw_note: input.raw_note.trim(),

      facts,

      suppressed_facts,

    },

  });

}



/** @deprecated Alias — use runRulesUniversalSurgicalExtraction or runUniversalSurgicalExtractionAsync. */

export function runUniversalSurgicalExtraction(

  input: UniversalExtractorInput,

  now: () => number = () => Date.now(),

): UniversalExtractionResult {

  return runRulesUniversalSurgicalExtraction(input, now);

}



export type RunUniversalSurgicalExtractionAsyncOptions = {

  providerLabel?: string | null;

  signal?: AbortSignal;

  now?: () => number;

  /** When true, throw if GPT fails instead of falling back to rules. */

  gptOnly?: boolean;

};



/**

 * Universal extraction — GPT structured output when USE_GPT_UNIVERSAL_FACT_EXTRACTOR=1,

 * otherwise rules engine. GPT failures fall back to rules unless gptOnly is set.

 */

export async function runUniversalSurgicalExtractionAsync(

  input: UniversalExtractorInput,

  options?: RunUniversalSurgicalExtractionAsyncOptions,

): Promise<UniversalExtractionResult> {

  const now = options?.now ?? (() => Date.now());

  const started = now();



  if (isGptUniversalFactExtractorEnabled()) {

    try {

      const gpt = await runOpenAiUniversalFactExtraction(input, {

        providerLabel: options?.providerLabel,

        signal: options?.signal,

      });


      const rules = runRulesUniversalSurgicalExtraction(input, now);
      // GPT succeeded: keep it primary and union in rules-engine signal (e.g.
      // product mentions GPT missed), but drop the rules engine's bookkeeping
      // concepts (no_issue_or_routine / unknown). Those mark "couldn't classify"
      // and only add noise once GPT has produced real facts — they were
      // polluting every saved note.
      const rulesSignalFacts = rules.facts.filter(
        (fact) => !isUniversalFactNonDisplayMetaConcept(fact.concept),
      );
      const facts = await enrichFactsWithApprovedProductIntelligence({
        rawNote: input.raw_note,
        declaredSourceType: input.declared_source_type,
        facts: dedupeUniversalFacts([...gpt.facts, ...rulesSignalFacts]),
      });
      const suppressedFacts = dedupeUniversalFacts([...gpt.suppressed_facts, ...rules.suppressed_facts]);


      return finalizeExtractionResult({

        result: {

          model: "universal-surgical-gpt-v1",

          extraction_engine: "gpt",

          extracted_at: new Date(started).toISOString(),

          extraction_ms: Math.max(0, now() - started),

          declared_source_type: input.declared_source_type,

          raw_note: input.raw_note.trim(),

          facts,

          suppressed_facts: suppressedFacts,

          gpt_rejection_count: gpt.rejections.length,

        },

      });

    } catch (error) {

      console.error("[uf-gpt-extraction] failed", error);

      if (options?.gptOnly) throw error;

    }

  }



  const rules = runRulesUniversalSurgicalExtraction(input, now);
  const facts = await enrichFactsWithApprovedProductIntelligence({
    rawNote: input.raw_note,
    declaredSourceType: input.declared_source_type,
    facts: rules.facts,
  });
  return facts === rules.facts ? rules : { ...rules, facts };

}


