// src/app/portal/orders/page.tsx
import Link from "next/link";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { applyPortalOrdersScope } from "@/lib/portal/portalRowScope";
import { canCreateOrders, canViewOrders } from "@/lib/portal/portalRoles";
import PortalOrdersListClient, { type OrderRow } from "./ui/PortalOrdersListClient";

export const dynamic = "force-dynamic";

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function statusKey(status: string | null | undefined): string {
  return safeStr(status).toUpperCase();
}

const OPEN_STATUSES = ["DRAFT", "SENT", "CONFIRMED", "FULFILLING", "LOCKED"];

export default async function PortalOrdersPage() {
  const ctx = await requireCurrentAccount();
  const accountId = ctx.currentAccountId;

  if (!accountId) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>No account selected.</div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>Please select an account to continue.</div>
      </div>
    );
  }

  if (!canViewOrders(ctx.currentRole)) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>Forbidden</div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
          Your role does not have permission to view orders for this account.
        </div>
      </div>
    );
  }

  const userId = String((ctx.user as any)?.id ?? "");
  // Embed invoice via FK invoices.order_id -> orders.id (unique per order)
  let ordersQuery = supabaseAdmin
    .from("orders")
    .select(
      "id, order_number, status, subtotal, shipping_total, total, created_at, placed_at, created_by_user_id, placed_by:created_by_user_id (user_id, full_name, email), placed_by_contact:submitted_by_contact_id (id, full_name, email), invoices(id, status, invoice_number, created_at)"
    )
    .eq("account_id", accountId);
  const scopedOrders = await applyPortalOrdersScope(supabaseAdmin, ordersQuery, accountId, userId, ctx.currentRole);
  const { data, error } = await scopedOrders.query.order("created_at", { ascending: false }).limit(200);

  if (error) return <pre style={{ color: "crimson" }}>{error.message}</pre>;

  const rawRows = Array.isArray(data) ? (data as unknown as Array<OrderRow & { created_by_user_id?: string | null }>) : [];

  const creatorIds = Array.from(
    new Set(
      rawRows
        .map((r) => String((r as any).created_by_user_id || "").trim())
        .filter((id) => id.length > 20)
    )
  );
  const emailByUserId = new Map<string, string>();
  if (creatorIds.length) {
    const { data: profs } = await supabaseAdmin.from("user_profiles").select("user_id, email").in("user_id", creatorIds);
    for (const p of profs ?? []) {
      const e = String((p as any).email || "").trim();
      if (e) emailByUserId.set(String((p as any).user_id), e);
    }
  }

  const orders: OrderRow[] = rawRows.map((r: any) => {
    const uid = String(r.created_by_user_id || "").trim();
    const fromProf = uid ? emailByUserId.get(uid) : "";
    const pb = r.placed_by;
    const email =
      String(fromProf || "").trim() ||
      String(pb?.email || "").trim() ||
      "";
    const placed_by =
      pb || uid
        ? {
            user_id: String(pb?.user_id || uid || ""),
            full_name: pb?.full_name ?? null,
            email: email || String(pb?.email || "") || "",
          }
        : null;
    const { created_by_user_id: _c, ...rest } = r;
    return { ...rest, placed_by } as OrderRow;
  });

  const orderIds = orders.map((o) => String(o.id)).filter(Boolean);
  let fulfillmentsByOrder: Record<string, any[]> = {};

  if (orderIds.length) {
    const { data: fulfillmentRows } = await supabaseAdmin
      .from("fulfillments")
      .select("id, order_id, status, fulfillment_source, created_at, metadata")
      .in("order_id", orderIds as any)
      .order("created_at", { ascending: false })
      .limit(5000);

    for (const f of fulfillmentRows ?? []) {
      const oid = String((f as any).order_id || "");
      if (!oid) continue;
      const list = fulfillmentsByOrder[oid] ?? [];
      list.push(f);
      fulfillmentsByOrder[oid] = list;
    }
  }

  for (const o of orders) {
    o.fulfillments = fulfillmentsByOrder[String(o.id)] ?? [];
  }
  const canCreate = canCreateOrders(ctx.currentRole);

  const counts = {
    total: orders.length,
    open: orders.filter((o) => OPEN_STATUSES.includes(statusKey(o.status))).length,
    completed: orders.filter((o) => ["COMPLETED", "INVOICED"].includes(statusKey(o.status))).length,
    cancelled: orders.filter((o) => ["CANCELLED", "DENIED"].includes(statusKey(o.status))).length,
    draft: orders.filter((o) => statusKey(o.status) === "DRAFT").length,
  };

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.heroKicker}>360 Portal</div>
            <h1 style={styles.heroTitle}>Orders</h1>
            <p style={styles.heroSub}>
              Create and track orders for <span style={styles.heroAccountName}>{ctx.currentAccountName ?? "your account"}</span>.
            </p>
            {!canCreate ? <div style={styles.heroHint}>View-only access for orders.</div> : null}
          </div>

          <div style={styles.heroRight}>
            <Link href="/portal/invoices" style={{ ...styles.ghostBtn, textDecoration: "none" }}>
              Invoices
            </Link>
            {canCreate ? (
              <Link href="/portal/orders/new" style={{ ...styles.primaryBtn, textDecoration: "none" }}>
                + Create Order
              </Link>
            ) : (
              <span style={{ ...styles.ghostBtn, cursor: "default", opacity: 0.7 }}>Create disabled (view-only)</span>
            )}
          </div>
        </div>

        <div className="portal-hero-stats" style={styles.heroStatsRow}>
          <Stat label="Total" value={counts.total} />
          <Stat label="Open" value={counts.open} />
          <Stat label="Drafts" value={counts.draft} />
          <Stat label="Completed" value={counts.completed} />
          <Stat label="Cancelled" value={counts.cancelled} tone="danger" />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>All orders</h2>
          <div style={styles.sectionMeta}>
            Showing up to <b>200</b> most recent orders.
          </div>
        </div>

        <PortalOrdersListClient initialRows={orders} canCreate={canCreate} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  const labelStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.72)",
    fontWeight: 900,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  };

  const valueStyle: React.CSSProperties = {
    color: "white",
    fontWeight: 950,
    fontSize: 20,
  };

  const rightPill =
    tone === "danger"
      ? {
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 8px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 950,
          lineHeight: 1,
          background: "rgba(255,255,255,0.10)",
          borderWidth: 1,
          borderStyle: "solid" as const,
          borderColor: "rgba(255,255,255,0.16)",
          color: "color-mix(in srgb, rgba(255,255,255,0.92) 80%, white)",
          whiteSpace: "nowrap" as const,
        }
      : null;

  return (
    <div style={styles.heroStat}>
      <div style={labelStyle}>{label}</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={valueStyle}>{value}</div>
        {tone === "danger" ? <span style={rightPill as React.CSSProperties}>Attention</span> : null}
      </div>
    </div>
  );
}

