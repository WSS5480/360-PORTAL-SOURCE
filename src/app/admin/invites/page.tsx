import Link from "next/link";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import AllInvitesClient, { type InviteRow } from "./AllInvitesClient";

export const dynamic = "force-dynamic";

const INVITE_LIMIT = 500;

function normEmail(e: string) {
  return e.trim().toLowerCase();
}

export default async function AdminInvitesListPage() {
  await requireAdmin();
  const supabase: any = createSupabaseAdminClient();

  const { data: invitesRaw, error: invErr } = await supabase
    .from("account_invites")
    .select("id,account_id,email,role,created_at,accepted_at,revoked_at,expires_at,archived_at")
    .order("created_at", { ascending: false })
    .limit(INVITE_LIMIT);

  const invites: InviteRow[] = (invitesRaw ?? []).map((r: any) => ({
    id: String(r.id),
    account_id: String(r.account_id),
    email: String(r.email ?? ""),
    role: String(r.role ?? ""),
    created_at: r.created_at ?? null,
    expires_at: r.expires_at ?? null,
    accepted_at: r.accepted_at ?? null,
    revoked_at: r.revoked_at ?? null,
    archived_at: r.archived_at ?? null,
  }));

  const accountIds = Array.from(new Set(invites.map((i) => i.account_id).filter(Boolean)));
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name")
    .in("id", accountIds.length ? accountIds : ["00000000-0000-0000-0000-000000000000"]);

  const accountNameById: Record<string, string> = {};
  for (const a of accounts ?? []) {
    accountNameById[String((a as any).id)] = String((a as any).name ?? "");
  }

  const acceptedEmails = Array.from(
    new Set(
      invites
        .filter((i) => i.accepted_at)
        .map((i) => normEmail(i.email))
        .filter(Boolean)
    )
  );

  const lastSignInByEmail: Record<string, string | null> = {};

  if (acceptedEmails.length) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id,email")
      .in("email", acceptedEmails);

    const userIdByEmail = new Map<string, string>();
    for (const p of profiles ?? []) {
      const e = normEmail(String((p as any).email ?? ""));
      const uid = String((p as any).user_id ?? "");
      if (e && uid && !userIdByEmail.has(e)) userIdByEmail.set(e, uid);
    }

    const uniqueUserIds = Array.from(new Set(userIdByEmail.values()));
    const lastSignByUserId = new Map<string, string | null>();

    const chunkSize = 25;
    for (let i = 0; i < uniqueUserIds.length; i += chunkSize) {
      const chunk = uniqueUserIds.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (uid) => {
          try {
            const { data, error } = await supabase.auth.admin.getUserById(uid);
            if (error) {
              lastSignByUserId.set(uid, null);
              return;
            }
            const iso = (data?.user as { last_sign_in_at?: string } | undefined)?.last_sign_in_at ?? null;
            lastSignByUserId.set(uid, iso);
          } catch {
            lastSignByUserId.set(uid, null);
          }
        })
      );
    }

    for (const [email, uid] of userIdByEmail) {
      lastSignInByEmail[email] = lastSignByUserId.get(uid) ?? null;
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 1220 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 280px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 950, margin: 0, letterSpacing: -0.4 }}>Invites</h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              lineHeight: 1.5,
              color: "var(--muted)",
              maxWidth: 560,
            }}
          >
            Portal invitations across accounts. Use <strong style={{ color: "var(--foreground)" }}>Archive</strong> to
            clear the active list without revoking access. Restore archived rows from the{" "}
            <strong style={{ color: "var(--foreground)" }}>Archived</strong> tab.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link
            href="/admin/invite"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "10px 16px",
              borderRadius: 12,
              fontWeight: 900,
              fontSize: 13,
              textDecoration: "none",
              color: "white",
              background: "var(--brand-600)",
              boxShadow: "0 2px 8px color-mix(in srgb, var(--brand-600) 35%, transparent)",
            }}
          >
            New invite
          </Link>
          <Link
            href="/admin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "10px 14px",
              borderRadius: 12,
              fontWeight: 850,
              fontSize: 13,
              textDecoration: "none",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            Dashboard
          </Link>
        </div>
      </div>

      {invErr ? (
        <div
          style={{
            marginTop: 14,
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
            padding: 14,
            background: "white",
          }}
        >
          <div style={{ fontWeight: 900 }}>Could not load invites</div>
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>{invErr.message}</div>
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <AllInvitesClient invites={invites} accountNameById={accountNameById} lastSignInByEmail={lastSignInByEmail} />
          {invites.length >= INVITE_LIMIT ? (
            <p style={{ marginTop: 12, fontSize: 12, opacity: 0.65 }}>
              Showing the {INVITE_LIMIT} most recent invites. Older rows are not listed here.
            </p>
          ) : null}
        </div>
      )}
    </main>
  );
}
