/**
 * Mission Board post-complete debrief dictation — apply analyzed intelligence to provider + engagement.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { analyzeEngagementDebriefNarrative } from "@/lib/surgical-sales/engagements/analyzeEngagementDebriefNarrative";
import {
  buildStoredTacticalDebriefNotes,
  engagementHasTacticalDebrief,
} from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { buildFieldEvidenceFromLogUpdate } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import { loadActorDisplayName } from "@/lib/surgical-sales/engagements/recordStartMissionOutcome";
import { applyLogUpdateToProvider } from "@/lib/surgical-sales/logUpdateApplyProvider";
import { buildLogUpdateProviderCommitPayload } from "@/lib/surgical-sales/logUpdateReviewCommit";
import { mergeMissionBoardDebriefDictationSnapshot } from "@/lib/surgical-sales/missionBoardDebriefComplete";
import { finalizeMissionBoardDebriefLogUpdate } from "@/lib/surgical-sales/missionBoardDebriefDictationPipeline";
import type { MissionBoardDebriefDictationReport } from "@/lib/surgical-sales/missionBoardDebriefDictationReport";
import type { PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";
import { SALES_PATHWAY_MIN_OBSERVATIONS } from "@/lib/surgical-sales/salesPathwayCanonical";
import { buildEngagementPathwayCompletionOutcomePatch } from "@/lib/surgical-sales/playbookPathwayOutcome";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import { contactDisplayName } from "@/lib/surgical-sales/labels";

export type ApplyMissionBoardDebriefDictationInput = {
  providerId: string;
  userId: string;
  engagementId: string;
  narrative: string;
};

export type ApplyMissionBoardDebriefDictationResult =
  | {
      ok: true;
      engagementId: string;
      report: MissionBoardDebriefDictationReport;
      mappingSource: "openai" | "keyword_fallback";
      fieldsApplied: number;
    }
  | { ok: false; message: string; status: number };

function mergeDebriefNotesWithDictation(existingNotes: string | null | undefined, dictation: string): string {
  const prior = String(existingNotes ?? "").trim();
  const block = `Post-complete dictation:\n${dictation.trim()}`;
  if (!prior) {
    return buildStoredTacticalDebriefNotes({ narrative: block });
  }
  if (prior.includes("Post-complete dictation:")) {
    return buildStoredTacticalDebriefNotes({
      narrative: `${prior.replace(/\nPost-complete dictation:[\s\S]*$/i, "").trim()}\n\n${block}`,
    });
  }
  return buildStoredTacticalDebriefNotes({ narrative: `${prior}\n\n${block}` });
}

async function loadPathwayGateForProvider(providerId: string): Promise<PathwayGateInput | null> {
  const { data: contact } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (!contact) return null;

  const [{ data: cases }, { data: engagements }] = await Promise.all([
    supabaseAdmin
      .from("surgical_sales_cases")
      .select("id, status")
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

export async function applyMissionBoardDebriefDictation(
  input: ApplyMissionBoardDebriefDictationInput,
): Promise<ApplyMissionBoardDebriefDictationResult> {
  const narrative = String(input.narrative ?? "").trim();
  if (narrative.length < 8) {
    return { ok: false, message: "Add a bit more detail before saving dictation.", status: 400 };
  }

  const engagement = await loadEngagementForPortalActor(input.engagementId, input.userId);
  if (!engagement) {
    return { ok: false, message: "Engagement not found", status: 404 };
  }

  if (String(engagement.provider_id ?? "") !== input.providerId) {
    return { ok: false, message: "Engagement does not match provider", status: 400 };
  }

  if (!isProviderDebriefEngagement(String(engagement.engagement_type ?? ""))) {
    return { ok: false, message: "Not a provider debrief engagement", status: 400 };
  }

  if (!engagementHasTacticalDebrief(engagement) && !engagement.debrief_completed) {
    return {
      ok: false,
      message: "Complete the debrief before adding post-complete dictation",
      status: 409,
    };
  }

  const { data: contactRow } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", input.providerId)
    .maybeSingle();
  if (!contactRow) {
    return { ok: false, message: "Provider not found", status: 404 };
  }
  if (!(await repCanAccessContact(input.userId, contactRow as never))) {
    return { ok: false, message: "Provider not found", status: 404 };
  }

  const pathwayGate = await loadPathwayGateForProvider(input.providerId);
  if (!pathwayGate) {
    return { ok: false, message: "Could not load provider pathway context", status: 500 };
  }

  const analyzed = await analyzeEngagementDebriefNarrative({
    engagement: engagement as Record<string, unknown>,
    narrative,
    actorUserId: input.userId,
  });
  if (!analyzed?.logUpdate) {
    return { ok: false, message: "Could not analyze debrief dictation", status: 500 };
  }

  const providerLabel = contactDisplayName(contactRow as never);
  const { logUpdate, report } = finalizeMissionBoardDebriefLogUpdate({
    parse: analyzed.logUpdate,
    dictation: narrative,
    providerContact: contactRow as Record<string, unknown>,
    providerLabel,
    pathwayGate,
    sourceLabel: "Mission Board debrief dictation",
  });

  const built = buildLogUpdateProviderCommitPayload(logUpdate);
  if ("error" in built) {
    return { ok: false, message: built.error, status: 400 };
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
      source_label: "Mission Board debrief dictation",
      source_engagement_id: input.engagementId,
    },
    fieldEvidence,
  });
  if (!applyResult.ok) {
    return { ok: false, message: applyResult.message, status: 500 };
  }

  const now = new Date().toISOString();
  const snapshotRecord = mergeMissionBoardDebriefDictationSnapshot(engagement.debrief_intelligence_snapshot, {
    dictation: narrative.slice(0, 4000),
    saved_at: now,
    accepted_db_keys: report.acceptedDbKeys,
    mapping_source: analyzed.mappingSource,
  });

  const { error: engagementErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({
      notes: mergeDebriefNotesWithDictation(engagement.notes as string | null | undefined, narrative),
      debrief_intelligence_snapshot: snapshotRecord,
      ...buildEngagementPathwayCompletionOutcomePatch(report),
      updated_at: now,
    })
    .eq("id", input.engagementId);

  if (engagementErr) {
    return { ok: false, message: engagementErr.message, status: 500 };
  }

  await logSurgicalSalesCrmAudit({
    action: "mission_board_debrief_dictation_applied",
    actorUserId: input.userId,
    meta: {
      entity_type: "provider",
      entity_id: input.providerId,
      engagement_id: input.engagementId,
      accepted_db_keys: report.acceptedDbKeys,
      mapping_source: analyzed.mappingSource,
      provider_stage_changed: report.providerStageChanged,
    },
  });

  return {
    ok: true,
    engagementId: input.engagementId,
    report,
    mappingSource: analyzed.mappingSource,
    fieldsApplied: applyResult.saved,
  };
}
