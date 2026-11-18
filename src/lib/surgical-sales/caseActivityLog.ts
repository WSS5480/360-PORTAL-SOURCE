import { dualWriteFromCaseActivityLog } from "@/lib/activity/caseActivityDualWrite";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function logSurgicalCaseActivity(params: {
  caseId: string;
  userId: string;
  activityType: string;
  body: string;
  metadataJson?: Record<string, unknown>;
  /** Shallow merge into `metadata_json` as `previous_values` when non-empty. */
  previousValues?: Record<string, unknown> | null;
  /** Shallow merge into `metadata_json` as `new_values` when non-empty. */
  newValues?: Record<string, unknown> | null;
  /** When set, also emits WORKFLOW_STAGE_COMPLETED to the unified activity log. */
  workflowStageCompleted?: string | null;
  providerId?: string | null;
  opportunityId?: string | null;
}): Promise<{ ok: true; activityId?: string } | { ok: false; message: string }> {
  const meta: Record<string, unknown> = { ...(params.metadataJson ?? {}) };
  const prev = params.previousValues;
  if (prev && Object.keys(prev).length > 0) {
    meta.previous_values = { ...((meta.previous_values as Record<string, unknown>) || {}), ...prev };
  }
  const next = params.newValues;
  if (next && Object.keys(next).length > 0) {
    meta.new_values = { ...((meta.new_values as Record<string, unknown>) || {}), ...next };
  }

  const { data, error } = await supabaseAdmin
    .from("surgical_sales_case_activities")
    .insert({
      case_id: params.caseId,
      user_id: params.userId,
      activity_type: params.activityType,
      body: params.body,
      metadata_json: meta,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  const activityId = data?.id ? String(data.id) : undefined;

  dualWriteFromCaseActivityLog({
    caseId: params.caseId,
    userId: params.userId,
    legacyType: params.activityType,
    body: params.body,
    legacyActivityId: activityId,
    metadataJson: meta,
    workflowStageCompleted: params.workflowStageCompleted,
    providerId: params.providerId,
    opportunityId: params.opportunityId,
  });

  return { ok: true, activityId };
}
