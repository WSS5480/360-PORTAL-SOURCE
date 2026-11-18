/**
 * AI Debrief Strategy Builder — two-phase: Commercial Readiness Framework, then coaching.
 */

import {
  buildDeterministicCommercialReadinessFramework,
  buildGenericCommercialReadinessFramework,
} from "@/lib/surgical-sales/engagements/buildDeterministicCommercialReadinessFramework";
import {
  buildGenericAiDebriefStrategyBuilderOutput,
  shouldUseGenericDebriefStrategy,
} from "@/lib/surgical-sales/engagements/buildGenericAiDebriefStrategyBuilderOutput";
import type {
  AiDebriefStrategyBuilderOutput,
  AiDebriefStrategyBuilderResult,
  AiDebriefStrategyBuilderSource,
  GenerateAiDebriefStrategyBuilderResult,
} from "@/lib/surgical-sales/engagements/aiDebriefStrategyBuilderTypes";
import type { CommercialReadinessFramework } from "@/lib/surgical-sales/engagements/commercialReadinessFrameworkTypes";
import type { DebriefPrepareStrategyView } from "@/lib/surgical-sales/engagements/buildDebriefPrepareStrategyView";
import { buildDebriefPrepareStrategyView } from "@/lib/surgical-sales/engagements/buildDebriefPrepareStrategyView";
import { buildCommercialReadinessUserPrompt } from "@/lib/surgical-sales/engagements/generateCommercialReadinessFramework";
import { generateCommercialReadinessFramework } from "@/lib/surgical-sales/engagements/generateCommercialReadinessFramework";
import { generateDebriefStrategyFromFramework } from "@/lib/surgical-sales/engagements/generateDebriefStrategyFromFramework";
import type { AiDebriefStrategyBuilderContext } from "@/lib/surgical-sales/engagements/loadAiDebriefStrategyBuilderContext";
import {
  polishAiDebriefStrategyBuilderOutput,
  sanitizeAiDebriefStrategyBuilderOutput,
} from "@/lib/surgical-sales/engagements/polishAiDebriefStrategyBuilderOutput";
import { applyDebriefMotionIntelligenceToStrategy } from "@/lib/surgical-sales/engagements/applyDebriefMotionIntelligence";
import { buildDebriefMotionIntelligenceFromContext } from "@/lib/surgical-sales/engagements/buildDebriefMotionIntelligence";
import { synthesizeDebriefCommercialStrategyFromFramework } from "@/lib/surgical-sales/engagements/synthesizeDebriefCommercialStrategy";

export type ResolveDebriefPrepareStrategyResult =
  | { ok: true; view: DebriefPrepareStrategyView }
  | { ok: false; message: string; status: 400 | 404 | 500 };

