import { supabaseAdmin } from "@/lib/supabase/admin";
import { isSalesCrmTeamMember } from "@/lib/sales/isSalesCrmTeamMember";
import { logEngagementUpdatedActivity } from "@/lib/surgical-sales/engagements/engagementActivityLog";

export type ArchiveEngagementResult =
  | { ok: true; engagement: Record<string, unknown> }
  | { ok: false; error: string; status: number };

function engagementActivityContext(row: Record<string, unknown>) {
  return {
    providerId: row.provider_id ? String(row.provider_id) : null,
    organizationId: row.organization_id ? String(row.organization_id) : null,
    opportunityId: row.opportunity_id ? String(row.opportunity_id) : null,
    caseId: row.case_id ? String(row.case_id) : null,
  };
}

async function actorCanArchiveEngagement(
  _row: Record<string, unknown>,
  userId: string,
): Promise<boolean> {
  return isSalesCrmTeamMember(userId);
}

export async function archiveEngagementForPortalActor(params: {
  engagementId: string;
  userId: string;
  row: Record<string, unknown>;
}): Promise<ArchiveEngagementResult> {
  const archivedAt = (params.row.archived_at as string | null | undefined) ?? null;
  if (archivedAt) {
    return { ok: false, error: "Engagement is already deleted.", status: 400 };
  }

  if (!(await actorCanArchiveEngagement(params.row, params.userId))) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({
      archived_at: now,
      archived_by_user_id: params.userId,
      updated_at: now,
    })
    .eq("id", params.engagementId)
    .select("*")
    .single();

  if (error || !updated) {
    return { ok: false, error: error?.message || "Delete failed", status: 500 };
  }

  const activityLog = await logEngagementUpdatedActivity({
    engagementId: params.engagementId,
    userId: params.userId,
    context: engagementActivityContext(updated as Record<string, unknown>),
    summary: "Engagement deleted — hidden from active lists; history is kept.",
    metadataJson: { archived_at: now, action: "engagement_archived" },
  });
  if (!activityLog.ok) {
    return { ok: false, error: activityLog.message, status: 500 };
  }

  return { ok: true, engagement: updated as Record<string, unknown> };
}

export async function restoreEngagementForPortalActor(params: {
  engagementId: string;
  userId: string;
  row: Record<string, unknown>;
}): Promise<ArchiveEngagementResult> {
  const archivedAt = (params.row.archived_at as string | null | undefined) ?? null;
  if (!archivedAt) {
    return { ok: false, error: "Engagement is not deleted.", status: 400 };
  }

  if (!(await actorCanArchiveEngagement(params.row, params.userId))) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({
      archived_at: null,
      archived_by_user_id: null,
      updated_at: now,
    })
    .eq("id", params.engagementId)
    .select("*")
    .single();

  if (error || !updated) {
    return { ok: false, error: error?.message || "Restore failed", status: 500 };
  }

  const activityLog = await logEngagementUpdatedActivity({
    engagementId: params.engagementId,
    userId: params.userId,
    context: engagementActivityContext(updated as Record<string, unknown>),
    summary: "Engagement restored to active lists.",
    metadataJson: { previous_archived_at: archivedAt, action: "engagement_restored" },
  });
  if (!activityLog.ok) {
    return { ok: false, error: activityLog.message, status: 500 };
  }

  return { ok: true, engagement: updated as Record<string, unknown> };
}
