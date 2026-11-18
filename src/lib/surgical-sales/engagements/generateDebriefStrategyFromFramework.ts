/**
 * Phase 2 — Derive debrief coaching strategy from Commercial Readiness Framework.
 */

import {
  AiDebriefStrategyBuilderOutputSchema,
  type AiDebriefStrategyBuilderOutput,
  type AiDebriefStrategyBuilderSource,
} from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";
import {
  alignAdvancementPathWithFramework,
  enrichLearnedBulletsWithFramework,
  frameworkAdvancementPathFromScores,
} from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkGuards";
import type { CommercialReadinessFramework } from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import {
  getCommercialReadinessDimension,
  COMMERCIAL_READINESS_DIMENSION_LABELS,
} from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import type { AiDebriefStrategyBuilderContext } from "@/lib/surgical-sales/engagements/loadAiDebriefStrategyBuilderContext";
import {
  polishAiDebriefStrategyBuilderOutput,
  sanitizeAiDebriefStrategyBuilderOutput,
} from "@/lib/surgical-sales/engagements/polishAiDebriefStrategyBuilderOutput";
import { synthesizeDebriefCommercialStrategyFromFramework } from "@/lib/surgical-sales/engagements/synthesizeDebriefCommercialStrategy";
import { callOpenAiStructuredJson } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

const DEBRIEF_STRATEGY_FROM_FRAMEWORK_SYSTEM_PROMPT = `You are a regional sales director briefing a medical device rep before an Observation Debrief with a surgeon.

You have ALREADY completed a Commercial Readiness Framework assessment. Your job is to derive rep-facing coaching ONLY from that framework — not from raw intelligence labels.

Return JSON only with this exact shape:
{
  "debriefMission": string,
  "whatWeThinkWeLearned": string[],
  "primaryHypothesis": string,
  "recommendedProductAngle": {
    "productName": string | null,
    "fitLevel": "strong" | "moderate" | "weak" | "none",
    "why": string,
    "risk": string
  },
  "conversationStrategy": {
    "opening": string,
    "validateObservationQuestions": string[],
    "impactQuestions": string[],
    "opennessToChangeQuestions": string[],
    "closingQuestion": string
  },
  "recommendedAdvancementPath": {
    "path": "360 Experience" | "Case Commitment" | "No Action",
    "why": string
  },
  "desiredOutcome": string
}

CRITICAL rules:
- Every output field must trace to Commercial Readiness Framework dimension scores and evidence.
- NEVER output category labels: "workflow delays", "product signal", "clinical pain point", "workflow friction".
- whatWeThinkWeLearned bullets MUST reference framework dimensions (e.g. "Workflow Pain (72/100): ...").
- recommendedProductAngle: only recommend product when product_fit score >= 50 and confidence is Medium or High.
- recommendedAdvancementPath must align with framework scores:
  - Case Commitment only when evaluation_readiness >= 65 AND openness_to_change >= 50
  - 360 Experience when experience_360_readiness >= 50
  - No Action when workflow_pain < 35 AND openness_to_change < 35
- conversationStrategy.opennessToChangeQuestions must address gaps in openness_to_change score.
- productName: ACSIS, Endolumik, TelaBio, BioTissue, Skeletal Dynamics — or null.`;

function buildFrameworkContextBlock(framework: CommercialReadinessFramework): string {
  const dimensionLines = framework.dimensions.map((dimension) => {
    const evidence =
      dimension.evidence.length > 0
        ? dimension.evidence.map((item) => `    - "${item}"`).join("\n")
        : "    - (no direct excerpts)";
    const observations =
      dimension.supportingObservations.length > 0
        ? dimension.supportingObservations
            .map(
              (obs) =>
                `    - obs #${obs.observationIndex ?? "?"}: "${obs.excerpt.slice(0, 200)}" → ${obs.contribution}`,
            )
            .join("\n")
        : "    - (no linked observations)";

    return [
      `${dimension.label} (${dimension.id}): score ${dimension.score}/100, confidence ${dimension.confidence}`,
      `  Reasoning: ${dimension.reasoning}`,
      `  Evidence:`,
      evidence,
      `  Supporting observations:`,
      observations,
    ].join("\n");
  });

  return [
    "COMMERCIAL READINESS FRAMEWORK (completed — derive all coaching from this):",
    "",
    `Director summary: ${framework.directorSummary}`,
    `Primary commercial lever: ${COMMERCIAL_READINESS_DIMENSION_LABELS[framework.primaryCommercialLever]}`,
    `Primary risk: ${framework.primaryRisk}`,
    "",
    ...dimensionLines,
    "",
    "Derive the debrief strategy JSON from the framework above. Do not invent beliefs not supported by dimension scores and evidence.",
  ].join("\n");
}

function buildDebriefStrategyFromFrameworkUserPrompt(input: {
  context: AiDebriefStrategyBuilderContext;
  framework: CommercialReadinessFramework;
}): string {
  const provider = input.context.providerName?.trim() || "Unknown surgeon";

  return [
    `Provider: ${provider}`,
    `Completed observations: ${input.context.completedObservationCount}`,
    input.context.procedureLabel ? `Procedure focus: ${input.context.procedureLabel}` : "",
    "",
    buildFrameworkContextBlock(input.framework),
  ]
    .filter(Boolean)
    .join("\n");
}

