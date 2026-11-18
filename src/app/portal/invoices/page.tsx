import Link from "next/link";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canViewOrders } from "@/lib/portal/portalRoles";
import { getPortalOrdersScope } from "@/lib/portal/portalRowScope";
import PortalInvoicesListClient, { type PortalInvoiceRow } from "./ui/PortalInvoicesListClient";

export const dynamic = "force-dynamic";

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function statusKey(status: string | null | undefined): string {
  return safeStr(status).toUpperCase();
}

export default async function PortalInvoicesPage() {
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
          Your role does not have permission to view invoices for this account.
        </div>
      </div>
    );
  }

  const portalUserId = String((ctx.user as any)?.id ?? "");
  const scope = await getPortalOrdersScope(supabaseAdmin as any, accountId, portalUserId, ctx.currentRole);

  let data: unknown[] | null = null;
  let error: { message: string } | null = null;

  if (scope.mode === "ids" && scope.ids.length === 0) {
    data = [];
  } else {
    let invQuery = supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, status, total, amount_paid, created_at, issued_at, order_id, account_id, orders(order_number)")
      .eq("account_id", accountId);
    if (scope.mode === "ids") {
      invQuery = invQuery.in("order_id", scope.ids);
    }
    const res = await invQuery.order("created_at", { ascending: false }).limit(200);
    data = res.data as unknown[] | null;
    error = res.error;
  }

  if (error) return <pre style={{ color: "crimson" }}>{error.message}</pre>;

  const rawRows = Array.isArray(data) ? data : [];
  const invoiceIds = rawRows.map((r: any) => String(r.id)).filter(Boolean);

  let paySumByInvoice = new Map<string, number>();
  if (invoiceIds.length) {
    const { data: payRows } = await supabaseAdmin
      .from("invoice_payments")
      .select("invoice_id, amount")
      .in("invoice_id", invoiceIds);
    for (const p of payRows ?? []) {
      const id = String((p as any)?.invoice_id ?? "");
      if (!id) continue;
      paySumByInvoice.set(id, (paySumByInvoice.get(id) ?? 0) + (Number((p as any)?.amount) || 0));
    }
  }

  const invoices: PortalInvoiceRow[] = rawRows.map((inv: any) => {
    const id = String(inv.id);
    const total = Number(inv.total) || 0;
    const stored = Number(inv.amount_paid) || 0;
    const fromPayments = paySumByInvoice.get(id) ?? 0;
    const amountPaid = Math.max(stored, fromPayments);
    const remaining = Math.max(0, total - amountPaid);
    return { ...inv, amount_paid: amountPaid, remaining };
  });

  const counts = {
    total: invoices.length,
    issued: invoices.filter((i) => ["ISSUED", "SENT"].includes(statusKey(i.status))).length,
    paid: invoices.filter((i) => statusKey(i.status) === "PAID").length,
    draft: invoices.filter((i) => statusKey(i.status) === "DRAFT").length,
    voided: invoices.filter((i) => ["VOID", "VOIDED"].includes(statusKey(i.status))).length,
  };

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.heroKicker}>360 Portal</div>
            <h1 style={styles.heroTitle}>Invoices</h1>
            <p style={styles.heroSub}>
              Review invoices for <span style={styles.heroAccountName}>{ctx.currentAccountName ?? "your account"}</span>.
            </p>
          </div>

          <div style={styles.heroRight}>
            <Link href="/portal/orders" style={{ ...styles.ghostBtn, textDecoration: "none" }}>
              Orders
            </Link>
          </div>
        </div>

        <div className="portal-hero-stats" style={styles.heroStatsRow}>
          <Stat label="Total" value={counts.total} />
          <Stat label="Issued" value={counts.issued} />
          <Stat label="Paid" value={counts.paid} />
          <Stat label="Drafts" value={counts.draft} />
          <Stat label="Voided" value={counts.voided} tone="danger" />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>All invoices</h2>
          <div style={styles.sectionMeta}>
            Showing up to <b>200</b> most recent invoices.
          </div>
        </div>

        <PortalInvoicesListClient initialRows={invoices} accountName={ctx.currentAccountName ?? ""} />
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

  heroRight: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

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
};
