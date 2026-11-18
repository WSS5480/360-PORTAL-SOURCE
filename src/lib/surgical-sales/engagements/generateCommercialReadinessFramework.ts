/**
 * Phase 1 — Commercial Readiness Framework generation (OpenAI + deterministic fallback).
 */

import { buildCommercialStrategyUserPrompt } from "@/lib/surgical-sales/engagements/synthesizeDebriefCommercialStrategy";
import {
  buildDeterministicCommercialReadinessFramework,
  buildGenericCommercialReadinessFramework,
} from "@/lib/surgical-sales/engagements/buildDeterministicCommercialReadinessFramework";
import {
  commercialReadinessTextHasLabelLeak,
  normalizeCommercialReadinessFramework,
} from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkGuards";
import {
  CommercialReadinessFrameworkSchema,
  type CommercialReadinessFramework,
} from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import type { AiDebriefStrategyBuilderSource } from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";
import type { AiDebriefStrategyBuilderContext } from "@/lib/surgical-sales/engagements/loadAiDebriefStrategyBuilderContext";
import { formatProviderIntelligenceContextForPrompt } from "@/lib/surgical-sales/engagements/providerIntelligenceContext";
import { callOpenAiStructuredJson } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

export type GenerateCommercialReadinessFrameworkResult = {
  framework: CommercialReadinessFramework;
  source: AiDebriefStrategyBuilderSource;
};

const COMMERCIAL_READINESS_SYSTEM_PROMPT = `You are a regional sales director reviewing multiple OR observations before briefing a rep for an Observation Debrief with a surgeon.

Return JSON only with this exact shape:
{
  "dimensions": [
    {
      "id": "workflow_pain" | "product_fit" | "competitive_displacement_opportunity" | "openness_to_change" | "evaluation_readiness" | "experience_360_readiness",
      "label": string,
      "score": number (0-100),
      "confidence": "High" | "Medium" | "Low",
      "reasoning": string,
      "evidence": string[],
      "supportingObservations": [
        {
          "observationIndex": number | null,
          "sourceNoteId": string | null,
          "excerpt": string,
          "contribution": string
        }
      ]
    }
  ],
  "directorSummary": string,
  "primaryCommercialLever": "workflow_pain" | "product_fit" | "competitive_displacement_opportunity" | "openness_to_change" | "evaluation_readiness" | "experience_360_readiness",
  "primaryRisk": string
}

You must return exactly 6 dimensions — one per id listed above.

CRITICAL rules:
- Reason like a sales director reviewing observation notes — NOT like an intelligence taxonomy engine.
- NEVER output category labels or ontology tokens such as: "workflow delays", "product signal", "staff familiarity", "clinical pain point", "workflow friction".
- Each dimension score must be justified by specific OR moments from the observation notes.
- reasoning = 1-3 complete sentences explaining WHY this score — cite what you saw in the OR.
- evidence = verbatim or near-verbatim excerpts from observation notes (not labels).
- supportingObservations = link each excerpt to how it supports the dimension score.
- When observations exist, each dimension must include at least one supportingObservations entry.
- workflow_pain: OR friction, delays, staff burden, clinical pain — is there a problem worth solving?
- product_fit: Does observed workflow map to ACSIS, Endolumik, TelaBio, BioTissue, or Skeletal Dynamics?
- competitive_displacement_opportunity: Incumbent products, switching friction, white-space.
- openness_to_change: Provider/staff appetite, resistance cues.
- evaluation_readiness: Relationship depth, procedural alignment, path to OR trial.
- experience_360_readiness: Suitability for sim-lab/office visit vs case commitment.
- directorSummary = 2-3 sentence synthesis across all dimensions.
- primaryCommercialLever = the dimension that should drive the debrief conversation.
- primaryRisk = the biggest risk if the rep advances too quickly.`;

