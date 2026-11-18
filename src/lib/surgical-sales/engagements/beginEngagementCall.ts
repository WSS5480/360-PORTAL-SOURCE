import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { resolveEngagementWorkflowStateAllowsBeginCall } from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import { mergeStartMissionSnapshot, readStartMissionSnapshot } from "@/lib/surgical-sales/engagements/startMissionSnapshot";

export type BeginEngagementCallResult =
  | { ok: true; status_changed: boolean }
  | { ok: false; error: string; status: 404 | 409 | 500 };

/**
 * Marks a planned engagement as in progress when the rep begins the touch.
 * Does not open a separate live-mission screen or mutate briefing content.
 */
export async function beginEngagementCallForActor(
  engagementId: string,
  userId: string,
  options?: { allowUnpreparedBegin?: boolean },
): Promise<BeginEngagementCallResult> {
  const engagement = await loadEngagementForPortalActor(engagementId, userId, {
    includeArchived: true,
  });
  if (!engagement) {
    return { ok: false, error: "Not found", status: 404 };
  }
  if (String(engagement.archived_at ?? "").trim()) {
    return { ok: false, error: "Engagement is archived", status: 409 };
  }

  const status = String(engagement.status ?? "planned").toLowerCase();
  if (status === "completed" || status === "cancelled") {
    return { ok: false, error: "This engagement is closed.", status: 409 };
  }

  const allowsBegin = resolveEngagementWorkflowStateAllowsBeginCall({
    status,
    preparedAt: engagement.prepared_at ? String(engagement.prepared_at) : null,
    planningStatus: engagement.planning_status ? String(engagement.planning_status) : null,
    isMeetingPrepared: Boolean(engagement.is_meeting_prepared),
    engagement,
  });
  if (!allowsBegin && !options?.allowUnpreparedBegin) {
    return {
      ok: false,
      error: "Prepare the engagement before starting.",
      status: 409,
    };
  }

  const now = new Date().toISOString();
  const existingSession = readStartMissionSnapshot(engagement.debrief_intelligence_snapshot);

  if (status !== "planned") {
    if (existingSession?.opened_at) {
      return { ok: true, status_changed: false };
    }
    const { error: sessionError } = await supabaseAdmin
      .from("surgical_sales_engagements")
      .update({
        updated_at: now,
        debrief_intelligence_snapshot: mergeStartMissionSnapshot(engagement.debrief_intelligence_snapshot, {
          opened_at: now,
          live_notes: "",
        }),
      })
      .eq("id", engagementId);
    if (sessionError) {
      return { ok: false, error: sessionError.message || "Could not start engagement", status: 500 };
    }
    return { ok: true, status_changed: false };
  }

  const { error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({
      status: "in_progress",
      updated_at: now,
      debrief_intelligence_snapshot: mergeStartMissionSnapshot(engagement.debrief_intelligence_snapshot, {
        opened_at: existingSession?.opened_at ?? now,
        live_notes: existingSession?.live_notes ?? "",
      }),
    })
    .eq("id", engagementId);

  if (error) {
    return { ok: false, error: error.message || "Could not start engagement", status: 500 };
  }

  return { ok: true, status_changed: true };
}
