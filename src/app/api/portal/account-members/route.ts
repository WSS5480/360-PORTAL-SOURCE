import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isAccountAdmin } from "@/lib/portal/portalRoles";
import { loadAccountUserActivityCounts } from "@/lib/portal/accountUserActivityCounts";

export const dynamic = "force-dynamic";

function safeStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

function safeEmail(v: unknown) {
  return safeStr(v).trim().toLowerCase();
}

async function loadAuthEmailsByUserIds(adminSb: any, userIds: string[]) {
  const emailById = new Map<string, string>();
  const getUserById = adminSb?.auth?.admin?.getUserById;
  if (typeof getUserById !== "function") return emailById;

  for (const id of userIds) {
    try {
      const res = await adminSb.auth.admin.getUserById(id);
      const email = safeEmail(res?.data?.user?.email);
      if (email) emailById.set(id, email);
    } catch {
      // skip
    }
  }
  return emailById;
}

export async function GET() {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });
  }

  if (!isAccountAdmin(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const sb: any = createSupabaseAdminClient();

  const { data: members, error: mErr } = await sb
    .from("account_users")
    .select("user_id, role, disabled_at, created_at, virtual_warehouse_access")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (mErr) return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 });

  const userIds = (members ?? []).map((r: any) => safeStr(r.user_id)).filter(Boolean);

  const profilesById = new Map<string, { full_name?: string }>();
  if (userIds.length) {
    const a = await sb.from("user_profiles").select("user_id, full_name").in("user_id", userIds);
    if (!a.error && Array.isArray(a.data)) {
      for (const row of a.data) profilesById.set(safeStr(row.user_id), { full_name: safeStr(row.full_name) });
    } else {
      const b = await sb.from("user_profiles").select("id, full_name").in("id", userIds);
      if (!b.error && Array.isArray(b.data)) {
        for (const row of b.data) profilesById.set(safeStr(row.id), { full_name: safeStr(row.full_name) });
      }
    }
  }

  const emailById = await loadAuthEmailsByUserIds(sb, userIds);

  let orderCountByUserId = new Map<string, number>();
  let ivrCountByUserId = new Map<string, number>();
  try {
    const stats = await loadAccountUserActivityCounts(sb, accountId);
    orderCountByUserId = stats.orderCountByUserId;
    ivrCountByUserId = stats.ivrCountByUserId;
  } catch {
    // non-blocking
  }

  const portalMembers = (members ?? []).map((r: any) => {
    const uid = safeStr(r.user_id);
    const email = emailById.get(uid) || "";
    const name =
      safeStr(profilesById.get(uid)?.full_name) ||
      (email ? email.split("@")[0] : uid ? `User ${uid.slice(0, 6)}` : "Portal User");

    return {
      user_id: uid,
      role: safeStr(r.role),
      disabled_at: r.disabled_at ?? null,
      created_at: r.created_at ?? null,
      display_name: name,
      email,
      orders_placed: orderCountByUserId.get(uid) ?? 0,
      ivrs_placed: ivrCountByUserId.get(uid) ?? 0,
      virtual_warehouse_access: (r as any).virtual_warehouse_access !== false,
    };
  });

  return NextResponse.json({ ok: true, members: portalMembers });
}
