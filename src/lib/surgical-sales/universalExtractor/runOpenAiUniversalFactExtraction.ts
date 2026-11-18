/**
 * OpenAI structured Universal Facts extraction — emits GPT rows validated into UF schema.
 */

import { callOpenAiStructuredJson } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import {
  buildGptUniversalFactUserPrompt,
  GPT_UNIVERSAL_FACT_EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/surgical-sales/universalExtractor/gptUniversalFactExtractionPrompt";
import {
  GptUniversalFactExtractionResultSchema,
  type GptUniversalFactRow,
} from "@/lib/surgical-sales/universalExtractor/gptUniversalFactExtractionSchema";
import type { UniversalExtractorInput } from "@/lib/surgical-sales/universalExtractor/types";
import {
  validateAndNormalizeGptUniversalFacts,
  type GptUniversalFactRejection,
} from "@/lib/surgical-sales/universalExtractor/validateGptUniversalFacts";

export type RunOpenAiUniversalFactExtractionResult = {
  raw_rows: GptUniversalFactRow[];
  rejections: GptUniversalFactRejection[];
} & ReturnType<typeof validateAndNormalizeGptUniversalFacts>;

export type RunOpenAiUniversalFactExtractionOptions = {
  maxTokens?: number;
  providerLabel?: string | null;
  signal?: AbortSignal;
};

function coercePayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return { facts: [] };
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.facts)) return obj;
  return { facts: [] };
}

export async function runOpenAiUniversalFactExtraction(
  input: UniversalExtractorInput,
  options?: RunOpenAiUniversalFactExtractionOptions,
): Promise<RunOpenAiUniversalFactExtractionResult> {
  const transcript = input.raw_note.trim();
  if (!transcript) {
    return { raw_rows: [], facts: [], suppressed_facts: [], rejections: [] };
  }

  const content = await callOpenAiStructuredJson({
    systemPrompt: GPT_UNIVERSAL_FACT_EXTRACTION_SYSTEM_PROMPT,
    userPrompt: buildGptUniversalFactUserPrompt({
      transcript,
      declared_source_type: input.declared_source_type,
      providerLabel: options?.providerLabel,
    }),
    maxTokens: options?.maxTokens ?? 4096,
    signal: options?.signal,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid JSON for universal fact extraction");
  }

  const normalized = coercePayload(parsed);
  const result = GptUniversalFactExtractionResultSchema.safeParse(normalized);
  if (!result.success) {
    throw new Error(
      `Universal fact extraction shape invalid: ${result.error.message.slice(0, 300)}`,
    );
  }

  const validated = validateAndNormalizeGptUniversalFacts({
    rows: result.data.facts,
    transcript,
    declared_source_type: input.declared_source_type,
    providerName: options?.providerLabel,
  });

  if (validated.rejections.length > 0) {
    console.info("[uf-gpt-extraction] validation rejections", {
      count: validated.rejections.length,
      reasons: validated.rejections.slice(0, 8).map((r) => r.reason),
    });
  }

  return {
    raw_rows: result.data.facts,
    ...validated,
  };
}
