import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { buildStartMissionView } from "@/lib/surgical-sales/engagements/buildStartMissionView";
import { loadStartMissionViewForActor } from "@/lib/surgical-sales/engagements/loadStartMissionView";
import {
  mergeStartMissionSnapshot,
  readStartMissionSnapshot,
} from "@/lib/surgical-sales/engagements/startMissionSnapshot";
import { resolveProviderObservationStatusForEngagementOutcome } from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import {
  resolveStartMissionContent,
  type StartMissionOutcomeId,
} from "@/lib/surgical-sales/engagements/startMissionConfig";
import { applyEngagementObservationOutcomeToProvider } from "@/lib/surgical-sales/engagements/observationApprovalFromEngagements";
import { logEngagementUpdatedActivity } from "@/lib/surgical-sales/engagements/engagementActivityLog";

export type RecordStartMissionOutcomeResult =
  | { ok: true; live: ReturnType<typeof buildStartMissionView> }
  | { ok: false; error: string; status: 400 | 404 | 409 | 500 };

export type SaveStartMissionNotesResult =
  | { ok: true; live_notes: string }
  | { ok: false; error: string; status: 404 | 409 | 500 };

function resolveOutcomeLabel(outcomeId: StartMissionOutcomeId, engagementType: string): string {
  const content = resolveStartMissionContent({ engagementType });
  return content.outcomes.find((o) => o.id === outcomeId)?.label ?? outcomeId.replace(/_/g, " ");
}

export async function saveStartMissionNotesForActor(input: {
  engagementId: string;
  userId: string;
  liveNotes: string;
}): Promise<SaveStartMissionNotesResult> {
  const engagement = await loadEngagementForPortalActor(input.engagementId, input.userId);
  if (!engagement) return { ok: false, error: "Not found", status: 404 };
  if (String(engagement.archived_at ?? "").trim()) {
    return { ok: false, error: "Engagement is archived", status: 409 };
  }

  const session = readStartMissionSnapshot(engagement.debrief_intelligence_snapshot);
  if (!session) {
    return { ok: false, error: "Live session not open", status: 409 };
  }

  const now = new Date().toISOString();
  const notes = String(input.liveNotes ?? "");
  const { error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({
      updated_at: now,
      debrief_intelligence_snapshot: mergeStartMissionSnapshot(engagement.debrief_intelligence_snapshot, {
        live_notes: notes,
      }),
    })
    .eq("id", input.engagementId);

  if (error) return { ok: false, error: error.message, status: 500 };
  return { ok: true, live_notes: notes };
}

export async function recordStartMissionOutcomeForActor(input: {
  engagementId: string;
  userId: string;
  actorName: string;
  outcomeId: StartMissionOutcomeId;
  liveNotes?: string;
}): Promise<RecordStartMissionOutcomeResult> {
  const engagement = await loadEngagementForPortalActor(input.engagementId, input.userId);
  if (!engagement) return { ok: false, error: "Not found", status: 404 };
  if (String(engagement.archived_at ?? "").trim()) {
    return { ok: false, error: "Engagement is archived", status: 409 };
  }

  const session = readStartMissionSnapshot(engagement.debrief_intelligence_snapshot);
  if (!session) {
    return { ok: false, error: "Live session not open", status: 409 };
  }
  if (session.outcome_recorded_at) {
    return { ok: false, error: "Outcome already recorded", status: 409 };
  }

  const engagementType = String(engagement.engagement_type ?? "");
  const content = resolveStartMissionContent({ engagementType });
  if (!content.outcomes.some((o) => o.id === input.outcomeId)) {
    return { ok: false, error: "Invalid outcome", status: 400 };
  }

  const outcomeLabel = resolveOutcomeLabel(input.outcomeId, engagementType);
  const notes = String(input.liveNotes ?? session.live_notes ?? "").trim();
  const now = new Date().toISOString();

  const observationStatus = resolveProviderObservationStatusForEngagementOutcome({
    outcomeId: input.outcomeId,
    debriefText: notes,
  });
  if (observationStatus) {
    const providerId = String(engagement.provider_id);
    const applied = await applyEngagementObservationOutcomeToProvider({
      providerId,
      userId: input.userId,
      actorName: input.actorName,
      status: observationStatus,
      approvalNote: notes ? `${outcomeLabel}: ${notes}` : outcomeLabel,
      captureContext: {
        source_type: "engagement",
        source_label: outcomeLabel,
      },
    });
    if (!applied.ok) return { ok: false, error: applied.error, status: 500 };
  }

  const snapshot = mergeStartMissionSnapshot(engagement.debrief_intelligence_snapshot, {
    live_notes: notes,
    outcome_id: input.outcomeId,
    outcome_label: outcomeLabel,
    outcome_recorded_at: now,
  });

  const { error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({
      updated_at: now,
      status: "in_progress",
      debrief_intelligence_snapshot: snapshot,
      next_action: outcomeLabel,
    })
    .eq("id", input.engagementId);

  if (error) return { ok: false, error: error.message, status: 500 };

  await logEngagementUpdatedActivity({
    engagementId: input.engagementId,
    userId: input.userId,
    summary: `Start Mission outcome: ${outcomeLabel}`,
    context: {
      providerId: String(engagement.provider_id),
      organizationId: engagement.organization_id ? String(engagement.organization_id) : null,
      opportunityId: engagement.opportunity_id ? String(engagement.opportunity_id) : null,
      caseId: engagement.case_id ? String(engagement.case_id) : null,
    },
    metadataJson: { outcome_id: input.outcomeId, source: "start_mission" },
  });

  const loaded = await loadStartMissionViewForActor(input.engagementId, input.userId);
  if (!loaded.ok) return { ok: false, error: loaded.error, status: loaded.status };

  return { ok: true, live: loaded.live };
}

export async function loadActorDisplayName(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("full_name, email")
    .eq("user_id", userId)
    .maybeSingle();
  const name = String((data as { full_name?: string | null } | null)?.full_name ?? "").trim();
  const email = String((data as { email?: string | null } | null)?.email ?? "").trim();
  return name || email || "Rep";
}
