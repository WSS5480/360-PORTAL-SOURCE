import { supabaseAdmin } from "@/lib/supabase/admin";
import { filterOpportunitiesByActiveOrganization } from "@/lib/sales/activeOrganizationFilter";
import { isSalesCrmTeamMember } from "@/lib/sales/isSalesCrmTeamMember";

/**
 * Portal CRM: any internal sales CRM team member may view any opportunity.
 * Attribution stays on owner_user_id for reporting.
 */
export async function loadOpportunityForViewer(opportunityId: string, userId: string): Promise<Record<string, unknown> | null> {
  if (!(await isSalesCrmTeamMember(userId))) return null;
  const { data, error } = await supabaseAdmin.from("sales_opportunities").select("*").eq("id", opportunityId).maybeSingle();
  if (error || !data) return null;
  const visible = await filterOpportunitiesByActiveOrganization([data as Record<string, unknown>]);
  if (visible.length === 0) return null;
  return visible[0] as Record<string, unknown>;
}