const baseBorder: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border)",
};

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: 22 },

  hero: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 16%, var(--border))",
    background:
      "radial-gradient(900px 240px at 20% 10%, color-mix(in srgb, var(--brand-600) 42%, transparent), transparent 60%)," +
      "linear-gradient(180deg, #061225, #050b16)",
    boxShadow: "var(--shadow-1)",
  },

  heroTop: {
    padding: 18,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },

  heroKicker: {
    color: "rgba(255,255,255,0.70)",
    fontWeight: 900,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: 950,
    margin: "6px 0 0",
    letterSpacing: -0.3,
    color: "white",
  },

  heroSub: {
    marginTop: 8,
    fontSize: 14,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 1.45,
    maxWidth: 860,
  },

  heroAccountName: { fontWeight: 950, color: "white" },

  heroHint: {
    marginTop: 8,
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontWeight: 800,
  },

  heroRight: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.18)",
    background: "var(--brand-600)",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  },

  ghostBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 950,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  },

  heroStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 0,
    borderTop: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.03)",
    paddingRight: 10,
    boxSizing: "border-box",
  },

  heroStat: {
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    borderRight: "1px solid rgba(255,255,255,0.10)",
  },

  section: { display: "flex", flexDirection: "column", gap: 14 },

  sectionHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  sectionTitle: { fontSize: 18, fontWeight: 950, margin: 0 },

  sectionMeta: { fontSize: 13, color: "var(--muted)" },

  card: {
    ...baseBorder,
    background: "var(--surface)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "var(--shadow-1)",
  },
};
