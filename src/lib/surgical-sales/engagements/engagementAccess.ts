import { supabaseAdmin } from "@/lib/supabase/admin";
import { isSalesCrmTeamMember } from "@/lib/sales/isSalesCrmTeamMember";

/**
 * Engagement attributed to this rep (reporting). Prefer loadEngagementForPortalActor for portal access.
 */
export async function loadEngagementForRep(
  engagementId: string,
  userId: string,
  opts?: { includeArchived?: boolean },
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("*")
    .eq("id", engagementId)
    .eq("sales_rep_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const archivedAt = (data as { archived_at?: string | null }).archived_at;
  if (archivedAt && !opts?.includeArchived) return null;
  return data as Record<string, unknown>;
}

/**
 * Portal actor: any internal sales CRM team member may view/edit any engagement.
 * Attribution stays on sales_rep_id for reporting.
 */
export async function loadEngagementForPortalActor(
  engagementId: string,
  userId: string,
  opts?: { includeArchived?: boolean },
): Promise<Record<string, unknown> | null> {
  if (!(await isSalesCrmTeamMember(userId))) return null;
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("*")
    .eq("id", engagementId)
    .maybeSingle();
  if (error || !data) return null;
  const archivedAt = (data as { archived_at?: string | null }).archived_at;
  if (archivedAt && !opts?.includeArchived) return null;
  return data as Record<string, unknown>;
}

export async function loadEngagementByCaseId(caseId: string): Promise<Record<string, unknown> | null> {
  const { data: byCaseId } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("*")
    .eq("case_id", caseId)
    .maybeSingle();
  if (byCaseId) return byCaseId as Record<string, unknown>;

  const { data: caseRow } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select("engagement_id")
    .eq("id", caseId)
    .maybeSingle();
  const engagementId = (caseRow as { engagement_id?: string | null } | null)?.engagement_id;
  if (!engagementId) return null;

  const { data } = await supabaseAdmin.from("surgical_sales_engagements").select("*").eq("id", engagementId).maybeSingle();
  return data ? (data as Record<string, unknown>) : null;
}
