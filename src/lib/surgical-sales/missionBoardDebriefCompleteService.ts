/**
 * Mission Board quick-complete — reuses endEngagementCall, tactical debrief fields, and evaluation path service.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { endEngagementCallForActor } from "@/lib/surgical-sales/engagements/endEngagementCall";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import {
  buildStoredTacticalDebriefNotes,
} from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import {
  loadActorDisplayName,
} from "@/lib/surgical-sales/engagements/recordStartMissionOutcome";
import {
  mergeStartMissionSnapshot,
  readStartMissionSnapshot,
} from "@/lib/surgical-sales/engagements/startMissionSnapshot";
import {
  resolveOrCreateMissionBoardDebriefEngagement,
} from "@/lib/surgical-sales/missionBoardDebriefLauncherService";
import { applyMissionBoardDebriefIntelligenceFromNarrative } from "@/lib/surgical-sales/missionBoardDebriefIntelligenceApply";
import { saveMissionBoardEvaluationPath } from "@/lib/surgical-sales/missionBoardEvaluationPathSave";
import { PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED } from "@/lib/surgical-sales/pathway/pathwayContactFlags";
import type { SalesPathwayEvaluationActivity } from "@/lib/surgical-sales/salesPathwayCanonical";
import { buildEngagementPathwayCompletionOutcomePatch } from "@/lib/surgical-sales/playbookPathwayOutcome";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import {
  mergeMissionBoardDebriefCompleteSnapshot,
  MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_LABELS,
  MISSION_BOARD_DEBRIEF_OPPORTUNITY_LABELS,
  type MissionBoardDebriefCompleteOpportunityResult,
  type MissionBoardDebriefCompleteOutcomeId,
  mapMissionBoardDebriefOutcomeToStartMissionId,
} from "@/lib/surgical-sales/missionBoardDebriefComplete";

export type CompleteMissionBoardProviderDebriefInput = {
  providerId: string;
  userId: string;
  engagementId: string;
  outcomeId: MissionBoardDebriefCompleteOutcomeId;
  opportunityResult: MissionBoardDebriefCompleteOpportunityResult;
  evaluationPath?: SalesPathwayEvaluationActivity | null;
  dictation: string;
  nextStep?: string | null;
  /** Status modal bypass — record outcome on a planned debrief without Start/Active. */
  pathwayStatusBypass?: boolean;
};

export type CompleteMissionBoardProviderDebriefResult =
  | { ok: true; engagementId: string; advancedToEvaluation: boolean }
  | { ok: false; message: string; status: number };

async function ensureActiveEngagementSession(
  engagementId: string,
  debriefSnapshot: unknown,
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  if (readStartMissionSnapshot(debriefSnapshot)) {
    return { ok: true };
  }
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({
      updated_at: now,
      debrief_intelligence_snapshot: mergeStartMissionSnapshot(debriefSnapshot, {
        opened_at: now,
        live_notes: "",
      }),
    })
    .eq("id", engagementId);
  if (error) {
    return { ok: false, message: error.message, status: 500 };
  }
  return { ok: true };
}