function buildCommercialReadinessUserPrompt(context: AiDebriefStrategyBuilderContext): string {
  const learningsBlock =
    context.plan.whatWeLearned.length > 0
      ? context.plan.whatWeLearned
          .slice(0, 12)
          .map(
            (item) =>
              `- [${item.category}] ${item.signal}${item.evidence ? ` | evidence: "${item.evidence.slice(0, 200)}"` : ""}${item.sourceNoteId ? ` | noteId: ${item.sourceNoteId}` : ""}`,
          )
          .join("\n")
      : "- (no structured learnings yet)";

  const evidencePrompt = buildCommercialStrategyUserPrompt({
    synthesis: context.commercialSynthesis,
    productKnowledge: context.productKnowledge,
    planMode: context.planMode,
  });

  return [
    evidencePrompt,
    "",
    formatProviderIntelligenceContextForPrompt(context.providerIntelligence),
    "",
    "Structured plan learnings (use sourceNoteId when present):",
    learningsBlock,
    "",
    "Task: Score all 6 Commercial Readiness dimensions BEFORE any coaching narrative.",
    "Output the Commercial Readiness Framework JSON only.",
  ].join("\n");
}

function frameworkHasLabelLeak(framework: CommercialReadinessFramework): boolean {
  if (commercialReadinessTextHasLabelLeak(framework.directorSummary)) return true;
  if (commercialReadinessTextHasLabelLeak(framework.primaryRisk)) return true;

  for (const dimension of framework.dimensions) {
    if (commercialReadinessTextHasLabelLeak(dimension.reasoning)) return true;
    if (dimension.evidence.some((item) => commercialReadinessTextHasLabelLeak(item))) return true;
    if (
      dimension.supportingObservations.some(
        (item) =>
          commercialReadinessTextHasLabelLeak(item.excerpt) ||
          commercialReadinessTextHasLabelLeak(item.contribution),
      )
    ) {
      return true;
    }
  }

  return false;
}

function parseOpenAiFramework(content: string): CommercialReadinessFramework {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid JSON for commercial readiness framework");
  }

  const result = CommercialReadinessFrameworkSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Commercial readiness framework shape invalid: ${result.error.message.slice(0, 300)}`,
    );
  }

  const normalized = normalizeCommercialReadinessFramework(result.data);
  if (frameworkHasLabelLeak(normalized)) {
    throw new Error("Commercial readiness framework contains ontology label leakage");
  }

  return normalized;
}

function buildRulesFallbackFramework(
  context: AiDebriefStrategyBuilderContext,
): CommercialReadinessFramework {
  if (context.planMode === "generic" || context.completedObservationCount === 0) {
    return buildGenericCommercialReadinessFramework({
      providerName: context.providerName,
      completedObservationCount: context.completedObservationCount,
    });
  }

  return buildDeterministicCommercialReadinessFramework({
    synthesis: context.commercialSynthesis,
    plan: context.plan,
    observationNotes: context.observationNotes,
    observationCorpus: context.observationCorpus,
    completedObservationCount: context.completedObservationCount,
  });
}

export async function generateCommercialReadinessFramework(
  context: AiDebriefStrategyBuilderContext,
): Promise<GenerateCommercialReadinessFrameworkResult> {
  const fallback = buildRulesFallbackFramework(context);

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { framework: fallback, source: "rules_fallback" };
  }

  try {
    const content = await callOpenAiStructuredJson({
      systemPrompt: COMMERCIAL_READINESS_SYSTEM_PROMPT,
      userPrompt: buildCommercialReadinessUserPrompt(context),
      model:
        process.env.OPENAI_DEBRIEF_STRATEGY_MODEL?.trim() ||
        process.env.OPENAI_LOG_UPDATE_MAP_MODEL?.trim() ||
        undefined,
      temperature: 0.15,
      maxTokens: 3072,
    });

    return {
      framework: parseOpenAiFramework(content),
      source: "openai",
    };
  } catch (error) {
    console.error(
      "[generateCommercialReadinessFramework] OpenAI failed — using rules fallback:",
      error instanceof Error ? error.message : error,
    );
    return { framework: fallback, source: "rules_fallback" };
  }
}

export {
  buildCommercialReadinessUserPrompt,
  buildRulesFallbackFramework,
};
