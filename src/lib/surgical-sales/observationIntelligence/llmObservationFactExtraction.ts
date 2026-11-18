import { z } from "zod";

import {
  isNegativeEvidenceStatement,
  isUnknownEvidenceStatement,
} from "@/lib/surgical-sales/observationEvidenceClassification";
import {
  isActionableIntelligenceFinding,
  isTranscriptChunkText,
} from "@/lib/surgical-sales/observationFindingQuality";
import { callOpenAiStructuredJson } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import { OBSERVATION_FACT_TYPES, type ObservationFact, type ObservationFactType } from "./observationFactTypes";

const LlmObservationFactSchema = z.object({
  type: z.enum(OBSERVATION_FACT_TYPES),
  value: z.string().min(3).max(80),
  evidence: z.string().min(8).max(500),
  // v2 pilot fields — accepted when present, never required.
  polarity: z.enum(["positive", "negative", "neutral", "uncertain"]).optional(),
  confirmation_state: z.enum(["witnessed", "reported", "needs_confirmation"]).optional(),
});

const LlmObservationFactExtractionSchema = z.object({
  facts: z.array(LlmObservationFactSchema).max(8),
});

export const OBSERVATION_FACT_LLM_EXTRACTION_SYSTEM_PROMPT = `You extract concise surgical observation facts from messy field-note fragments dictated by a medical device sales rep.

Return JSON only:
{
  "facts": [
    {
      "type": "competitor_product | current_product | workflow_issue | provider_frustration | staff_issue | staff_efficiency | visualization_challenge | fixation_challenge | product_interest | product_fit_signal | workflow_delay | room_turnover_issue | training_gap | vendor_barrier",
      "value": "short normalized label (max 80 chars, NOT a transcript chunk)",
      "evidence": "verbatim substring from the fragment"
    }
  ]
}

Rules (mandatory):
1. Extract only facts explicitly supported by the fragment. Return {"facts":[]} when uncertain.
2. value must be a concise normalized label — never copy the full fragment.
3. evidence MUST be a verbatim excerpt from the fragment.
4. Do NOT emit provider_frustration unless frustration, complaint, annoyed, or irritated language is explicit.
5. Do NOT emit staff_issue from neutral or positive staff observations (organized, efficient, comfortable).
6. Visualization/exposure/angle/view language → visualization_challenge and/or workflow_issue (and fixation_challenge when fixation or mesh placement context exists).
7. Product readiness delays → workflow_delay and workflow_issue.
8. Competitor/current product usage → current_product and competitor_product when a named product or competitor is stated.
9. Unknown is better than hallucinated intelligence.`;

function evidenceInFragment(evidence: string, fragment: string): boolean {
  const normalizedEvidence = evidence.trim().toLowerCase();
  const normalizedFragment = fragment.trim().toLowerCase();
  if (!normalizedEvidence || !normalizedFragment) return false;
  return normalizedFragment.includes(normalizedEvidence);
}

export function validateLlmObservationFacts(fragment: string, facts: ObservationFact[]): ObservationFact[] {
  if (isUnknownEvidenceStatement(fragment) || isNegativeEvidenceStatement(fragment)) {
    return [];
  }

  const validated: ObservationFact[] = [];
  const seen = new Set<string>();

  for (const fact of facts) {
    if (!evidenceInFragment(fact.evidence, fragment)) continue;
    if (isTranscriptChunkText(fact.value) || !isActionableIntelligenceFinding(fact.value)) continue;
    if (fact.type === "provider_frustration" && !/\b(?:frustrat\w*|complain\w*|annoyed|irritated)\b/i.test(fragment)) {
      continue;
    }
    if (
      fact.type === "staff_issue" &&
      /\b(?:organized|comfortable|efficient|prepared|smooth|coordinated|no issues|no complaints)\b/i.test(fragment)
    ) {
      continue;
    }

    const key = `${fact.type}:${fact.value.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    validated.push({
      type: fact.type,
      value: fact.value.trim(),
      evidence: fact.evidence.trim(),
    });
  }

  return validated.slice(0, 8);
}

export type RunLlmObservationFactExtractionOptions = {
  llmCall?: (params: { systemPrompt: string; userPrompt: string }) => Promise<string>;
};

export async function runLlmObservationFactExtraction(
  fragment: string,
  options?: RunLlmObservationFactExtractionOptions,
): Promise<ObservationFact[]> {
  const trimmed = fragment.trim();
  if (!trimmed) return [];

  const llmCall =
    options?.llmCall ??
    (async (params) =>
      callOpenAiStructuredJson({
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
        maxTokens: 512,
      }));

  const content = await llmCall({
    systemPrompt: OBSERVATION_FACT_LLM_EXTRACTION_SYSTEM_PROMPT,
    userPrompt: `Extract observation facts from this fragment only:\n\n${trimmed}`,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const result = LlmObservationFactExtractionSchema.safeParse(parsed);
  if (!result.success) return [];

  return validateLlmObservationFacts(
    trimmed,
    result.data.facts.map((fact) => ({
      type: fact.type as ObservationFactType,
      value: fact.value,
      evidence: fact.evidence,
    })),
  );
}
