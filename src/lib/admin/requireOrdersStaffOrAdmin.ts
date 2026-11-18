// src/lib/admin/requireOrdersStaffOrAdmin.ts
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type OrdersAdminContext =
  | { user: any; kind: "ADMIN"; internalRole: string }
  | { user: any; kind: "STAFF"; staffRoles: string[] };

function uniqStrings(xs: string[]) {
  return Array.from(new Set(xs.filter(Boolean)));
}

async function getAuthedUser() {
  const supabase = await supabaseServer();
  const { data, error: authErr } = await supabase.auth.getUser();
  if (authErr || !data?.user) throw new Error("Unauthorized");
  return data.user;
}

async function getInternalAdmin(userId: string): Promise<{ role: string } | null> {
  const { data: internal, error: internalErr } = await supabaseAdmin
    .from("internal_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!internalErr && internal?.role) return { role: String(internal.role) };
  return null;
}

async function getStaffRoles(userId: string): Promise<string[]> {
  const { data: roles, error: rolesErr } = await supabaseAdmin
    .from("staff_user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesErr) return [];
  return uniqStrings((roles ?? []).map((r: any) => String(r.role ?? "")));
}

export async function requireOrdersStaffOrAdmin(): Promise<OrdersAdminContext> {
  const user = await getAuthedUser();

  // 1) Internal admin (internal_users)
  const internal = await getInternalAdmin(user.id);
  if (internal) {
    return { user, kind: "ADMIN", internalRole: internal.role };
  }

  // 2) Staff must have explicit staff role for orders
  // We do NOT rely on user_profiles.is_staff alone for orders access.
  const staffRoles = await getStaffRoles(user.id);
  const canOrders = staffRoles.includes("ORDER_MANAGER") || staffRoles.includes("ADMIN");
  if (!canOrders) throw new Error("Forbidden");

  return { user, kind: "STAFF", staffRoles };
}

/**
 * Gate for UNLOCK (more sensitive than LOCK).
 * Recommended default: allow Internal Admin OR Staff with ORDER_MANAGER/ADMIN.
 */
export async function requireOrdersUnlocker(): Promise<OrdersAdminContext> {
  const user = await getAuthedUser();

  const internal = await getInternalAdmin(user.id);
  if (internal) {
    return { user, kind: "ADMIN", internalRole: internal.role };
  }

  const staffRoles = await getStaffRoles(user.id);
  const canUnlock = staffRoles.includes("ORDER_MANAGER") || staffRoles.includes("ADMIN");
  if (!canUnlock) throw new Error("Forbidden");

  return { user, kind: "STAFF", staffRoles };
}