export function resolveFrameworkForContext(
  context: AiDebriefStrategyBuilderContext,
  framework?: CommercialReadinessFramework,
): CommercialReadinessFramework {
  if (framework) return framework;

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

function buildRulesFallbackAiDebriefStrategy(
  context: AiDebriefStrategyBuilderContext,
  framework?: CommercialReadinessFramework,
): AiDebriefStrategyBuilderOutput {
  const resolvedFramework = resolveFrameworkForContext(context, framework);
  const draft = synthesizeDebriefCommercialStrategyFromFramework({
    synthesis: context.commercialSynthesis,
    planMode: context.planMode,
    plan: context.plan,
    completedObservationCount: context.completedObservationCount,
    providerName: context.providerName,
    framework: resolvedFramework,
  });

  return polishAiDebriefStrategyBuilderOutput(
    sanitizeAiDebriefStrategyBuilderOutput(draft),
    context,
    resolvedFramework,
  );
}

export async function generateAiDebriefStrategyBuilder(
  context: AiDebriefStrategyBuilderContext,
): Promise<AiDebriefStrategyBuilderResult> {
  const phase1 = await generateCommercialReadinessFramework(context);

  const phase2 = await generateDebriefStrategyFromFramework({
    context,
    framework: phase1.framework,
    frameworkSource: phase1.source,
  });

  const source: AiDebriefStrategyBuilderSource =
    phase1.source === "openai" && phase2.source === "openai"
      ? "openai"
      : "rules_fallback";

  return {
    framework: phase1.framework,
    strategy: phase2.strategy,
    source,
    frameworkSource: phase1.source,
  };
}

export async function resolveDebriefPrepareStrategyForEngagement(input: {
  engagement: Record<string, unknown>;
  engagementId: string;
  userId: string;
}): Promise<ResolveDebriefPrepareStrategyResult> {
  const { loadAiDebriefStrategyBuilderContext } = await import(
    "@/lib/surgical-sales/engagements/loadAiDebriefStrategyBuilderContext"
  );

  const loaded = await loadAiDebriefStrategyBuilderContext(input);
  if (!loaded.ok) {
    return { ok: false, message: loaded.message, status: loaded.status };
  }

  const { context } = loaded;

  if (shouldUseGenericDebriefStrategy(context)) {
    const framework = buildGenericCommercialReadinessFramework({
      providerName: context.providerName,
      completedObservationCount: context.completedObservationCount,
    });
    const generic = buildGenericAiDebriefStrategyBuilderOutput({
      providerName: context.providerName,
      completedObservationCount: context.completedObservationCount,
    });
    const motionIntelligence = buildDebriefMotionIntelligenceFromContext(context);
    return {
      ok: true,
      view: buildDebriefPrepareStrategyView({
        framework,
        strategy: polishAiDebriefStrategyBuilderOutput(
          sanitizeAiDebriefStrategyBuilderOutput(generic),
          context,
          framework,
        ),
        source: "generic",
        frameworkSource: "generic",
        productCandidates: context.commercialSynthesis.productCandidates,
        productKnowledge: context.productKnowledge,
        providerName: context.providerName,
        organizationName: context.organizationName,
        procedureLabel: context.procedureLabel,
        completedObservationCount: context.completedObservationCount,
        observationCorpus: context.observationCorpus,
        motionIntelligence,
        competitorSummaries: context.commercialSynthesis.competitorUsage.map(
          (item) => item.summary,
        ),
        introWorkflowHints: [
          ...context.commercialSynthesis.providerHistory,
          context.observationMission ?? "",
        ].filter(Boolean),
      }),
    };
  }

  const generated = await generateAiDebriefStrategyBuilder(context);
  const motionIntelligence = buildDebriefMotionIntelligenceFromContext(context);
  const strategy = applyDebriefMotionIntelligenceToStrategy(
    generated.strategy,
    motionIntelligence,
  );

  return {
    ok: true,
    view: buildDebriefPrepareStrategyView({
      framework: generated.framework,
      strategy,
      source: generated.source,
      frameworkSource: generated.frameworkSource,
      productCandidates: context.commercialSynthesis.productCandidates,
      productKnowledge: context.productKnowledge,
      providerName: context.providerName,
      organizationName: context.organizationName,
      procedureLabel: context.procedureLabel,
      completedObservationCount: context.completedObservationCount,
      observationCorpus: context.observationCorpus,
      motionIntelligence,
      competitorSummaries: context.commercialSynthesis.competitorUsage.map(
        (item) => item.summary,
      ),
      introWorkflowHints: [
        ...context.commercialSynthesis.providerHistory,
        context.observationMission ?? "",
      ].filter(Boolean),
    }),
  };
}

export async function runAiDebriefStrategyBuilderForEngagement(input: {
  engagement: Record<string, unknown>;
  engagementId: string;
  userId: string;
}): Promise<GenerateAiDebriefStrategyBuilderResult> {
  const resolved = await resolveDebriefPrepareStrategyForEngagement(input);
  if (!resolved.ok) {
    return { ok: false, message: resolved.message, status: resolved.status };
  }

  const { view } = resolved;
  return {
    ok: true,
    framework: view.commercialReadiness.framework,
    strategy: {
      debriefMission: view.missionWhy,
      whatWeThinkWeLearned: view.whatWeThinkWeLearned,
      primaryHypothesis: view.missionSuccess,
      recommendedProductAngle: {
        productName: view.recommendedProductAngle.productName,
        fitLevel: view.recommendedProductAngle.fitLevel,
        why: view.recommendedProductAngle.why,
        risk: view.recommendedProductAngle.risk,
      },
      conversationStrategy: view.conversationStrategy,
      recommendedAdvancementPath: {
        path: view.advancementPaths.find((path) => path.recommended)?.path ?? "No Action",
        why:
          view.advancementPaths.find((path) => path.recommended)?.why ??
          "Hold until workflow value and surgeon appetite are confirmed.",
      },
      desiredOutcome: view.desiredOutcome,
    },
    source: view.source === "generic" ? "rules_fallback" : view.source,
  };
}

export {
  buildRulesFallbackAiDebriefStrategy,
  buildCommercialReadinessUserPrompt as buildAiDebriefStrategyUserPrompt,
};

export { sanitizeAiDebriefStrategyBuilderOutput, polishAiDebriefStrategyBuilderOutput } from "./polishAiDebriefStrategyBuilderOutput";
