import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { EngagementPlanningStatus } from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import { briefingIdForPlannedEngagement } from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import {
  buildEngagementPreparationStatus,
  type EngagementPreparationStatus,
} from "@/lib/surgical-sales/engagements/engagementPreparationStatus";
import { buildCompletedPrepareChecklist } from "@/lib/surgical-sales/engagements/prepareForMeetingChecklist";
import { logEngagementPreparedActivity } from "@/lib/surgical-sales/engagements/engagementActivityLog";
import type { EngagementActivityContext } from "@/lib/surgical-sales/engagements/engagementActivityLog";

export type { EngagementPreparationStatus } from "@/lib/surgical-sales/engagements/engagementPreparationStatus";
export { buildEngagementPreparationStatus } from "@/lib/surgical-sales/engagements/engagementPreparationStatus";

export async function markEngagementPrepared(params: {
  engagementId: string;
  userId: string;
  engagement: Record<string, unknown>;
  context: EngagementActivityContext;
}): Promise<
  | { ok: true; preparation: EngagementPreparationStatus; alreadyPrepared: boolean }
  | { ok: false; message: string }
> {
  const existingAt = params.engagement.prepared_at ? String(params.engagement.prepared_at) : null;
  if (existingAt) {
    return {
      ok: true,
      alreadyPrepared: true,
      preparation: buildEngagementPreparationStatus(params.engagement),
    };
  }

  const nowIso = new Date().toISOString();
  const checklist = buildCompletedPrepareChecklist(nowIso);

  const { data, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({
      prepared_at: nowIso,
      prepared_by_user_id: params.userId,
      prepare_checklist_json: checklist,
      planning_status: "planned" satisfies EngagementPlanningStatus,
      briefing_id: briefingIdForPlannedEngagement(params.engagementId, "planned"),
      updated_at: nowIso,
    })
    .eq("id", params.engagementId)
    .select("prepared_at, prepared_by_user_id, prepare_checklist_json")
    .single();

  if (error) {
    const msg = error.message ?? "Failed to mark prepared";
    if (/prepared_at|prepare_checklist|schema cache/i.test(msg)) {
      return {
        ok: false,
        message:
          "Prepare columns are not available yet. Run migration 20260625_engagement_meeting_prepared.sql.",
      };
    }
    return { ok: false, message: msg };
  }

  const nextRow = {
    ...params.engagement,
    prepared_at: data?.prepared_at ?? nowIso,
    prepared_by_user_id: data?.prepared_by_user_id ?? params.userId,
    prepare_checklist_json: data?.prepare_checklist_json ?? checklist,
  };

  const typeLabel = formatEngagementType(String(params.engagement.engagement_type ?? ""));
  try {
    const activity = await logEngagementPreparedActivity({
      engagementId: params.engagementId,
      userId: params.userId,
      context: params.context,
      engagementType: String(params.engagement.engagement_type ?? ""),
      body: `${typeLabel} marked prepared for meeting.`,
    });
    if (!activity.ok) {
      console.warn("[prepare] activity log skipped:", activity.message);
    }
  } catch (err) {
    console.warn("[prepare] activity log error (non-blocking):", err);
  }

  return {
    ok: true,
    alreadyPrepared: false,
    preparation: buildEngagementPreparationStatus(nextRow),
  };
}
