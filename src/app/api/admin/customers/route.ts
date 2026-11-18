// src/app/api/admin/customers/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type InviteStatus = "NONE" | "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

function normalizeEmail(v: any): string | null {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return s ? s : null;
}

function inviteStatusFromRow(inv: any): InviteStatus {
  if (!inv) return "NONE";
  if (inv.revoked_at) return "REVOKED";
  if (inv.accepted_at) return "ACCEPTED";
  const exp = inv.expires_at ? new Date(inv.expires_at).getTime() : 0;
  if (exp && exp <= Date.now()) return "EXPIRED";
  return "PENDING";
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const supabase: any = createSupabaseAdminClient();
  const url = new URL(req.url);

  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const inviteFilter = (url.searchParams.get("invite") || "ALL").trim().toUpperCase();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || "50"), 1), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") || "0"), 0);

  // Pull memberships with real pagination
  const { data: memberships, error: memErr, count } = await supabase
    .from("account_users")
    .select("user_id, account_id, role, created_at, disabled_at, accounts:accounts(id,name)", { count: "exact" })
    .is("disabled_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (memErr) return NextResponse.json({ ok: false, error: memErr.message }, { status: 500 });

  const memRows = (memberships || []) as any[];

  const userIds = Array.from(new Set(memRows.map((m) => m.user_id).filter(Boolean)));
  const profilesByUserId: Record<string, any> = {};

  if (userIds.length) {
    const { data: profiles, error: profErr } = await supabase
      .from("user_profiles")
      .select("user_id, full_name, email, created_at")
      .in("user_id", userIds);

    if (profErr) return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 });

    (profiles || []).forEach((p: any) => (profilesByUserId[p.user_id] = p));
  }

  // Count IVRs for these users
  const ivrCountByUserId: Record<string, number> = {};
  if (userIds.length) {
    const { data: ivrs, error: ivrErr } = await supabase
      .from("ivr_requests")
      .select("submitted_by_user_id")
      .in("submitted_by_user_id", userIds);

    if (ivrErr) return NextResponse.json({ ok: false, error: ivrErr.message }, { status: 500 });

    (ivrs || []).forEach((r: any) => {
      const uid = r.submitted_by_user_id;
      if (!uid) return;
      ivrCountByUserId[uid] = (ivrCountByUserId[uid] || 0) + 1;
    });
  }

  // Invite status (latest invite per account+email)
  const accountIds = Array.from(new Set(memRows.map((m) => m.account_id).filter(Boolean)));
  const emails = Array.from(
    new Set(
      memRows
        .map((m) => normalizeEmail(profilesByUserId[m.user_id]?.email))
        .filter(Boolean) as string[]
    )
  );

  const latestInviteByKey: Record<string, any> = {};
  if (accountIds.length && emails.length) {
    const { data: invites, error: invErr } = await supabase
      .from("account_invites")
      .select("id, account_id, email, created_at, accepted_at, revoked_at, expires_at")
      .in("account_id", accountIds)
      .in("email", emails)
      .order("created_at", { ascending: false });

    if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

    (invites || []).forEach((inv: any) => {
      const key = `${inv.account_id}:${normalizeEmail(inv.email) || ""}`;
      if (!latestInviteByKey[key]) latestInviteByKey[key] = inv;
    });
  }

  let rows = memRows.map((m) => {
    const p = profilesByUserId[m.user_id] || null;
    const email = normalizeEmail(p?.email);
    const key = `${m.account_id}:${email || ""}`;
    const inv = email ? latestInviteByKey[key] : null;
    const status: InviteStatus = inviteStatusFromRow(inv);

    const account = Array.isArray(m.accounts) && m.accounts.length ? m.accounts[0] : m.accounts || null;

    return {
      user_id: m.user_id,
      full_name: p?.full_name ?? null,
      email,
      account_id: m.account_id,
      account_name: account?.name ?? null,
      role: m.role,
      member_created_at: m.created_at ?? null,
      ivr_count: ivrCountByUserId[m.user_id] || 0,
      invite_status: status,
      last_invite_created_at: inv?.created_at ?? null,
    };
  });

  if (q) {
    rows = rows.filter((r) => {
      const hay = `${r.full_name || ""} ${r.email || ""} ${r.account_name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  if (inviteFilter !== "ALL") {
    rows = rows.filter((r) => r.invite_status === inviteFilter);
  }

  return NextResponse.json({
    ok: true,
    data: rows,
    count: count ?? rows.length,
    limit,
    offset,
  });
}