export async function completeMissionBoardProviderDebrief(
  input: CompleteMissionBoardProviderDebriefInput,
): Promise<CompleteMissionBoardProviderDebriefResult> {
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

  if (Boolean(engagement.debrief_completed)) {
    return { ok: false, message: "This debrief is already completed", status: 409 };
  }

  const status = String(engagement.status ?? "").trim().toLowerCase();
  const needsNotesOnly = (status === "completed" || status === "done" || status === "closed") && !engagement.debrief_completed;
  // Status modal can log pathway outcome on any scheduled debrief — not only status "planned".
  const PRE_ACTIVE_DEBRIEF_STATUSES = new Set(["planned", "scheduled", "confirmed"]);
  const pathwayStatusBypassEligible =
    Boolean(input.pathwayStatusBypass) && PRE_ACTIVE_DEBRIEF_STATUSES.has(status);
  if (status !== "in_progress" && status !== "active" && !needsNotesOnly && !pathwayStatusBypassEligible) {
    return { ok: false, message: "Only active or note-pending debriefs can be completed from Mission Board", status: 409 };
  }

  const { data: contact } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("id, organization_id, account_id, created_by, created_by_user_id")
    .eq("id", input.providerId)
    .maybeSingle();
  if (!contact) {
    return { ok: false, message: "Provider not found", status: 404 };
  }
  if (!(await repCanAccessContact(input.userId, contact as never))) {
    return { ok: false, message: "Provider not found", status: 404 };
  }

  if (input.opportunityResult === "confirmed" && !input.evaluationPath) {
    return { ok: false, message: "Select an evaluation path when opportunity is confirmed", status: 400 };
  }

  const dictation = String(input.dictation ?? "").trim();
  const nextStep = String(input.nextStep ?? "").trim();
  const notesBody = nextStep ? `${dictation}\n\nNext step: ${nextStep}` : dictation;

  const sessionReady = await ensureActiveEngagementSession(
    input.engagementId,
    engagement.debrief_intelligence_snapshot,
  );
  if (!sessionReady.ok) return sessionReady;

  const outcomeLabel = MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_LABELS[input.outcomeId];

  if (!needsNotesOnly && !pathwayStatusBypassEligible) {
    const endResult = await endEngagementCallForActor({
      engagementId: input.engagementId,
      userId: input.userId,
      outcomeId: mapMissionBoardDebriefOutcomeToStartMissionId(input.outcomeId),
      liveNotes: notesBody,
      actorName: await loadActorDisplayName(input.userId),
    });
    if (!endResult.ok) {
      return { ok: false, message: endResult.error, status: endResult.status };
    }
  }

  const now = new Date().toISOString();
  const reloaded = await loadEngagementForPortalActor(input.engagementId, input.userId);
  const snapshot = mergeMissionBoardDebriefCompleteSnapshot(reloaded?.debrief_intelligence_snapshot, {
    outcome_id: input.outcomeId,
    opportunity_result: input.opportunityResult,
    evaluation_path: input.evaluationPath ?? null,
    notes: dictation,
    completed_at: now,
  });

  let debriefSnapshot: Record<string, unknown> = snapshot;
  const intelligence = await applyMissionBoardDebriefIntelligenceFromNarrative({
    providerId: input.providerId,
    userId: input.userId,
    engagementId: input.engagementId,
    engagement: {
      ...(reloaded as Record<string, unknown>),
      debrief_intelligence_snapshot: snapshot,
      debrief_completed: true,
      status: "completed",
    },
    narrative: dictation,
    sourceLabel: "Mission Board Dictate & Complete",
  });
  if (intelligence.ok) {
    debriefSnapshot = intelligence.snapshot;
  }

  const { error: debriefErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({
      notes: buildStoredTacticalDebriefNotes({ narrative: notesBody }),
      debrief_completed: true,
      debrief_completed_at: now,
      status: "completed",
      next_action: nextStep || outcomeLabel,
      debrief_intelligence_snapshot: debriefSnapshot,
      ...(intelligence.ok
        ? buildEngagementPathwayCompletionOutcomePatch(intelligence.report)
        : {}),
      updated_at: now,
    })
    .eq("id", input.engagementId);

  if (debriefErr) {
    return { ok: false, message: debriefErr.message, status: 500 };
  }

  let advancedToEvaluation = false;

  if (input.opportunityResult === "confirmed") {
    const contactPatch: Record<string, unknown> = {
      [PATHWAY_CONTACT_PRODUCT_FIT_VALIDATED]: "yes",
      updated_at: now,
    };
    const { error: fitErr } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .update(contactPatch)
      .eq("id", input.providerId);
    if (fitErr) {
      return { ok: false, message: fitErr.message, status: 500 };
    }

    if (input.evaluationPath) {
      const pathResult = await saveMissionBoardEvaluationPath({
        providerId: input.providerId,
        userId: input.userId,
        evaluationPath: input.evaluationPath,
        notes: dictation || null,
      });
      if (!pathResult.ok) {
        return { ok: false, message: pathResult.message, status: pathResult.status };
      }
    }

    advancedToEvaluation = true;
  }

  await logSurgicalSalesCrmAudit({
    action: "mission_board_debrief_completed",
    actorUserId: input.userId,
    meta: {
      entity_type: "provider",
      entity_id: input.providerId,
      engagement_id: input.engagementId,
      outcome_id: input.outcomeId,
      opportunity_result: input.opportunityResult,
      evaluation_path: input.evaluationPath ?? null,
      product_fit_validated: input.opportunityResult === "confirmed",
    },
  });

  return {
    ok: true,
    engagementId: input.engagementId,
    advancedToEvaluation,
  };
}

export async function logMissionBoardDebriefPathwayOutcome(
  input: Omit<CompleteMissionBoardProviderDebriefInput, "engagementId">,
): Promise<CompleteMissionBoardProviderDebriefResult> {
  const resolved = await resolveOrCreateMissionBoardDebriefEngagement({
    providerId: input.providerId,
    userId: input.userId,
  });
  if (!resolved.ok) return resolved;

  return completeMissionBoardProviderDebrief({
    ...input,
    engagementId: resolved.engagementId,
    pathwayStatusBypass: true,
  });
}