function mapProductFitToFitLevel(score: number, confidence: string): "strong" | "moderate" | "weak" | "none" {
  if (score < 50) return "none";
  if (score >= 75 && confidence === "High") return "strong";
  if (score >= 50) return "moderate";
  return "weak";
}

function postProcessStrategyFromFramework(
  strategy: AiDebriefStrategyBuilderOutput,
  framework: CommercialReadinessFramework,
  context: AiDebriefStrategyBuilderContext,
): AiDebriefStrategyBuilderOutput {
  const productFit = getCommercialReadinessDimension(framework, "product_fit");
  const workflowPain = getCommercialReadinessDimension(framework, "workflow_pain");

  let processed = {
    ...strategy,
    debriefMission: strategy.debriefMission || framework.directorSummary,
    whatWeThinkWeLearned: enrichLearnedBulletsWithFramework(
      strategy.whatWeThinkWeLearned,
      framework,
    ),
    primaryHypothesis:
      strategy.primaryHypothesis ||
      `${workflowPain.label} (${workflowPain.score}/100): ${workflowPain.reasoning}`,
  };

  const fitLevel = mapProductFitToFitLevel(productFit.score, productFit.confidence);
  if (fitLevel === "none") {
    processed = {
      ...processed,
      recommendedProductAngle: {
        productName: null,
        fitLevel: "none",
        why:
          processed.recommendedProductAngle.why ||
          "Product fit score is not high enough to recommend a specific product — confirm workflow value first.",
        risk: framework.primaryRisk,
      },
    };
  } else if (processed.recommendedProductAngle.fitLevel === "none") {
    processed = {
      ...processed,
      recommendedProductAngle: {
        ...processed.recommendedProductAngle,
        fitLevel,
      },
    };
  }

  processed = alignAdvancementPathWithFramework(processed, framework);

  return polishAiDebriefStrategyBuilderOutput(
    sanitizeAiDebriefStrategyBuilderOutput(processed),
    context,
  );
}

function buildRulesFallbackStrategyFromFramework(
  context: AiDebriefStrategyBuilderContext,
  framework: CommercialReadinessFramework,
): AiDebriefStrategyBuilderOutput {
  const draft = synthesizeDebriefCommercialStrategyFromFramework({
    synthesis: context.commercialSynthesis,
    planMode: context.planMode,
    plan: context.plan,
    completedObservationCount: context.completedObservationCount,
    providerName: context.providerName,
    framework,
  });

  return postProcessStrategyFromFramework(draft, framework, context);
}

async function parseOpenAiStrategyFromFramework(
  content: string,
  framework: CommercialReadinessFramework,
  context: AiDebriefStrategyBuilderContext,
): Promise<AiDebriefStrategyBuilderOutput> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid JSON for debrief strategy");
  }

  const result = AiDebriefStrategyBuilderOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Debrief strategy shape invalid: ${result.error.message.slice(0, 300)}`);
  }

  return postProcessStrategyFromFramework(result.data, framework, context);
}

export async function generateDebriefStrategyFromFramework(input: {
  context: AiDebriefStrategyBuilderContext;
  framework: CommercialReadinessFramework;
  frameworkSource: AiDebriefStrategyBuilderSource;
}): Promise<{
  strategy: AiDebriefStrategyBuilderOutput;
  source: AiDebriefStrategyBuilderSource;
}> {
  const { context, framework, frameworkSource } = input;
  const fallback = buildRulesFallbackStrategyFromFramework(context, framework);

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { strategy: fallback, source: "rules_fallback" };
  }

  try {
    const content = await callOpenAiStructuredJson({
      systemPrompt: DEBRIEF_STRATEGY_FROM_FRAMEWORK_SYSTEM_PROMPT,
      userPrompt: buildDebriefStrategyFromFrameworkUserPrompt({ context, framework }),
      model:
        process.env.OPENAI_DEBRIEF_STRATEGY_MODEL?.trim() ||
        process.env.OPENAI_LOG_UPDATE_MAP_MODEL?.trim() ||
        undefined,
      temperature: 0.2,
      maxTokens: 2048,
    });

    const strategy = await parseOpenAiStrategyFromFramework(content, framework, context);
    const source: AiDebriefStrategyBuilderSource =
      frameworkSource === "openai" ? "openai" : "rules_fallback";

    return { strategy, source };
  } catch (error) {
    console.error(
      "[generateDebriefStrategyFromFramework] OpenAI failed — using rules fallback:",
      error instanceof Error ? error.message : error,
    );
    return { strategy: fallback, source: "rules_fallback" };
  }
}

export {
  buildDebriefStrategyFromFrameworkUserPrompt,
  buildFrameworkContextBlock,
  buildRulesFallbackStrategyFromFramework,
  frameworkAdvancementPathFromScores,
};
