/**
 * Shared Mission Board debrief intelligence apply — reused by Dictate & Complete and post-complete dictation.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { analyzeEngagementDebriefNarrative } from "@/lib/surgical-sales/engagements/analyzeEngagementDebriefNarrative";
import { buildFieldEvidenceFromLogUpdate } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import { loadActorDisplayName } from "@/lib/surgical-sales/engagements/recordStartMissionOutcome";
import { applyLogUpdateToProvider } from "@/lib/surgical-sales/logUpdateApplyProvider";
import { buildLogUpdateProviderCommitPayload } from "@/lib/surgical-sales/logUpdateReviewCommit";
import { mergeDebriefCompletionAnalyzeSnapshot } from "@/lib/surgical-sales/engagements/mergeDebriefCompletionSnapshot";
import { mergeMissionBoardDebriefDictationSnapshot } from "@/lib/surgical-sales/missionBoardDebriefComplete";
import { finalizeMissionBoardDebriefLogUpdate } from "@/lib/surgical-sales/missionBoardDebriefDictationPipeline";
import type { MissionBoardDebriefDictationReport } from "@/lib/surgical-sales/missionBoardDebriefDictationReport";
import type { PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";
import { SALES_PATHWAY_MIN_OBSERVATIONS } from "@/lib/surgical-sales/salesPathwayCanonical";
import { contactDisplayName } from "@/lib/surgical-sales/labels";

export async function loadPathwayGateForProvider(providerId: string): Promise<PathwayGateInput | null> {
  const { data: contact } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (!contact) return null;

  const [{ data: cases }, { data: engagements }] = await Promise.all([
    supabaseAdmin
      .from("surgical_sales_cases")
      .select("id, status, case_type, debrief_completed, engagement_id")
      .eq("provider_id", providerId)
      .limit(SALES_PATHWAY_MIN_OBSERVATIONS + 2),
    supabaseAdmin
      .from("surgical_sales_engagements")
      .select("id, engagement_type, status, debrief_completed")
      .eq("provider_id", providerId)
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);

  return {
    contact: contact as Record<string, unknown>,
    cases: (cases ?? []) as PathwayGateInput["cases"],
    engagements: (engagements ?? []) as PathwayGateInput["engagements"],
  };
}

export async function applyMissionBoardDebriefIntelligenceFromNarrative(input: {
  providerId: string;
  userId: string;
  engagementId: string;
  engagement: Record<string, unknown>;
  narrative: string;
  sourceLabel?: string;
}): Promise<
  | {
      ok: true;
      report: MissionBoardDebriefDictationReport;
      mappingSource: "openai" | "keyword_fallback";
      fieldsApplied: number;
      snapshot: Record<string, unknown>;
    }
  | { ok: false; message: string }
> {
  const narrative = input.narrative.trim();
  if (narrative.length < 8) {
    return { ok: false, message: "Add a bit more detail before extracting intelligence." };
  }

  const { data: contactRow } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", input.providerId)
    .maybeSingle();
  if (!contactRow) {
    return { ok: false, message: "Provider not found" };
  }

  const pathwayGate = await loadPathwayGateForProvider(input.providerId);
  if (!pathwayGate) {
    return { ok: false, message: "Could not load provider pathway context" };
  }

  const analyzed = await analyzeEngagementDebriefNarrative({
    engagement: input.engagement,
    narrative,
    actorUserId: input.userId,
  });
  if (!analyzed?.logUpdate) {
    return { ok: false, message: "Could not analyze debrief dictation" };
  }

  const providerLabel = contactDisplayName(contactRow as never);
  const skipAutoAccept = analyzed.isPostObservationProviderDebrief;
  const { logUpdate, report } = finalizeMissionBoardDebriefLogUpdate({
    parse: analyzed.logUpdate,
    dictation: narrative,
    providerContact: contactRow as Record<string, unknown>,
    providerLabel,
    pathwayGate,
    sourceLabel: input.sourceLabel ?? "Mission Board debrief dictation",
    skipAutoAccept,
  });

  let fieldsApplied = 0;
  if (!skipAutoAccept) {
    const built = buildLogUpdateProviderCommitPayload(logUpdate);
    if ("error" in built) {
      return { ok: false, message: built.error };
    }

    const actorName = await loadActorDisplayName(input.userId);
    const fieldEvidence = buildFieldEvidenceFromLogUpdate(logUpdate);
    const applyResult = await applyLogUpdateToProvider({
      providerId: input.providerId,
      actorUserId: input.userId,
      actorName,
      sourceText: built.sourceText,
      saveAsNote: built.saveAsNote,
      fieldPatches: built.fieldPatches,
      captureContext: {
        source_type: "engagement",
        source_label: input.sourceLabel ?? "Mission Board debrief dictation",
        source_engagement_id: input.engagementId,
        declared_source_type: "debrief",
      },
      fieldEvidence,
    });
    if (!applyResult.ok) {
      return { ok: false, message: applyResult.message };
    }
    fieldsApplied = applyResult.saved;
  }

  const now = new Date().toISOString();
  let snapshot = mergeMissionBoardDebriefDictationSnapshot(input.engagement.debrief_intelligence_snapshot, {
    dictation: narrative.slice(0, 4000),
    saved_at: now,
    accepted_db_keys: report.acceptedDbKeys,
    mapping_source: analyzed.mappingSource,
  });

  if (
    analyzed.isPostObservationProviderDebrief &&
    analyzed.debriefCompletionContext &&
    analyzed.debriefNextStep
  ) {
    snapshot = mergeDebriefCompletionAnalyzeSnapshot(snapshot, {
      completionContext: analyzed.debriefCompletionContext,
      validationResults: analyzed.debriefValidationResults,
      nextStep: analyzed.debriefNextStep,
      analyzedAt: now,
    });
  }

  return {
    ok: true,
    report,
    mappingSource: analyzed.mappingSource,
    fieldsApplied,
    snapshot,
  };
}
