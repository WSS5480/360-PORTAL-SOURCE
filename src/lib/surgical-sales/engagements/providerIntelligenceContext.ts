/**
 * Accumulated provider intelligence block for debrief strategy context (no new tables).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseProviderDebriefPlanSnapshot } from "@/lib/surgical-sales/engagements/buildProviderDebriefPlan";

export type PreObservationPrepContext = {
  impactOpeningStatement: string | null;
  probes: string | null;
  toolsResources: string | null;
  valueHypothesis: string | null;
  plannedClose: string | null;
  additionalNotes: string | null;
};

export type IntroCallIntelligenceSummary = {
  engagementId: string | null;
  snapshotSummary: string | null;
  updatedAt: string | null;
};

export type ProviderIntelligenceContext = {
  preObservationPrep: PreObservationPrepContext;
  introCallSummary: IntroCallIntelligenceSummary | null;
};

export const EMPTY_PROVIDER_INTELLIGENCE_CONTEXT: ProviderIntelligenceContext = {
  preObservationPrep: {
    impactOpeningStatement: null,
    probes: null,
    toolsResources: null,
    valueHypothesis: null,
    plannedClose: null,
    additionalNotes: null,
  },
  introCallSummary: null,
};

function trimOrNull(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

export function buildPreObservationPrepFromEngagement(
  engagement: Record<string, unknown>,
): PreObservationPrepContext {
  return {
    impactOpeningStatement: trimOrNull(engagement.pre_observation_impact_opening_statement),
    probes: trimOrNull(engagement.pre_observation_probes),
    toolsResources: trimOrNull(engagement.pre_observation_tools_resources),
    valueHypothesis: trimOrNull(engagement.pre_observation_value_hypothesis),
    plannedClose: trimOrNull(engagement.pre_observation_planned_close),
    additionalNotes: trimOrNull(engagement.pre_observation_additional_notes),
  };
}

function introCallSnapshotSummary(raw: unknown): string | null {
  const snapshot = parseProviderDebriefPlanSnapshot(raw);
  if (!snapshot) return null;

  const parts = [
    snapshot.context.observationMission,
    snapshot.whatWeLearned[0]?.signal,
    snapshot.longitudinalIntelligence.recurringPainPoints[0]?.signal,
  ]
    .map((value) => trimOrNull(value))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" — ") : null;
}

export async function loadIntroCallIntelligenceSummary(
  supabase: SupabaseClient,
  input: { providerId: string; salesRepId: string },
): Promise<IntroCallIntelligenceSummary | null> {
  const providerId = input.providerId.trim();
  const salesRepId = input.salesRepId.trim();
  if (!providerId || !salesRepId) return null;

  const { data, error } = await supabase
    .from("surgical_sales_engagements")
    .select("id, debrief_intelligence_snapshot, updated_at")
    .eq("provider_id", providerId)
    .eq("engagement_type", "intro_call")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[loadIntroCallIntelligenceSummary]", error.message);
    }
    return null;
  }

  const row = data as Record<string, unknown>;
  return {
    engagementId: trimOrNull(row.id),
    snapshotSummary: introCallSnapshotSummary(row.debrief_intelligence_snapshot),
    updatedAt: trimOrNull(row.updated_at),
  };
}

export function buildProviderIntelligenceContext(input: {
  engagement: Record<string, unknown>;
  introCallSummary?: IntroCallIntelligenceSummary | null;
}): ProviderIntelligenceContext {
  return {
    preObservationPrep: buildPreObservationPrepFromEngagement(input.engagement),
    introCallSummary: input.introCallSummary ?? null,
  };
}

export function formatProviderIntelligenceContextForPrompt(
  context: ProviderIntelligenceContext,
): string {
  const prep = context.preObservationPrep;
  const prepLines = [
    prep.impactOpeningStatement
      ? `- Impact opening: ${prep.impactOpeningStatement}`
      : null,
    prep.probes ? `- Probes: ${prep.probes}` : null,
    prep.valueHypothesis ? `- Value hypothesis: ${prep.valueHypothesis}` : null,
    prep.plannedClose ? `- Planned close: ${prep.plannedClose}` : null,
    prep.toolsResources ? `- Tools/resources: ${prep.toolsResources}` : null,
    prep.additionalNotes ? `- Additional notes: ${prep.additionalNotes}` : null,
  ].filter(Boolean);

  const intro = context.introCallSummary;
  const introBlock =
    intro?.snapshotSummary || intro?.engagementId
      ? [
          intro.engagementId ? `- Intro engagement: ${intro.engagementId}` : null,
          intro.snapshotSummary ? `- Intro intel: ${intro.snapshotSummary}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : "- (no intro-call intelligence on file)";

  const prepBlock =
    prepLines.length > 0 ? prepLines.join("\n") : "- (no rep-curated pre-observation prep on file)";

  return [
    "Provider intelligence context (structured — not scored automatically):",
    "",
    "Pre-observation prep (current debrief engagement):",
    prepBlock,
    "",
    "Intro-call intelligence:",
    introBlock,
  ].join("\n");
}
