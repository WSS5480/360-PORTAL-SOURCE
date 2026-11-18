/**
 * Observation Note Pilot (v3) — AI-first whole-note fact extraction.
 *
 * One OpenAI call per note with a vocabulary-pinned prompt: the model may only
 * emit the 12 fact types the regex engine produces today (training_gap and
 * vendor_barrier are excluded — the rules engine never emits them) and must use
 * the existing canonical value strings so downstream normalization, dedupe, and
 * display mappings keep working unchanged.
 *
 * Timeout/fallback contract (§2.4): 12s abort → rules-engine fallback, so a
 * note capture can never hang or fail because OpenAI is slow or down.
 *
 * All output (AI or fallback) passes validateObservationFacts before return,
 * and the envelope carries validation_version: 1 so read paths trust it.
 */

import { callOpenAiStructuredJson } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import { z } from "zod";

import { extractObservationFacts } from "./extractObservationFacts";
import {
  EXTRA_VISUALIZATION_TIME_VALUE,
  READINESS_DELAY_VALUE,
  VISUALIZATION_CHALLENGE_VALUE,
} from "./extractionPatterns";
import type {
  ObservationFact,
  ObservationFactExtraction,
  ObservationFactType,
} from "./observationFactTypes";
import { validateObservationFacts } from "./validateObservationFacts";

export const OBSERVATION_AI_EXTRACTION_TIMEOUT_MS = 12_000;

const MAX_FACTS = 24;

/** Pilot vocabulary — regex-emittable types only. */
const PILOT_FACT_TYPES = [
  "competitor_product",
  "current_product",
  "workflow_issue",
  "provider_frustration",
  "staff_issue",
  "staff_efficiency",
  "visualization_challenge",
  "fixation_challenge",
  "product_interest",
  "product_fit_signal",
  "workflow_delay",
  "room_turnover_issue",
] as const;

const AiObservationFactSchema = z.object({
  type: z.enum(PILOT_FACT_TYPES),
  value: z.string().min(3).max(80),
  evidence: z.string().min(8).max(500),
  polarity: z.enum(["positive", "negative", "neutral", "uncertain"]),
  confirmation_state: z.enum(["witnessed", "reported", "needs_confirmation"]),
});

const AiObservationExtractionSchema = z.object({
  facts: z.array(AiObservationFactSchema).max(MAX_FACTS),
});

export const OBSERVATION_FACTS_V2_SYSTEM_PROMPT = `You extract structured commercial intelligence facts from a surgical observation note dictated by a medical device sales rep who watched a case.

Return JSON only:
{
  "facts": [
    {
      "type": "<one of the allowed types>",
      "value": "<canonical value — see vocabulary>",
      "evidence": "<verbatim substring copied from the note>",
      "polarity": "positive | negative | neutral | uncertain",
      "confirmation_state": "witnessed | reported | needs_confirmation"
    }
  ]
}

Allowed types and REQUIRED canonical values (use these exact strings):
- workflow_issue / visualization_challenge — extra or repeated effort getting a view, exposure, or angle: value "${EXTRA_VISUALIZATION_TIME_VALUE}" when extra time was spent, otherwise "${VISUALIZATION_CHALLENGE_VALUE}". Emit BOTH workflow_issue and visualization_challenge for visualization events.
- fixation_challenge — visualization/positioning effort tied to fixation or mesh placement: value "visualization delay before fixation" (alongside the workflow_issue/visualization_challenge pair).
- workflow_issue / workflow_delay — waiting because a product, tray, supply, or room was not ready: value "${READINESS_DELAY_VALUE}" on BOTH types. General pace problems: value "workflow pace slowed" on both. Setup overruns: value "setup delay observed" on both.
- room_turnover_issue — room turnover delays: value "room turnover delay" (plus workflow_issue with the same value).
- staff_efficiency — positive staff observations only: value "coordinated team" (knew their roles, worked well together), "staff appeared organized", "team comfortable with current products", or "positive staff workflow observed".
- staff_issue — staff friction only: value "packaging friction observed" or "staff workflow friction observed". NEVER from neutral or positive staff observations.
- provider_frustration — value "provider clinical frustration observed". ONLY when frustration, complaining, annoyed, or irritated language is explicit about the surgeon/provider.
- current_product — a named product in use: value is the product name exactly as written in the note (e.g. "Bard Mesh").
- competitor_product — a named competitor product or competitor presence: value is the product name, or "Competitor rep present" / "Competitor tray".
- product_interest / product_fit_signal — explicit interest in trials, demos, or evaluation: value "product evaluation interest" on both. Visualization/fixation workflow opportunity language: product_fit_signal with value "visualization and fixation workflow opportunity".

polarity: positive (good/working well), negative (problem/friction/delay), neutral (factual, e.g. product in use), uncertain (hedged).
confirmation_state: witnessed (rep saw it in the case), reported (someone told the rep), needs_confirmation (hedged or speculative).

Rules (mandatory):
1. evidence MUST be a verbatim substring of the note. Never paraphrase evidence.
2. Use ONLY the canonical values listed above (except product names, which come verbatim from the note).
3. Extract events the rep MINIMIZED too ("nothing major", "not a big deal") — mark them polarity "negative" and copy the minimizing sentence into evidence; validation downstream decides what to suppress.
4. Do NOT invent facts. A routine case with nothing notable returns {"facts":[]}.
5. Positive staff observations are staff_efficiency, never staff_issue.
6. Relationship/openness/next-step language is NOT a fact type here — skip it.
7. Hedged opportunity language ("too early to know", "not sure yet") → confirmation_state "needs_confirmation".
8. Statements that a problem did NOT occur ("no delays", "no room readiness issues", "no supply-related delays", "very few interruptions", "no complaints") are NOT problem facts. Never emit a delay, issue, friction, or frustration fact whose evidence is an absence statement. Smooth/organized observations may only become staff_efficiency facts.`;

