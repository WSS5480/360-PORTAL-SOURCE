import { supabaseAdmin } from "@/lib/supabase/admin";
import { isSalesCrmTeamMember } from "@/lib/sales/isSalesCrmTeamMember";

/**
 * Case attributed to this rep (reporting). Prefer loadSurgicalCaseForPortalActor for portal access.
 */
export async function loadSurgicalCaseForRep(
  caseId: string,
  userId: string,
  opts?: { includeArchived?: boolean },
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select("*")
    .eq("id", caseId)
    .eq("sales_rep_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const archivedAt = (data as { archived_at?: string | null }).archived_at;
  if (archivedAt && !opts?.includeArchived) return null;
  return data as Record<string, unknown>;
}

/**
 * Portal actor: any internal sales CRM team member may view/edit any case.
 * Attribution stays on sales_rep_id for reporting.
 */
export async function loadSurgicalCaseForPortalActor(
  caseId: string,
  userId: string,
  opts?: { includeArchived?: boolean },
): Promise<Record<string, unknown> | null> {
  if (!(await isSalesCrmTeamMember(userId))) return null;
  const { data, error } = await supabaseAdmin.from("surgical_sales_cases").select("*").eq("id", caseId).maybeSingle();
  if (error || !data) return null;
  const archivedAt = (data as { archived_at?: string | null }).archived_at;
  if (archivedAt && !opts?.includeArchived) return null;
  return data as Record<string, unknown>;
}
