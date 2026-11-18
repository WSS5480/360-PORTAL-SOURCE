// src/app/admin/accounts/page.tsx
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import AccountsTableClient from "./AccountsTableClient";

export const dynamic = "force-dynamic";

type AccountRow = {
  id: string;
  name: string;
  discount_percent: number | null;
  created_at: string | null;
  members: {
    user_id: string;
    email: string | null;
    role: string;
    created_at: string | null;
  }[];
  invites: {
    id: string;
    email: string;
    role: string;
    created_at: string | null;
    accepted_at: string | null;
    revoked_at: string | null;
    expires_at: string | null;
  }[];
  orders_count?: number;
  orders_total?: number;
  invoices_count?: number;
  invoices_total?: number;
};

export default async function AdminAccountsPage(props: {
  searchParams: Promise<{ q?: string; only?: string; sort?: string }>;
}) {
  await requireAdmin();
  const sp = await props.searchParams;

  const q = (sp.q || "").trim();
  const only = (sp.only || "").trim();
  const sort = (sp.sort || "").trim();

  const supabase = createSupabaseAdminClient();

  // 1) Accounts (full recent page; search/filter/sort use URL + client so links match behavior)
  const { data: accountsRaw, error: accErr } = await supabase
    .from("accounts")
    .select("id,name,discount_percent,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (accErr) {
    return (
      <main style={{ padding: 0, maxWidth: 1400, margin: "0 auto" }}>
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            border: "1px solid rgba(220,38,38,0.25)",
            background: "rgba(254,242,242,0.95)",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "#0f172a" }}>Accounts</h1>
          <pre style={{ marginTop: 12, color: "#b91c1c", fontSize: 12, whiteSpace: "pre-wrap" }}>{accErr.message}</pre>
          <div style={{ marginTop: 12 }}>
            <Link href="/admin" style={{ fontWeight: 900, color: "var(--brand-600)" }}>
              ← Admin dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const accountsPrelim = (accountsRaw ?? []) as {
    id: string;
    name: string;
    discount_percent: number | null;
    created_at: string | null;
  }[];
  const accounts = accountsPrelim;
  const accountIds = accounts.map((a) => a.id);

  // 2) Memberships
  const { data: memsRaw } = await supabase
    .from("account_users")
    .select("account_id,user_id,role,created_at")
    .in("account_id", accountIds.length ? accountIds : ["00000000-0000-0000-0000-000000000000"]);

  const mems = (memsRaw ?? []) as {
    account_id: string;
    user_id: string;
    role: string;
    created_at: string | null;
  }[];

  // 3) Emails via user_profiles
  const userIds = Array.from(new Set(mems.map((m) => m.user_id)));
  const { data: profilesRaw } = await supabase
    .from("user_profiles")
    .select("user_id,email")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const emailByUserId: Record<string, string | null> = {};
  (profilesRaw ?? []).forEach((p: { user_id: string; email: string | null }) => {
    emailByUserId[p.user_id] = p.email ?? null;
  });

  // 4) Invites
  const { data: invitesRaw } = await supabase
    .from("account_invites")
    .select("id,account_id,email,role,created_at,accepted_at,revoked_at,expires_at")
    .in("account_id", accountIds.length ? accountIds : ["00000000-0000-0000-0000-000000000000"])
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(800);

  const invites = (invitesRaw ?? []) as {
    id: string;
    account_id: string;
    email: string;
    role: string;
    created_at: string | null;
    accepted_at: string | null;
    revoked_at: string | null;
    expires_at: string | null;
  }[];

  // 5) Shape rows
  const membersByAccount: Record<string, AccountRow["members"]> = {};
  for (const m of mems) {
    (membersByAccount[m.account_id] ||= []).push({
      user_id: m.user_id,
      email: emailByUserId[m.user_id] ?? null,
      role: m.role,
      created_at: m.created_at ?? null,
    });
  }

  for (const k of Object.keys(membersByAccount)) {
    membersByAccount[k].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  }

  const invitesByAccount: Record<string, AccountRow["invites"]> = {};
  for (const inv of invites) {
    (invitesByAccount[inv.account_id] ||= []).push({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      created_at: inv.created_at ?? null,
      accepted_at: inv.accepted_at ?? null,
      revoked_at: inv.revoked_at ?? null,
      expires_at: inv.expires_at ?? null,
    });
  }

  for (const k of Object.keys(invitesByAccount)) {
    invitesByAccount[k] = invitesByAccount[k].slice(0, 50);
  }

  // 5) Orders aggregation (count + total)
  const ordersAggByAccount: Record<string, { count: number; total: number }> = {};
  if (accountIds.length) {
    const { data: orderAgg } = await supabase
      .from("orders")
      .select("account_id,total")
      .in("account_id", accountIds)
      .limit(5000);
    for (const r of orderAgg ?? []) {
      const aid = String((r as any).account_id || "");
      if (!aid) continue;
      const total = Number((r as any).total ?? 0) || 0;
      const prev = ordersAggByAccount[aid] || { count: 0, total: 0 };
      ordersAggByAccount[aid] = { count: prev.count + 1, total: prev.total + total };
    }
  }

  // 6) Invoices aggregation (count + total)
  const invoicesAggByAccount: Record<string, { count: number; total: number }> = {};
  if (accountIds.length) {
    const { data: invAgg } = await supabase
      .from("invoices")
      .select("account_id,total")
      .in("account_id", accountIds)
      .limit(5000);
    for (const r of invAgg ?? []) {
      const aid = String((r as any).account_id || "");
      if (!aid) continue;
      const total = Number((r as any).total ?? 0) || 0;
      const prev = invoicesAggByAccount[aid] || { count: 0, total: 0 };
      invoicesAggByAccount[aid] = { count: prev.count + 1, total: prev.total + total };
    }
  }

  const rows: AccountRow[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    discount_percent: a.discount_percent ?? 0,
    created_at: a.created_at ?? null,
    members: membersByAccount[a.id] ?? [],
    invites: invitesByAccount[a.id] ?? [],
    orders_count: ordersAggByAccount[a.id]?.count ?? 0,
    orders_total: ordersAggByAccount[a.id]?.total ?? 0,
    invoices_count: invoicesAggByAccount[a.id]?.count ?? 0,
    invoices_total: invoicesAggByAccount[a.id]?.total ?? 0,
  }));

  const totalMembers = rows.reduce((sum, r) => sum + (r.members?.length ?? 0), 0);
  const pendingInvites = rows.reduce((sum, r) => {
    const invites = r.invites ?? [];
    return sum + invites.filter((i) => !i.accepted_at && !i.revoked_at && i.created_at).length;
  }, 0);

  const ordersCount = rows.reduce((sum, r) => sum + (r.orders_count ?? 0), 0);
  const invoicesCount = rows.reduce((sum, r) => sum + (r.invoices_count ?? 0), 0);

  const avgDiscount =
    rows.length > 0 ? rows.reduce((sum, r) => sum + (Number(r.discount_percent) || 0), 0) / rows.length : 0;

  return (
    <main style={{ padding: 0, maxWidth: 1400, margin: "0 auto", display: "grid", gap: 16 }}>
      <div
        style={{
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(30,136,229,0.22)",
          background:
            "radial-gradient(900px 240px at 15% 10%, rgba(30,136,229,0.35), transparent 60%)," +
            "linear-gradient(180deg, #08172f, #060e1b)",
          color: "white",
          boxShadow: "0 16px 36px rgba(15,23,42,0.12)",
        }}
      >
        <div style={{ padding: 16, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 0.4,
                  opacity: 0.7,
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                Admin
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 950, margin: "6px 0 0" }}>Accounts</h1>
              <p style={{ marginTop: 6, opacity: 0.82, fontSize: 13, maxWidth: 720, lineHeight: 1.45 }}>
                Customer organizations for ordering, memberships, invites, and default pricing — up to 200 most recently created.
                Sales Command organizations are managed separately in the portal.
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13, opacity: 0.92 }}>
                <Link href="/admin" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  Dashboard
                </Link>
                <Link href="/admin/accounts/virtual-balances" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  Virtual balances
                </Link>
                <Link href="/admin/users" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  Users
                </Link>
                <Link href="/admin/people" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  People
                </Link>
                <Link href="/admin/invites" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  Invites
                </Link>
                <Link href="/admin/invite" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  New invite
                </Link>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <Link
                href="/admin/accounts/virtual-balances"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  fontWeight: 900,
                  textDecoration: "none",
                  fontSize: 13,
                }}
              >
                Virtual balances
              </Link>
              <Link
                href="/admin/accounts/new"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.12)",
                  color: "white",
                  fontWeight: 900,
                  textDecoration: "none",
                  fontSize: 13,
                }}
              >
                + Create account
              </Link>
              <div style={{ display: "grid", gap: 4, textAlign: "right", fontSize: 12, opacity: 0.88 }}>
                <div>
                  Loaded: <b>{rows.length}</b> accounts
                </div>
                <div>
                  Members: <b>{totalMembers}</b> · Pending invites: <b>{pendingInvites}</b>
                </div>
                <div>
                  Orders: <b>{ordersCount}</b> · Invoices: <b>{invoicesCount}</b>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))",
              gap: 10,
            }}
          >
            {[
              { label: "Accounts", value: rows.length },
              { label: "Members", value: totalMembers },
              { label: "Pending invites", value: pendingInvites },
              { label: "Orders", value: ordersCount },
              { label: "Invoices", value: invoicesCount },
              { label: "Avg discount", value: `${avgDiscount.toFixed(1)}%` },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 14,
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div style={{ fontSize: 11, letterSpacing: 0.35, opacity: 0.72, fontWeight: 900, textTransform: "uppercase" }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 950, marginTop: 8, letterSpacing: -0.3 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AccountsTableClient initialQ={q} initialOnly={only} initialSort={sort} rows={rows} />
    </main>
  );
}
