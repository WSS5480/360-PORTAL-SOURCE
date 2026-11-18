/**
 * OpenAI debrief extraction — atomic structured facts only (no confirmed_updates / card copy).
 */

import { callOpenAiStructuredJson } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import {
  buildOpenAiUserPrompt,
  type LogUpdateMappingInputContext,
} from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import {
  DebriefFactExtractionResultSchema,
  normalizeAndDedupeAtomicFactsWithRejections,
  type DebriefAtomicFact,
  type DebriefAtomicFactRejection,
  type DebriefFactExtractionResult,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";

export const DEBRIEF_ATOMIC_FACT_EXTRACTION_SYSTEM_PROMPT = `You are a structured fact extractor for surgical device field debriefs.

Extract ONLY atomic facts from the rep's debrief transcript. Each fact is one observable statement — never summaries, recommendations, card labels, or follow-up task prose.

Return JSON only:
{
  "facts": [
    {
      "fact_type": "workflow_contact | observation_access | credentialing | scheduling | clinical_focus | product_fit | current_product | relationship | facility_intelligence | follow_up",
      "entity": "person name, platform name, or empty string when not applicable",
      "attribute": "short machine key e.g. role | status | platform | procedure | volume",
      "value": "concise fact value only",
      "confidence": "high | medium | low",
      "evidence": "verbatim excerpt from the transcript"
    }
  ]
}

Rules (mandatory):
1. One fact per row — do not combine unrelated statements.
2. evidence MUST be a verbatim excerpt from the transcript (short quote).
3. Never invent facts not stated in the transcript.
4. Separate observation interest from explicit approval:
   - interest/openness → observation_access attribute status value like "interested" or "not opposed" (confidence medium)
   - explicit approval → observation_access attribute status value "approved" (confidence high only when explicit)
5. workflow_contact / scheduling facts require a real person name in entity.
6. Never emit contacts from vague phrases ("the right people", "their team", "the office").
7. credentialing platform unknown or hedged → credentialing attribute platform value "unknown" (confidence medium or low).
8. product_fit facts ONLY when product/category/evaluation is explicitly tied to our product or named product (e.g. ACSIS).
8b. current_product facts capture incumbent/competitive product usage (e.g. Bard Mesh, Ventralight) even when hedged ("from what I understood", "need to confirm during observation"). Use entity for product name, attribute for evidence_status (needs_confirmation | validated), value for procedure context when stated. Hedging lowers confidence to medium — never skip extraction because of uncertainty language.
9. follow_up facts capture rep-stated future actions only ("need to", "follow up", "get her info") — NOT completed past actions.
10. clinical_focus facts MUST capture durable commercial intelligence — NOT verbatim quotes:
   - Split distinct procedure focuses into separate facts.
   - attribute: commercial signal (increasing_procedure_volume | increasing_case_volume | procedure_focus | new_procedure_adoption | clinical_frustration | technology_preference | product_opportunity)
   - value: "{Procedure focus} · {Signal label}" — e.g. "Robotic ventral hernia repair · Increasing procedure volume"
   - Emit volume/trend/adoption signals ONLY when the transcript contains explicit growth language (increasing, growing, more cases, higher volume, newly adopted, etc.).
   - Never copy on-file provider trends from context into new facts — procedure names or workflow challenges alone are NOT volume trends.
   - Identify growing volumes, new adoption, frustrations, technology preferences, and product-relevant opportunities when stated in the transcript.
11. Do NOT return summaries, confirmed_updates, partial_updates, operational_signals, recommended_next_moves, or card text.

Example:
{
  "facts": [
    {
      "fact_type": "workflow_contact",
      "entity": "Jennifer",
      "attribute": "role",
      "value": "Scheduling Coordinator",
      "confidence": "medium",
      "evidence": "Jennifer handles scheduling."
    }
  ]
}`;

function coerceFactExtractionPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return { facts: [] };
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.facts)) return obj;

  // Reject legacy mapping shapes — facts pipeline only.
  return { facts: [] };
}

export type RunOpenAiDebriefFactExtractionOptions = {
  maxTokens?: number;
};

export type DebriefFactExtractionWithTelemetry = DebriefFactExtractionResult & {
  /** Facts dropped or demoted by deterministic grounding — telemetry, never displayed. */
  rejectedFacts: DebriefAtomicFactRejection[];
};

export async function runOpenAiDebriefFactExtraction(
  ctx: LogUpdateMappingInputContext,
  options?: RunOpenAiDebriefFactExtractionOptions,
): Promise<DebriefFactExtractionWithTelemetry> {
  const maxTokens =
    options?.maxTokens ?? (ctx.compactDiscoveryPrompt ? 2048 : 4096);

  const content = await callOpenAiStructuredJson({
    systemPrompt: DEBRIEF_ATOMIC_FACT_EXTRACTION_SYSTEM_PROMPT,
    userPrompt: buildOpenAiUserPrompt(ctx),
    maxTokens,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid JSON for debrief fact extraction");
  }

  const normalized = coerceFactExtractionPayload(parsed);
  const result = DebriefFactExtractionResultSchema.safeParse(normalized);
  if (!result.success) {
    throw new Error(`Debrief fact extraction shape invalid: ${result.error.message.slice(0, 300)}`);
  }

  const grounded = normalizeAndDedupeAtomicFactsWithRejections(result.data.facts, ctx.rawNote);
  if (grounded.rejected.length > 0) {
    console.info("[debrief-fact-extraction] grounding rejections", {
      count: grounded.rejected.length,
      reasons: grounded.rejected.map((r) => r.reason),
    });
  }
  return {
    facts: grounded.facts,
    rejectedFacts: grounded.rejected,
  };
}

export type { DebriefAtomicFact, DebriefAtomicFactRejection, DebriefFactExtractionResult };
