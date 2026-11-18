/**
 * Mission Board intro call Dictate & Complete — mark debrief done and apply intelligence inline.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import {
  buildEngagementTacticalDebriefCommitPatch,
  buildStoredTacticalDebriefNotes,
} from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { isIntroCallPathwayMission } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import {
  buildEngagementDebriefVisitPersistFields,
} from "@/lib/surgical-sales/engagements/engagementDebriefVisitRecord";
import { syncIntroCallProviderFromVisitOutcome } from "@/lib/surgical-sales/engagements/introCallDebriefFirstCompletion";
import { applyMissionBoardDebriefIntelligenceFromNarrative } from "@/lib/surgical-sales/missionBoardDebriefIntelligenceApply";
import type { MissionBoardDebriefDictationReport } from "@/lib/surgical-sales/missionBoardDebriefDictationReport";
import { buildEngagementPathwayCompletionOutcomePatch } from "@/lib/surgical-sales/playbookPathwayOutcome";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import { beginEngagementCallForActor } from "@/lib/surgical-sales/engagements/beginEngagementCall";
import { endEngagementCallForActor } from "@/lib/surgical-sales/engagements/endEngagementCall";
import { resolveMissionBoardDictateCompleteOutcome } from "@/lib/surgical-sales/missionBoardIntroCallCompleteClient";
import { syncEngagementDebriefFollowUpTasks } from "@/lib/surgical-sales/engagements/syncEngagementDebriefFollowUpTasks";
import { parseDebriefIntelligenceSnapshot } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";

const COMPLETED_STATUSES = new Set(["completed", "done", "closed"]);
const PRE_ACTIVE_STATUSES = new Set(["planned", "scheduled", "confirmed"]);

async function completeIntroCallEngagementForSavedCapture(input: {
  engagement: Record<string, unknown>;
  engagementId: string;
  userId: string;
  narrative?: string;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const status = String(input.engagement.status ?? "").trim().toLowerCase();
  if (COMPLETED_STATUSES.has(status)) return { ok: true };
  if (status === "cancelled") {
    return { ok: false, message: "This engagement is cancelled.", status: 409 };
  }

  if (PRE_ACTIVE_STATUSES.has(status)) {
    const begin = await beginEngagementCallForActor(input.engagementId, input.userId, {
      allowUnpreparedBegin: true,
    });
    if (!begin.ok) {
      return { ok: false, message: begin.error, status: begin.status };
    }
  }

  const end = await endEngagementCallForActor({
    engagementId: input.engagementId,
    userId: input.userId,
    outcomeId: resolveMissionBoardDictateCompleteOutcome(
      String(input.engagement.engagement_type ?? "intro_call"),
    ),
    liveNotes: input.narrative,
  });
  if (!end.ok) {
    return { ok: false, message: end.error, status: end.status };
  }
  return { ok: true };
}

export type CompleteMissionBoardIntroCallDictationInput = {
  providerId: string;
  userId: string;
  engagementId: string;
  narrative: string;
};

export type CompleteMissionBoardIntroCallDictationResult =
  | {
      ok: true;
      engagementId: string;
      report: MissionBoardDebriefDictationReport;
      mappingSource: "openai" | "keyword_fallback";
      fieldsApplied: number;
    }
  | { ok: false; message: string; status: number };

export async function completeMissionBoardIntroCallDictation(
  input: CompleteMissionBoardIntroCallDictationInput,
): Promise<CompleteMissionBoardIntroCallDictationResult> {
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

  if (!isIntroCallPathwayMission(String(engagement.engagement_type ?? ""))) {
    return { ok: false, message: "Not an intro call engagement", status: 400 };
  }

  const completion = await completeIntroCallEngagementForSavedCapture({
    engagement: engagement as Record<string, unknown>,
    engagementId: input.engagementId,
    userId: input.userId,
    narrative,
  });
  if (!completion.ok) {
    return completion;
  }

  if (Boolean(engagement.debrief_completed)) {
    return { ok: false, message: "This intro call debrief is already completed", status: 409 };
  }

  const { data: contactRow } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("id, organization_id, account_id, created_by, created_by_user_id")
    .eq("id", input.providerId)
    .maybeSingle();
  if (!contactRow) {
    return { ok: false, message: "Provider not found", status: 404 };
  }
  if (!(await repCanAccessContact(input.userId, contactRow as never))) {
    return { ok: false, message: "Provider not found", status: 404 };
  }

  const intelligence = await applyMissionBoardDebriefIntelligenceFromNarrative({
    providerId: input.providerId,
    userId: input.userId,
    engagementId: input.engagementId,
    engagement: {
      ...(engagement as Record<string, unknown>),
      debrief_completed: true,
      status: "completed",
    },
    narrative,
    sourceLabel: "Mission Board Intro Dictate & Complete",
  });
  if (!intelligence.ok) {
    return { ok: false, message: intelligence.message, status: 500 };
  }

  const now = new Date().toISOString();
  const visitFields = buildEngagementDebriefVisitPersistFields({
    snapshot: {
      version: 1,
      savedAt: now,
      narrative,
      analysis: null,
      logUpdate: null,
      propagationTargets: [],
      discoveryContext: null,
      providerContactSnapshot: null,
      proposedContacts: [],
    },
    narrative,
    engagementType: String(engagement.engagement_type ?? "intro_call"),
    existingNextAction: String(engagement.next_action ?? "").trim() || null,
    existingDebriefSnapshot: intelligence.snapshot,
  });
  const mergedSnapshot = {
    ...(intelligence.snapshot as Record<string, unknown>),
    ...(visitFields.debrief_intelligence_snapshot as Record<string, unknown>),
  };

  const { error: engagementErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({
      notes: buildStoredTacticalDebriefNotes({ narrative }),
      debrief_completed: true,
      debrief_completed_at: now,
      debrief_intelligence_snapshot: mergedSnapshot,
      next_action: visitFields.next_action,
      follow_up_tasks: visitFields.follow_up_tasks,
      ...buildEngagementPathwayCompletionOutcomePatch(intelligence.report),
      updated_at: now,
    })
    .eq("id", input.engagementId);

  if (engagementErr) {
    return { ok: false, message: engagementErr.message, status: 500 };
  }

  await syncIntroCallProviderFromVisitOutcome({
    engagement: {
      ...(engagement as Record<string, unknown>),
      debrief_intelligence_snapshot: mergedSnapshot,
      next_action: visitFields.next_action,
    },
    userId: input.userId,
    narrative,
  });

  await logSurgicalSalesCrmAudit({
    action: "mission_board_intro_call_dictate_complete",
    actorUserId: input.userId,
    meta: {
      entity_type: "provider",
      entity_id: input.providerId,
      engagement_id: input.engagementId,
      accepted_db_keys: intelligence.report.acceptedDbKeys,
      mapping_source: intelligence.mappingSource,
      provider_stage_changed: intelligence.report.providerStageChanged,
    },
  });

  return {
    ok: true,
    engagementId: input.engagementId,
    report: intelligence.report,
    mappingSource: intelligence.mappingSource,
    fieldsApplied: intelligence.fieldsApplied,
  };
}

export async function finalizeMissionBoardIntroCallDebrief(input: {
  providerId: string;
  userId: string;
  engagementId: string;
  narrative?: string;
}): Promise<{ ok: true; engagementId: string } | { ok: false; message: string; status: number }> {
  const engagement = await loadEngagementForPortalActor(input.engagementId, input.userId);
  if (!engagement) {
    return { ok: false, message: "Engagement not found", status: 404 };
  }

  if (String(engagement.provider_id ?? "") !== input.providerId) {
    return { ok: false, message: "Engagement does not match provider", status: 400 };
  }

  if (!isIntroCallPathwayMission(String(engagement.engagement_type ?? ""))) {
    return { ok: false, message: "Not an intro call engagement", status: 400 };
  }

  const completion = await completeIntroCallEngagementForSavedCapture({
    engagement: engagement as Record<string, unknown>,
    engagementId: input.engagementId,
    userId: input.userId,
    narrative: input.narrative,
  });
  if (!completion.ok) {
    return completion;
  }

  if (Boolean(engagement.debrief_completed)) {
    const narrative = String(input.narrative ?? "").trim();
    if (narrative) {
      const { data: contactRow } = await supabaseAdmin
        .from("surgical_sales_contacts")
        .select("*")
        .eq("id", input.providerId)
        .maybeSingle();
      const snapshot = parseDebriefIntelligenceSnapshot(engagement.debrief_intelligence_snapshot);
      await syncEngagementDebriefFollowUpTasks({
        engagementId: input.engagementId,
        actorUserId: input.userId,
        narrative,
        logUpdate: snapshot?.logUpdate ?? null,
        proposedContacts: snapshot?.proposedContacts ?? [],
        providerContact: (contactRow as Record<string, unknown> | null) ?? null,
      }).catch(() => undefined);
    }
    return { ok: true, engagementId: input.engagementId };
  }

  const { data: contactRow } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("id, organization_id, account_id, created_by, created_by_user_id")
    .eq("id", input.providerId)
    .maybeSingle();
  if (!contactRow) {
    return { ok: false, message: "Provider not found", status: 404 };
  }
  if (!(await repCanAccessContact(input.userId, contactRow as never))) {
    return { ok: false, message: "Provider not found", status: 404 };
  }

  const narrative = String(input.narrative ?? "").trim();
  const patch = buildEngagementTacticalDebriefCommitPatch({
    narrative,
    completeEngagement: false,
  });

  const { error: engagementErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update(patch)
    .eq("id", input.engagementId);

  if (engagementErr) {
    return { ok: false, message: engagementErr.message, status: 500 };
  }

  const { data: fullContact } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", input.providerId)
    .maybeSingle();
  const snapshot = parseDebriefIntelligenceSnapshot(engagement.debrief_intelligence_snapshot);
  await syncEngagementDebriefFollowUpTasks({
    engagementId: input.engagementId,
    actorUserId: input.userId,
    narrative,
    logUpdate: snapshot?.logUpdate ?? null,
    proposedContacts: snapshot?.proposedContacts ?? [],
    providerContact: (fullContact as Record<string, unknown> | null) ?? null,
  }).catch(() => undefined);

  await logSurgicalSalesCrmAudit({
    action: "mission_board_intro_call_debrief_finalized",
    actorUserId: input.userId,
    meta: {
      entity_type: "provider",
      entity_id: input.providerId,
      engagement_id: input.engagementId,
      has_narrative: narrative.length > 0,
    },
  });

  return { ok: true, engagementId: input.engagementId };
}
