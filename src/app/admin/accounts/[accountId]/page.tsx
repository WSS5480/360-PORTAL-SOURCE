// src/app/admin/accounts/[accountId]/page.tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

import CopyAccountIdButton from "./CopyAccountIdButton";
import InviteForm from "./InviteForm";
import InvitesTableClient from "./InvitesTableClient";
import MembersTableClient from "./MembersTableClient";
import DiscountEditorClient from "./DiscountEditorClient";
import TermsEditorClient from "./TermsEditorClient";
import BulkPricingEditorClient from "./BulkPricingEditorClient";
import VirtualWarehouseEditorClient from "./VirtualWarehouseEditorClient";
import DeleteAccountClient from "./DeleteAccountClient";

type MemberRow = {
  user_id: string;
  role: string | null;
  created_at: string | null;
  email: string | null;
};

function fmtDate(v: unknown) {
  try {
    return v ? new Date(String(v)).toLocaleString() : "—";
  } catch {
    return "—";
  }
}

function fmtSqcm(n: unknown) {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function accountDiscountPercent(account: {
  id: string;
  discount_percent?: number | string | null;
}): number | null {
  if (!("discount_percent" in account) || account.discount_percent == null || account.discount_percent === "") {
    return null;
  }
  const n = Number(account.discount_percent);
  return Number.isFinite(n) ? n : null;
}

function detailInviteStatus(inv: {
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
}): "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED" {
  if (inv.revoked_at) return "REVOKED";
  if (inv.accepted_at) return "ACCEPTED";
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) return "EXPIRED";
  return "PENDING";
}

export const dynamic = "force-dynamic";

