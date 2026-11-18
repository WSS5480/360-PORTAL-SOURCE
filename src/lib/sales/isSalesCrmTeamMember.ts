import { supabaseAdmin } from "@/lib/supabase/admin";
import { isInternalPortalAdmin } from "@/lib/sales/isInternalPortalAdmin";

/**
 * Internal sales reps share CRM visibility and edit access.
 * Ownership columns (created_by / sales_rep_id / etc.) remain for reporting attribution.
 *
 * Keep this module free of next/headers / requireUser imports — it is reachable from
 * client-bundled sales helpers.
 */
export async function isSalesCrmTeamMember(userId: string): Promise<boolean> {
  if (await isInternalPortalAdmin(userId)) return true;
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("is_internal_sales_rep")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.is_internal_sales_rep === true;
}
