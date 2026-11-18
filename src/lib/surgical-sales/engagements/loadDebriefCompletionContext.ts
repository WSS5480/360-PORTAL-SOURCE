import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildDebriefPrepareObservedProgramFacts } from "@/lib/surgical-sales/engagements/buildDebriefPrepareObservedProgramFacts";
import type { DebriefCompletionContext } from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";
import { selectPrimaryHypothesisPattern } from "@/lib/surgical-sales/engagements/debriefIntelligencePrioritization";
import { isPostObservationProviderDebrief } from "@/lib/surgical-sales/engagements/isPostObservationProviderDebrief";
import { loadAiDebriefStrategyBuilderContext } from "@/lib/surgical-sales/engagements/loadAiDebriefStrategyBuilderContext";
import { readDebriefPrepareWorkspaceSnapshot } from "@/lib/surgical-sales/engagements/debriefPrepareWorkspace";
import { extractIncumbentProduct } from "@/lib/surgical-sales/engagements/debriefConversionCoaching";

export type LoadDebriefCompletionContextResult =
  | { ok: true; context: DebriefCompletionContext }
  | { ok: false; message: string; status: 400 | 404 | 500 };

export async function loadDebriefCompletionContext(input: {
  engagement: Record<string, unknown>;
  engagementId: string;
  userId: string;
}): Promise<LoadDebriefCompletionContextResult> {
  const loaded = await loadAiDebriefStrategyBuilderContext(input);
  if (!loaded.ok) {
    return { ok: false, message: loaded.message, status: loaded.status };
  }

  const { context } = loaded;
  const prepareWorkspace = readDebriefPrepareWorkspaceSnapshot(input.engagement.debrief_intelligence_snapshot);
  const incumbentProduct = extractIncumbentProduct({
    competitorSummaries: context.commercialSynthesis.competitorUsage.map((item) => item.summary),
    learnedBullets: context.observationNotes,
  });

  const observed = buildDebriefPrepareObservedProgramFacts({
    observationIntelligence: context.observationIntelligence,
    plan: context.plan,
    commercialSynthesis: context.commercialSynthesis,
    completedObservationCount: context.completedObservationCount,
    providerName: context.providerName,
    incumbentProduct,
  });

  const observationPatterns = observed.patterns.map((pattern) => ({
    label: pattern.label,
    count: pattern.count,
    total: pattern.total,
    importance: pattern.importance,
  }));
  const primaryHypothesisPattern = selectPrimaryHypothesisPattern(observationPatterns);
  const hypothesisText =
    prepareWorkspace?.hypothesis?.trim() ||
    (primaryHypothesisPattern
      ? `Confirm whether ${primaryHypothesisPattern.label.toLowerCase()} is worth addressing with the surgeon.`
      : "");

  const isPostObservation = isPostObservationProviderDebrief({
    engagementType: String(input.engagement.engagement_type ?? ""),
    completedObservationCount: context.completedObservationCount,
  });

  return {
    ok: true,
    context: {
      loadedAt: new Date().toISOString(),
      completedObservationCount: context.completedObservationCount,
      isPostObservationProviderDebrief: isPostObservation,
      prepareWorkspace,
      observationPatterns,
      primaryHypothesisPattern,
      hypothesisText,
      desiredOutcome: prepareWorkspace?.desiredOutcome ?? null,
      desiredOutcomeOther: prepareWorkspace?.desiredOutcomeOther ?? "",
    },
  };
}

export async function loadDebriefCompletionContextForEngagementId(input: {
  engagementId: string;
  userId: string;
}): Promise<LoadDebriefCompletionContextResult> {
  const { data: engagement, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("*")
    .eq("id", input.engagementId)
    .maybeSingle();

  if (error || !engagement) {
    return { ok: false, message: "Engagement not found.", status: 404 };
  }

  return loadDebriefCompletionContext({
    engagement: engagement as Record<string, unknown>,
    engagementId: input.engagementId,
    userId: input.userId,
  });
}