export default async function AccountDetailPage(props: {
  params: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();

  const params = await props.params;
  const accountId = params.accountId ?? params.accountid;

  if (!accountId || accountId === "undefined") {
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
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "#0f172a" }}>Invalid account URL</h1>
          <p style={{ marginTop: 10, color: "#b91c1c", fontSize: 14 }}>The account id in the URL is missing or invalid.</p>
          <Link href="/admin/accounts" style={{ marginTop: 12, display: "inline-block", fontWeight: 900, color: "var(--brand-600)" }}>
            ← All accounts
          </Link>
        </div>
      </main>
    );
  }

  const accountFull = await supabaseAdmin
    .from("accounts")
    .select("id,name,discount_percent,created_at")
    .eq("id", accountId)
    .single();
  const accountResult =
    accountFull.error && /column .* does not exist/i.test(accountFull.error.message)
      ? await supabaseAdmin.from("accounts").select("id,name,created_at").eq("id", accountId).single()
      : accountFull;
  const account = accountResult.data;
  const accountErr = accountResult.error;

  const pricingFull = await supabaseAdmin
    .from("account_pricing")
    .select(
      "discount_percent, payment_terms_label, payment_terms_days, bulk_enabled, bulk_rules, virtual_warehouse_enabled, virtual_sqcm_balance"
    )
    .eq("account_id", accountId)
    .maybeSingle();
  const pricingResult =
    pricingFull.error && /column .* does not exist/i.test(pricingFull.error.message)
      ? await supabaseAdmin
          .from("account_pricing")
          .select("discount_percent, payment_terms_label, payment_terms_days, bulk_enabled, bulk_rules")
          .eq("account_id", accountId)
          .maybeSingle()
      : pricingFull;
  const pricingRow = pricingResult.data;

  const { data: catalogProducts } = await supabaseAdmin
    .from("products")
    .select("id, name, code, is_active")
    .eq("is_active", true)
    .order("name");

  if (accountErr || !account) {
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
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "#0f172a" }}>Account not found</h1>
          <pre style={{ marginTop: 12, color: "#b91c1c", fontSize: 12, whiteSpace: "pre-wrap" }}>
            {accountErr?.message || "No account returned"}
          </pre>
          <Link href="/admin/accounts" style={{ marginTop: 12, display: "inline-block", fontWeight: 900, color: "var(--brand-600)" }}>
            ← All accounts
          </Link>
        </div>
      </main>
    );
  }

  // Members
  const membershipsFull = await supabaseAdmin
    .from("account_users")
    .select("user_id, role, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  const membershipsResult =
    membershipsFull.error && /column .* does not exist/i.test(membershipsFull.error.message)
      ? await supabaseAdmin.from("account_users").select("user_id, role").eq("account_id", accountId)
      : membershipsFull;
  const memberships = membershipsResult.data;
  const memErr = membershipsResult.error;

  const mems = (memberships ?? []) as { user_id: string; role: string | null; created_at: string | null }[];
  const userIds = Array.from(new Set(mems.map((m) => m.user_id)));

  const { data: profilesRaw } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id,email")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const emailByUserId: Record<string, string | null> = {};
  (profilesRaw ?? []).forEach((p: { user_id: string; email: string | null }) => {
    emailByUserId[p.user_id] = p.email ?? null;
  });

  const members: MemberRow[] = memErr
    ? []
    : mems.map((m) => ({
        user_id: m.user_id,
        role: m.role ?? null,
        created_at: m.created_at ?? null,
        email: emailByUserId[m.user_id] ?? null,
      }));

  // Invites
  const invitesFull = await supabaseAdmin
    .from("account_invites")
    .select("id,email,role,invited_by_user_id,invite_token,expires_at,accepted_at,revoked_at,created_at")
    .eq("account_id", accountId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  const invitesResult =
    invitesFull.error && /column .* does not exist/i.test(invitesFull.error.message)
      ? await supabaseAdmin
          .from("account_invites")
          .select("id,email,role,expires_at,accepted_at,revoked_at,created_at")
          .eq("account_id", accountId)
          .is("archived_at", null)
          .order("created_at", { ascending: false })
          .limit(100)
      : invitesFull;
  const invites = invitesResult.data;
  const invErr = invitesResult.error;

  const inviteRows = (invites ?? []) as {
    accepted_at: string | null;
    revoked_at: string | null;
    expires_at: string | null;
  }[];
  const pendingInviteCount = inviteRows.filter((i) => {
    const s = detailInviteStatus(i);
    return s === "PENDING" || s === "EXPIRED";
  }).length;
  const acceptedInviteCount = inviteRows.filter((i) => detailInviteStatus(i) === "ACCEPTED").length;

  const { count: ordersCount } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId);

  const { data: vwInvRows } = await supabaseAdmin
    .from("account_virtual_inventory")
    .select("product_variant_id, quantity, updated_at")
    .eq("account_id", accountId)
    .gt("quantity", 0)
    .order("updated_at", { ascending: false })
    .limit(500);

  const vwVariantIds = Array.from(
    new Set((vwInvRows ?? []).map((r: any) => String(r.product_variant_id)).filter(Boolean))
  );

  let vwVariantById: Record<string, { sku: string; size_label: string | null; product_name: string | null }> = {};
  if (vwVariantIds.length) {
    const { data: vrows } = await supabaseAdmin
      .from("product_variants")
      .select("id, sku, size_label, product_id, products(name)")
      .in("id", vwVariantIds);

    for (const v of vrows ?? []) {
      const pv: any = v;
      const pname =
        pv.products && typeof pv.products === "object" && pv.products?.name ? String(pv.products.name) : null;
      vwVariantById[String(pv.id)] = {
        sku: String(pv.sku ?? ""),
        size_label: pv.size_label ? String(pv.size_label) : null,
        product_name: pname,
      };
    }
  }

  const shell: React.CSSProperties = { padding: 0, maxWidth: 1400, margin: "0 auto", display: "grid", gap: 16 };

  const card: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: 16,
    background: "white",
    overflow: "hidden",
    boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
  };

  const cardHeader: React.CSSProperties = {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(0,0,0,0.03)",
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 0.35,
    textTransform: "uppercase",
    opacity: 0.85,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  };

  const heroLink: React.CSSProperties = {
    color: "white",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 13,
  };

  const heroBtn: React.CSSProperties = {
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
  };

  const statTile: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 14,
    padding: "12px 14px",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(8px)",
  };

  return (
    <main style={shell}>
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
                Admin · Account
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 950, margin: "6px 0 0", lineHeight: 1.2 }}>{account.name}</h1>
              <p style={{ marginTop: 8, opacity: 0.82, fontSize: 13, lineHeight: 1.45 }}>
                Created {fmtDate(account.created_at)}
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13, opacity: 0.92 }}>
                <Link href="/admin" style={heroLink}>
                  Dashboard
                </Link>
                <Link href="/admin/accounts" style={heroLink}>
                  All accounts
                </Link>
                <Link href="/admin/users" style={heroLink}>
                  Users
                </Link>
                <Link href="/admin/invites" style={heroLink}>
                  Invites
                </Link>
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                  fontSize: 12,
                  opacity: 0.78,
                }}
              >
                <code style={{ fontSize: 11, wordBreak: "break-all" }}>{account.id}</code>
                <CopyAccountIdButton accountId={account.id} variant="hero" />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Link href="/admin/invite" style={heroBtn}>
                Invite user
              </Link>
              <Link href={`/admin/orders?account_id=${encodeURIComponent(accountId)}`} style={heroBtn}>
                Orders
              </Link>
              <Link href={`/admin/invoices?account_id=${encodeURIComponent(accountId)}`} style={heroBtn}>
                Invoices
              </Link>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
            }}
          >
            {(
              [
                { label: "Members", value: members.length },
                { label: "Open invites", value: pendingInviteCount, hint: "Pending or expired" },
                { label: "Accepted invites", value: acceptedInviteCount },
                { label: "Orders", value: ordersCount ?? 0 },
                {
                  label: "Discount",
                  value: `${pricingRow?.discount_percent ?? accountDiscountPercent(account) ?? 0}%`,
                },
              ] as { label: string; value: number | string; hint?: string }[]
            ).map((s) => (
              <div key={s.label} style={statTile}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 0.35,
                    opacity: 0.72,
                    fontWeight: 900,
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 950, marginTop: 8, letterSpacing: -0.3 }}>{s.value}</div>
                {s.hint ? (
                  <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>{s.hint}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing — two columns on wide viewports */}
      <div style={card}>
        <div style={cardHeader}>Pricing & programs</div>
        <div style={{ padding: "14px 16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 16,
                minWidth: 0,
                padding: 14,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 0.35,
                  textTransform: "uppercase",
                  opacity: 0.65,
                }}
              >
                Pricing & payment terms
              </div>
              <DiscountEditorClient
                accountId={accountId}
                initialDiscountPercent={pricingRow?.discount_percent ?? accountDiscountPercent(account) ?? 0}
              />
              <TermsEditorClient
                accountId={accountId}
                initialTermsDays={pricingRow?.payment_terms_days ?? 30}
                initialTermsLabel={pricingRow?.payment_terms_label ?? null}
              />
            </div>

            <div
              style={{
                display: "grid",
                gap: 16,
                minWidth: 0,
                padding: 14,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 0.35,
                  textTransform: "uppercase",
                  opacity: 0.65,
                }}
              >
                Bulk purchasing & virtual warehouse
              </div>
              <BulkPricingEditorClient
                accountId={accountId}
                initialEnabled={!!pricingRow?.bulk_enabled}
                initialRules={Array.isArray(pricingRow?.bulk_rules) ? (pricingRow?.bulk_rules as any) : []}
                products={(catalogProducts || []).map((p: any) => ({
                  id: String(p.id),
                  name: String(p.name || "Product"),
                  code: p.code ?? null,
                }))}
              />
              <VirtualWarehouseEditorClient
                accountId={accountId}
                initialEnabled={!!(pricingRow as any)?.virtual_warehouse_enabled}
              />
              {(pricingRow as any)?.virtual_warehouse_enabled ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 8 }}>
                    Virtual warehouse on hand
                  </div>
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.1)",
                      background: "rgba(0,0,0,0.02)",
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.35, textTransform: "uppercase", opacity: 0.65 }}>
                      Fungible sq cm pool
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 950, marginTop: 6, letterSpacing: -0.3 }}>
                      {fmtSqcm((pricingRow as any)?.virtual_sqcm_balance)}{" "}
                      <span style={{ fontSize: 14, fontWeight: 800, opacity: 0.75 }}>sq cm</span>
                    </div>
                    <div style={{ marginTop: 8, opacity: 0.72, fontSize: 12, fontWeight: 700 }}>
                      Same balance the portal uses for fulfillments—credited when VW bulk invoices are paid, debited when VW
                      shipments ship.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      <div style={card}>
        <div style={cardHeader}>
          <span>Account users</span>
          <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 900, opacity: 0.7, fontSize: 12 }}>
            {members.length} linked
          </span>
        </div>

        {memErr ? (
          <div style={{ padding: "14px 16px" }}>
            <pre
              style={{
                margin: 0,
                padding: 12,
                borderRadius: 12,
                background: "rgba(254,242,242,0.9)",
                color: "#b91c1c",
                fontSize: 12,
                whiteSpace: "pre-wrap",
              }}
            >
              {memErr.message}
            </pre>
          </div>
        ) : (
          <MembersTableClient accountId={accountId} members={members} />
        )}
      </div>

      {/* Invites */}
      <div style={card}>
        <div style={cardHeader}>
          <span>Invites</span>
          <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 900, opacity: 0.7, fontSize: 12 }}>
            Up to 100 shown
          </span>
        </div>

        {invErr ? (
          <div style={{ padding: "14px 16px" }}>
            <pre
              style={{
                margin: 0,
                padding: 12,
                borderRadius: 12,
                background: "rgba(254,242,242,0.9)",
                color: "#b91c1c",
                fontSize: 12,
                whiteSpace: "pre-wrap",
              }}
            >
              {invErr.message}
            </pre>
          </div>
        ) : (
          <InvitesTableClient accountId={accountId} invites={invites || []} />
        )}
      </div>

      {/* Invite form */}
      <div style={card}>
        <div style={cardHeader}>New invite</div>
        <div style={{ padding: "14px 16px" }}>
          <InviteForm accountId={account.id} />
        </div>
      </div>

      {/* Advanced */}
      <div style={card}>
        <div style={cardHeader}>Advanced</div>
        <div style={{ padding: "14px 16px", display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75, marginBottom: 6 }}>Account ID</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <code style={{ fontSize: 13, wordBreak: "break-all" }}>{account.id}</code>
              <CopyAccountIdButton accountId={account.id} variant="panel" />
            </div>
          </div>
          <DeleteAccountClient accountId={account.id} accountName={account.name} />
        </div>
      </div>
    </main>
  );
}
