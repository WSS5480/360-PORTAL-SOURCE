import Link from "next/link";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import PeopleTableClient, { type PeopleRow } from "./ui/PeopleTableClient";

export const dynamic = "force-dynamic";

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export default async function AdminPeoplePage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = props.searchParams ? await props.searchParams : {};
  const initialQ = typeof (sp as any)?.q === "string" ? String((sp as any).q) : "";

  const supabase: any = createSupabaseAdminClient();

  /**
   * 1) Load all account_contacts + account names
   * account_contacts are the “people created through IVR intake”.
   */
  const { data: contacts, error: contactsErr } = await supabase
    .from("account_contacts")
    .select("id,account_id,full_name,email,user_id,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (contactsErr) {
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>People</h1>
        <p style={{ marginTop: 10, color: "crimson" }}>
          Failed to load account_contacts: {String(contactsErr.message || contactsErr)}
        </p>
      </main>
    );
  }

  const rows0 = (contacts ?? []) as Array<{
    id: string;
    account_id: string;
    full_name: string | null;
    email: string;
    user_id: string | null;
    created_at: string;
    updated_at: string;
  }>;

  const accountIds = Array.from(new Set(rows0.map((r) => safeStr(r.account_id)).filter(Boolean)));
  const contactIds = Array.from(new Set(rows0.map((r) => safeStr(r.id)).filter(Boolean)));

  /**
   * 2) Load account names for those contacts
   */
  const accountNameById: Record<string, string> = {};
  if (accountIds.length) {
    const { data: accs } = await supabase.from("accounts").select("id,name").in("id", accountIds);
    (accs ?? []).forEach((a: any) => {
      const id = safeStr(a.id);
      if (id) accountNameById[id] = safeStr(a.name) || id;
    });
  }

  /**
   * 3) Aggregate IVR counts by account (reliable with your current schema).
   * If you later add ivr_requests.contact_id, we’ll swap this to true per-person counts.
   */
  const ivrAggByAccount: Record<string, { ivr_count: number; last_ivr_at: string | null }> = {};
  if (accountIds.length) {
    const { data: ivrAgg } = await supabase
      .from("ivr_requests")
      .select("account_id, created_at")
      .in("account_id", accountIds)
      .order("created_at", { ascending: false })
      .limit(20000);

    const tmpCount: Record<string, number> = {};
    const tmpLast: Record<string, string> = {};

    (ivrAgg ?? []).forEach((r: any) => {
      const aid = safeStr(r.account_id);
      if (!aid) return;
      tmpCount[aid] = (tmpCount[aid] ?? 0) + 1;
      if (!tmpLast[aid]) tmpLast[aid] = safeStr(r.created_at) || "";
    });

    for (const aid of accountIds) {
      ivrAggByAccount[aid] = {
        ivr_count: tmpCount[aid] ?? 0,
        last_ivr_at: tmpLast[aid] ? tmpLast[aid] : null,
      };
    }
  }

  /**
   * 4) Latest invite per (account_id,email)
   */
  const emails = Array.from(new Set(rows0.map((r) => safeStr(r.email).trim().toLowerCase()).filter(Boolean)));

  const inviteByKey: Record<
    string,
    {
      created_at: string | null;
      accepted_at: string | null;
      revoked_at: string | null;
      expires_at: string | null;
    }
  > = {};

  if (emails.length) {
    const { data: invites } = await supabase
      .from("account_invites")
      .select("account_id,email,created_at,accepted_at,revoked_at,expires_at")
      .in("email", emails)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(5000);

    (invites ?? []).forEach((inv: any) => {
      const aid = safeStr(inv.account_id);
      const em = safeStr(inv.email).trim().toLowerCase();
      if (!aid || !em) return;
      const key = `${aid}::${em}`;

      if (!inviteByKey[key]) {
        inviteByKey[key] = {
          created_at: inv.created_at ?? null,
          accepted_at: inv.accepted_at ?? null,
          revoked_at: inv.revoked_at ?? null,
          expires_at: inv.expires_at ?? null,
        };
      }
    });
  }

  /**
   * 4.5) Aggregate Orders by contact
   */
  const orderAggByContact: Record<string, { order_count: number; last_order_at: string | null }> = {};
  if (contactIds.length) {
    const { data: orderAgg } = await supabase
      .from("orders")
      .select("submitted_by_contact_id, created_at")
      .in("submitted_by_contact_id", contactIds)
      .order("created_at", { ascending: false })
      .limit(20000);

    const tmpCount: Record<string, number> = {};
    const tmpLast: Record<string, string> = {};

    (orderAgg ?? []).forEach((r: any) => {
      const cid = safeStr(r.submitted_by_contact_id);
      if (!cid) return;
      tmpCount[cid] = (tmpCount[cid] ?? 0) + 1;
      if (!tmpLast[cid]) tmpLast[cid] = safeStr(r.created_at) || "";
    });

    for (const cid of contactIds) {
      orderAggByContact[cid] = {
        order_count: tmpCount[cid] ?? 0,
        last_order_at: tmpLast[cid] ? tmpLast[cid] : null,
      };
    }
  }

  /**
   * 5) Build table rows for client
   */
  const rows: PeopleRow[] = rows0.map((c) => {
    const aid = safeStr(c.account_id);
    const em = safeStr(c.email).trim().toLowerCase();
    const inv = inviteByKey[`${aid}::${em}`];

    const ivrAgg = ivrAggByAccount[aid] || { ivr_count: 0, last_ivr_at: null };
    const orderAgg = orderAggByContact[safeStr(c.id)] || { order_count: 0, last_order_at: null };

    return {
      id: safeStr(c.id),
      account_id: aid,
      account_name: accountNameById[aid] || null,

      full_name: c.full_name ?? null,
      email: safeStr(c.email),

      user_id: c.user_id ?? null,
      created_at: safeStr(c.created_at),

      ivr_count: ivrAgg.ivr_count,
      last_ivr_at: ivrAgg.last_ivr_at,

      order_count: orderAgg.order_count,
      last_order_at: orderAgg.last_order_at,

      last_invite_created_at: inv?.created_at ?? null,
      last_invite_accepted_at: inv?.accepted_at ?? null,
      last_invite_revoked_at: inv?.revoked_at ?? null,
      last_invite_expires_at: inv?.expires_at ?? null,
    };
  });

  const card: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 12,
    padding: 14,
    background: "white",
    color: "#0f172a",
  };

  const hero: React.CSSProperties = {
    borderRadius: 20,
    padding: 16,
    border: "1px solid rgba(30,136,229,0.22)",
    background:
      "radial-gradient(900px 200px at 15% 0%, rgba(30,136,229,0.25), transparent 55%)," +
      "linear-gradient(180deg, #0b1b3a, #081226)",
    color: "white",
    boxShadow: "0 16px 36px rgba(15,23,42,0.12)",
  };

  const btn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#111",
    color: "white",
    fontWeight: 900,
    textDecoration: "none",
    fontSize: 13,
  };

  return (
    <main style={{ padding: 16 }}>
      <div style={hero}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.7, fontWeight: 900, textTransform: "uppercase" }}>
              Admin
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 950, margin: "6px 0 0" }}>People</h1>
            <p style={{ marginTop: 6, opacity: 0.75, fontSize: 13, maxWidth: 820 }}>
              Manage recipients created via intake, invite them to the portal, and track IVR + order activity.
            </p>
            <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
              Showing <b>{rows.length}</b> people
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/admin" style={{ fontSize: 13, color: "white", fontWeight: 900, textDecoration: "none" }}>
              ← Admin Dashboard
            </Link>
            <Link href="/admin/invite" style={btn}>
              Invite to Portal
            </Link>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <div style={card}>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Total People</div>
            <div style={{ fontSize: 24, fontWeight: 950, marginTop: 6 }}>{rows.length}</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Linked Users</div>
            <div style={{ fontSize: 24, fontWeight: 950, marginTop: 6 }}>{rows.filter((r) => !!r.user_id).length}</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Pending Invites</div>
            <div style={{ fontSize: 24, fontWeight: 950, marginTop: 6 }}>
              {rows.filter((r) => !r.user_id && !r.last_invite_accepted_at && !r.last_invite_revoked_at && r.last_invite_created_at).length}
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Total Orders</div>
            <div style={{ fontSize: 24, fontWeight: 950, marginTop: 6 }}>
              {rows.reduce((sum, r) => sum + (Number(r.order_count) || 0), 0)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <PeopleTableClient rows={rows} initialQ={initialQ} />
      </div>
    </main>
  );
}
