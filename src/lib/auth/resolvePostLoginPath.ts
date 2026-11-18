/**
 * Shared post-login destination rules for login + MFA challenge.
 * Sales-rep-only users always land in Sales Command (never customer portal).
 */

import { INTERNAL_TEAM_ACCOUNT_NAME } from "@/lib/admin/ensureInternalTeamMembership";

export type PostLoginRoleFlags = {
  ok: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isInternalSalesRep: boolean;
  /** True when the user belongs to a hospital/customer account (not only Internal Team). */
  hasCustomerAccountAccess: boolean;
};

export function membershipsIncludeCustomerAccount(
  memberships: unknown,
  internalTeamAccountId?: string | null,
): boolean {
  if (!Array.isArray(memberships)) return false;
  const internalId = String(internalTeamAccountId || "").trim();
  return memberships.some((row) => {
    if (!row || typeof row !== "object") return false;
    const m = row as {
      account_id?: unknown;
      account?: { id?: unknown; name?: unknown } | null;
    };
    const id = String(m.account_id || m.account?.id || "").trim();
    const name = String(m.account?.name || "").trim();
    if (!id) return false;
    if (internalId && id === internalId) return false;
    if (name === INTERNAL_TEAM_ACCOUNT_NAME) return false;
    return true;
  });
}

export function postLoginFlagsFromMe(me: unknown): PostLoginRoleFlags {
  const m = me as {
    ok?: unknown;
    is_admin?: unknown;
    is_staff?: unknown;
    is_internal_sales_rep?: unknown;
    has_customer_account_access?: unknown;
    memberships?: unknown;
    user?: {
      is_admin?: unknown;
      is_staff?: unknown;
      is_internal_sales_rep?: unknown;
    };
  } | null;

  const ok = m?.ok === true;
  const hasCustomerAccountAccess =
    ok &&
    (m?.has_customer_account_access === true || membershipsIncludeCustomerAccount(m?.memberships));
  return {
    ok,
    isAdmin: ok && (m?.user?.is_admin === true || m?.is_admin === true),
    isStaff: ok && (m?.user?.is_staff === true || m?.is_staff === true),
    isInternalSalesRep:
      ok && (m?.user?.is_internal_sales_rep === true || m?.is_internal_sales_rep === true),
    hasCustomerAccountAccess,
  };
}

export function resolvePostLoginPath(flags: PostLoginRoleFlags, fallback = "/portal"): string {
  if (!flags.ok) return fallback;
  if (flags.isAdmin) return "/admin";
  if (flags.isStaff) return "/admin/ivr";
  if (flags.isInternalSalesRep) return "/portal/sales";
  return fallback;
}

/** True when the user should only use Sales Command (not customer order/IVR portal). */
export function isSalesRepOnly(
  flags: Pick<PostLoginRoleFlags, "isAdmin" | "isStaff" | "isInternalSalesRep">,
): boolean {
  return flags.isInternalSalesRep && !flags.isAdmin && !flags.isStaff;
}

/**
 * Block customer order/IVR surfaces for pure sales reps.
 * Admins/staff and sales reps with a real customer account (e.g. demo hospital) stay allowed.
 */
export function shouldBlockCustomerPortalSurface(
  flags: Pick<
    PostLoginRoleFlags,
    "isAdmin" | "isStaff" | "isInternalSalesRep" | "hasCustomerAccountAccess"
  >,
): boolean {
  return isSalesRepOnly(flags) && !flags.hasCustomerAccountAccess;
}

/** Customer-portal paths sales-rep-only users must not use (allow Sales Command + settings). */
export function isCustomerPortalPathForSalesRep(pathname: string): boolean {
  if (!pathname.startsWith("/portal")) return false;
  if (pathname === "/portal/sales" || pathname.startsWith("/portal/sales/")) return false;
  if (pathname === "/portal/settings" || pathname.startsWith("/portal/settings/")) return false;
  return true;
}