type AiCallFn = (params: { systemPrompt: string; userPrompt: string; signal?: AbortSignal }) => Promise<string>;

export type ExtractObservationFactsV2Options = {
  /** Test seam — replaces the OpenAI call. */
  aiCall?: AiCallFn;
  timeoutMs?: number;
  now?: () => number;
};

function rulesFallbackExtraction(
  noteBody: string,
  startedAt: number,
  now: () => number,
): ObservationFactExtraction {
  const rules = extractObservationFacts(noteBody);
  return {
    facts: validateObservationFacts(rules.facts, noteBody).slice(0, MAX_FACTS),
    extractedAt: new Date().toISOString(),
    model: "facts-v2-rules-fallback",
    validation_version: 1,
    extraction_ms: Math.max(0, now() - startedAt),
    legacy_facts: rules.facts,
  };
}

async function callAiExtractor(
  noteBody: string,
  options: ExtractObservationFactsV2Options,
): Promise<ObservationFact[] | null> {
  const timeoutMs = options.timeoutMs ?? OBSERVATION_AI_EXTRACTION_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const aiCall: AiCallFn =
      options.aiCall ??
      (async (params) =>
        callOpenAiStructuredJson({
          systemPrompt: params.systemPrompt,
          userPrompt: params.userPrompt,
          maxTokens: 1024,
          signal: params.signal,
        }));

    const content = await aiCall({
      systemPrompt: OBSERVATION_FACTS_V2_SYSTEM_PROMPT,
      userPrompt: `Extract observation facts from this note:\n\n${noteBody.trim()}`,
      signal: controller.signal,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }

    const result = AiObservationExtractionSchema.safeParse(parsed);
    if (!result.success) return null;

    return result.data.facts.map((fact) => ({
      type: fact.type as ObservationFactType,
      value: fact.value.trim(),
      evidence: fact.evidence.trim(),
      polarity: fact.polarity,
      confirmation_state: fact.confirmation_state,
    }));
  } catch {
    // Timeout, network failure, or OpenAI error — fall back to rules.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * AI-first whole-note extraction with rules fallback. Every returned envelope
 * has validation_version: 1 and facts stamped by validateObservationFacts
 * (suppressed facts included — callers filter via acceptedObservationFacts).
 */
export async function extractObservationFactsV2(
  noteBody: string,
  options: ExtractObservationFactsV2Options = {},
): Promise<ObservationFactExtraction> {
  const now = options.now ?? Date.now;
  const startedAt = now();
  const trimmed = noteBody.trim();

  if (!trimmed) {
    return rulesFallbackExtraction(noteBody, startedAt, now);
  }

  const aiFacts = await callAiExtractor(trimmed, options);
  if (aiFacts === null) {
    return rulesFallbackExtraction(noteBody, startedAt, now);
  }

  const validated = validateObservationFacts(aiFacts, noteBody).slice(0, MAX_FACTS);

  return {
    facts: validated,
    extractedAt: new Date().toISOString(),
    model: "facts-v2-ai",
    validation_version: 1,
    extraction_ms: Math.max(0, now() - startedAt),
    legacy_facts: extractObservationFacts(noteBody).facts,
  };
}
