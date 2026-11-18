/**
 * Resolve debrief prepare workspace — deterministic draft + persisted rep state.
 */

import { buildDebriefPrepareWorkspaceDraft } from "@/lib/surgical-sales/engagements/buildDebriefPrepareWorkspaceDraft";
import { buildDebriefPrepareStrategyView } from "@/lib/surgical-sales/engagements/buildDebriefPrepareStrategyView";
import {
  buildDebriefPrepareWorkspaceView,
  readDebriefPrepareWorkspaceSnapshot,
  type DebriefPrepareWorkspaceView,
} from "@/lib/surgical-sales/engagements/debriefPrepareWorkspace";
import { buildDebriefMotionIntelligenceFromContext } from "@/lib/surgical-sales/engagements/buildDebriefMotionIntelligence";
import {
  buildGenericAiDebriefStrategyBuilderOutput,
  shouldUseGenericDebriefStrategy,
} from "@/lib/surgical-sales/engagements/buildGenericAiDebriefStrategyBuilderOutput";
import {
  buildGenericCommercialReadinessFramework,
  buildDeterministicCommercialReadinessFramework,
} from "@/lib/surgical-sales/engagements/buildDeterministicCommercialReadinessFramework";
import { applyDebriefMotionIntelligenceToStrategy } from "@/lib/surgical-sales/engagements/applyDebriefMotionIntelligence";
import { synthesizeDebriefCommercialStrategyFromFramework } from "@/lib/surgical-sales/engagements/synthesizeDebriefCommercialStrategy";
import {
  polishAiDebriefStrategyBuilderOutput,
  sanitizeAiDebriefStrategyBuilderOutput,
} from "@/lib/surgical-sales/engagements/polishAiDebriefStrategyBuilderOutput";
import type { AiDebriefStrategyBuilderContext } from "@/lib/surgical-sales/engagements/loadAiDebriefStrategyBuilderContext";

export type ResolveDebriefPrepareWorkspaceResult =
  | { ok: true; workspace: DebriefPrepareWorkspaceView }
  | { ok: false; message: string; status: 400 | 404 | 500 };

function buildRulesFallbackStrategyView(context: AiDebriefStrategyBuilderContext) {
  const framework =
    context.planMode === "generic" || context.completedObservationCount === 0
      ? buildGenericCommercialReadinessFramework({
          providerName: context.providerName,
          completedObservationCount: context.completedObservationCount,
        })
      : buildDeterministicCommercialReadinessFramework({
          synthesis: context.commercialSynthesis,
          plan: context.plan,
          observationNotes: context.observationNotes,
          observationCorpus: context.observationCorpus,
          completedObservationCount: context.completedObservationCount,
        });

  const baseStrategy =
    context.planMode === "generic" || context.completedObservationCount === 0
      ? buildGenericAiDebriefStrategyBuilderOutput({
          providerName: context.providerName,
          completedObservationCount: context.completedObservationCount,
        })
      : synthesizeDebriefCommercialStrategyFromFramework({
          synthesis: context.commercialSynthesis,
          planMode: context.planMode,
          plan: context.plan,
          completedObservationCount: context.completedObservationCount,
          providerName: context.providerName,
          framework,
        });

  const motionIntelligence = buildDebriefMotionIntelligenceFromContext(context);
  const strategy = applyDebriefMotionIntelligenceToStrategy(
    polishAiDebriefStrategyBuilderOutput(
      sanitizeAiDebriefStrategyBuilderOutput(baseStrategy),
      context,
      framework,
    ),
    motionIntelligence,
  );

  return buildDebriefPrepareStrategyView({
    framework,
    strategy,
    source: shouldUseGenericDebriefStrategy(context) ? "generic" : "rules_fallback",
    frameworkSource: shouldUseGenericDebriefStrategy(context) ? "generic" : "rules_fallback",
    productCandidates: context.commercialSynthesis.productCandidates,
    productKnowledge: context.productKnowledge,
    providerName: context.providerName,
    organizationName: context.organizationName,
    procedureLabel: context.procedureLabel,
    completedObservationCount: context.completedObservationCount,
    observationCorpus: context.observationCorpus,
    motionIntelligence,
    competitorSummaries: context.commercialSynthesis.competitorUsage.map((item) => item.summary),
    introWorkflowHints: [
      ...context.commercialSynthesis.providerHistory,
      context.observationMission ?? "",
    ].filter(Boolean),
  });
}

export async function resolveDebriefPrepareWorkspaceForEngagement(input: {
  engagement: Record<string, unknown>;
  engagementId: string;
  userId: string;
}): Promise<ResolveDebriefPrepareWorkspaceResult> {
  const { loadAiDebriefStrategyBuilderContext } = await import(
    "@/lib/surgical-sales/engagements/loadAiDebriefStrategyBuilderContext"
  );

  const loaded = await loadAiDebriefStrategyBuilderContext(input);
  if (!loaded.ok) {
    return { ok: false, message: loaded.message, status: loaded.status };
  }

  const { context } = loaded;
  const strategyView = buildRulesFallbackStrategyView(context);
  const isFirstDebrief = (strategyView.conversionBrief.observationProgramSummary.programFacts.some(
    (fact) => /first provider debrief/i.test(fact.value),
  ));

  const draft = buildDebriefPrepareWorkspaceDraft({
    conversionBrief: strategyView.conversionBrief,
    commercialReadiness: strategyView.commercialReadiness,
    commercialSynthesis: context.commercialSynthesis,
    plan: context.plan,
    completedObservationCount: context.completedObservationCount,
    competitorSummaries: context.commercialSynthesis.competitorUsage.map((item) => item.summary),
    isFirstDebrief,
    providerName: context.providerName,
    procedureLabel: context.procedureLabel,
    observationIntelligence: context.observationIntelligence,
    universalFactsReadModel: context.universalFactsReadModel,
  });

  const saved = readDebriefPrepareWorkspaceSnapshot(input.engagement.debrief_intelligence_snapshot);
  const workspace = buildDebriefPrepareWorkspaceView({ draft, saved });

  return { ok: true, workspace };
}
