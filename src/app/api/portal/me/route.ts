// src/app/api/portal/me/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveInternalTeamAccountId } from "@/lib/admin/ensureInternalTeamMembership";
import { membershipsIncludeCustomerAccount } from "@/lib/auth/resolvePostLoginPath";
import { getPortalContextForAuthenticatedUser } from "@/lib/portal/getPortalContext";
import { portalUserHasVirtualWarehouseAccess } from "@/lib/portal/portalVirtualWarehouseAccess";
import { accountIsDemo } from "@/lib/accounts/demoAccount";
import type { PortalMembership } from "@/lib/portal/getPortalContext";

function serializeMemberships(m: PortalMembership[]) {
  return m.map((row) => ({
    account_id: row.account_id,
    role: row.role,
    account: row.account,
  }));
}

export const dynamic = "force-dynamic";

async function getProfileName(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error && data?.full_name && String(data.full_name).trim()) {
    return String(data.full_name).trim();
  }

  return null;
}

export async function GET() {
  // Auth first (so we can check staff/admin before enforcing account selection)
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = data.user;
  const email = user.email ?? null;

  // Pull internal/admin + profile flags early
  const [internalRes, profileRes] = await Promise.all([
    supabaseAdmin.from("internal_users").select("role").eq("user_id", user.id).maybeSingle(),
    supabaseAdmin.from("user_profiles").select("is_staff,is_admin,is_internal_sales_rep").eq("user_id", user.id).maybeSingle(),
  ]);

  const internalRole = internalRes.data?.role ?? null;
  const isAdmin = !!internalRole || !!profileRes.data?.is_admin;
  const isStaff = !!profileRes.data?.is_staff;
  const isInternalSalesRep = !!profileRes.data?.is_internal_sales_rep;

  // Customers must have an account selected; staff/admin do not.
  let currentAccountId: string | null = null;
  let current_account_is_demo = false;
  let virtual_warehouse_enabled = false;
  let portal_account_role: string | null = null;
  let memberships: ReturnType<typeof serializeMemberships> = [];

  if (!isAdmin && !isStaff) {
    const ctx = await getPortalContextForAuthenticatedUser(user);
    if (!ctx.currentAccountId && !isInternalSalesRep) {
      return NextResponse.json({ ok: false, error: "No account selected" }, { status: 403 });
    }
    currentAccountId = ctx.currentAccountId ?? null;
    portal_account_role = ctx.currentRole ?? null;
    memberships = serializeMemberships(ctx.memberships);

    if (currentAccountId) {
      virtual_warehouse_enabled = await portalUserHasVirtualWarehouseAccess(
        supabaseAdmin,
        currentAccountId,
        user.id
      );
      current_account_is_demo = await accountIsDemo(currentAccountId);
    }
  } else if (isAdmin) {
    // Admins may also belong to portal accounts; expose memberships for sidebar switcher.
    try {
      const ctx = await getPortalContextForAuthenticatedUser(user);
      currentAccountId = ctx.currentAccountId ?? null;
      portal_account_role = ctx.currentRole ?? null;
      memberships = serializeMemberships(ctx.memberships);
      if (currentAccountId) {
        virtual_warehouse_enabled = await portalUserHasVirtualWarehouseAccess(
          supabaseAdmin,
          currentAccountId,
          user.id
        );
        current_account_is_demo = await accountIsDemo(currentAccountId);
      }
    } catch {
      currentAccountId = null;
      portal_account_role = null;
      memberships = [];
    }
  } else {
    // Staff: resolve accounts so dual-role users can still open the customer portal.
    try {
      const ctx = await getPortalContextForAuthenticatedUser(user);
      currentAccountId = ctx.currentAccountId ?? null;
      portal_account_role = ctx.currentRole ?? null;
      memberships = serializeMemberships(ctx.memberships);
      if (currentAccountId) {
        virtual_warehouse_enabled = await portalUserHasVirtualWarehouseAccess(
          supabaseAdmin,
          currentAccountId,
          user.id
        );
        current_account_is_demo = await accountIsDemo(currentAccountId);
      }
    } catch {
      currentAccountId = null;
      memberships = [];
    }
  }

  // Name resolution (same behavior you had)
  let name = await getProfileName(user.id);

  if (!name) {
    const meta: any = user.user_metadata || {};
    const maybe =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      null;
    name = maybe ? String(maybe).trim() : null;
  }

  const internalTeam = await resolveInternalTeamAccountId();
  const has_customer_account_access = membershipsIncludeCustomerAccount(
    memberships,
    internalTeam.ok ? internalTeam.accountId : null,
  );

  return NextResponse.json({
    ok: true,
    currentAccountId,
    current_account_is_demo,
    portal_account_role,
    virtual_warehouse_enabled,
    has_customer_account_access,
    memberships,
    user: {
      id: user.id,
      email,
      name,
      is_admin: isAdmin,
      is_staff: isStaff,
      is_internal_sales_rep: isInternalSalesRep,
      internal_role: internalRole,
    },
  });
}
