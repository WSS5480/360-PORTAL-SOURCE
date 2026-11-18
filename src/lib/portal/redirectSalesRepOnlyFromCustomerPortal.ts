import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";
import { resolveInternalTeamAccountId } from "@/lib/admin/ensureInternalTeamMembership";
import {
  isCustomerPortalPathForSalesRep,
  membershipsIncludeCustomerAccount,
  shouldBlockCustomerPortalSurface,
} from "@/lib/auth/resolvePostLoginPath";

/**
 * Pure sales-rep users belong in Sales Command — kick them off customer portal routes.
 * Sales reps who also belong to a hospital/customer account (e.g. demo walkthrough) may stay.
 */
export async function redirectSalesRepOnlyFromCustomerPortal(
  user: User | null | undefined,
  pathname: string,
): Promise<void> {
  if (!user?.id) return;
  if (!isCustomerPortalPathForSalesRep(pathname)) return;

  const [internalRes, profileRes, membershipsRes, internalTeam] = await Promise.all([
    supabaseAdmin.from("internal_users").select("role").eq("user_id", user.id).maybeSingle(),
    supabaseAdmin
      .from("user_profiles")
      .select("is_staff, is_admin, is_internal_sales_rep")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabaseAdmin
      .from("account_users")
      .select("account_id, accounts:accounts(id, name)")
      .eq("user_id", user.id)
      .is("disabled_at", null),
    resolveInternalTeamAccountId(),
  ]);

  const isAdmin = !!internalRes.data?.role || !!profileRes.data?.is_admin;
  const isStaff = !!profileRes.data?.is_staff;
  const isInternalSalesRep = !!profileRes.data?.is_internal_sales_rep;
  const internalTeamAccountId = internalTeam.ok ? internalTeam.accountId : null;
  const hasCustomerAccountAccess = membershipsIncludeCustomerAccount(
    membershipsRes.data ?? [],
    internalTeamAccountId,
  );

  if (
    shouldBlockCustomerPortalSurface({
      isAdmin,
      isStaff,
      isInternalSalesRep,
      hasCustomerAccountAccess,
    })
  ) {
    redirect("/portal/sales");
  }
}
