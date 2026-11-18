import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    } catch {}
  }
  return emailById;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ accountId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { accountId } = await Promise.resolve(ctx.params);
  if (!UUID_RE.test(accountId)) {
    return NextResponse.json({ ok: false, error: "Invalid accountId" }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();

  // Saved recipients (contacts) + ivr_count via view
  const { data: contacts, error: cErr } = await sb
    .from("account_contacts_with_ivr_counts")
    .select("id,full_name,email,created_at,is_primary,ivr_count")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });

  // Portal members
  const { data: members, error: mErr } = await sb
    .from("account_users")
    .select("user_id,role,disabled_at,created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (mErr) return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 });

  const userIds = (members ?? []).map((r: any) => safeStr(r.user_id)).filter(Boolean);

  // user_profiles (either user_id or id column depending on your schema history)
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

  // Optional: count IVRs submitted by each portal member (fast + clear)
  const submittedCountByUserId = new Map<string, number>();
  if (userIds.length) {
    const { data: ivrs } = await sb
      .from("ivr_requests")
      .select("submitted_by_user_id")
      .eq("account_id", accountId);

    for (const r of ivrs ?? []) {
      const uid = safeStr((r as any).submitted_by_user_id);
      if (!uid) continue;
      submittedCountByUserId.set(uid, (submittedCountByUserId.get(uid) ?? 0) + 1);
    }
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
      ivr_submitted_count: submittedCountByUserId.get(uid) ?? 0,
    };
  });

  return NextResponse.json({
    ok: true,
    contacts: contacts ?? [],
    portalMembers,
  });
}
