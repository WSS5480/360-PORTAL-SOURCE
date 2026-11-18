import Link from "next/link";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { formatRoleLabel, formatStatusLabel } from "@/lib/formatStatusLabel";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnyRow = any;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString();
}

function shortId(id?: string | null) {
  const s = safeStr(id).trim();
  if (!s) return "—";
  return s.length > 10 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

function fmtMoney(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return Number(v).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtNumber(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return Number(v).toLocaleString();
}

function safeNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function sqcmFromVariant(v: any): number {
  const direct = safeNum((v as any)?.total_sqcm);
  if (direct > 0) return direct;

  const w = safeNum((v as any)?.width_cm);
  const l = safeNum((v as any)?.length_cm);
  if (w > 0 && l > 0) return w * l;

  const s = String((v as any)?.size_label ?? "").toLowerCase().replace(/\\s+/g, "");
  const m = s.match(/^(\\d+(?:\\.\\d+)?)\\s*(?:x|×)\\s*(\\d+(?:\\.\\d+)?)(?:cm)?$/i);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) return a * b;
  }

  return 0;
}

async function totalSqcmForOrders(supabase: any, orderIds: string[]) {
  if (!orderIds.length) return 0;

  const { data: itemRows } = await supabase
    .from("order_items")
    .select("order_id, product_variant_id, quantity")
    .in("order_id", orderIds as any)
    .limit(20000);

  const items = Array.isArray(itemRows) ? itemRows : [];
  const variantIds = Array.from(
    new Set(items.map((i: any) => String(i?.product_variant_id || "")).filter(Boolean))
  );

  const { data: variantsRaw } = variantIds.length
    ? await supabase
        .from("product_variants")
        .select("id, total_sqcm, width_cm, length_cm, size_label")
        .in("id", variantIds as any)
        .limit(5000)
    : { data: [] };

  const variants = Array.isArray(variantsRaw) ? variantsRaw : [];
  const sqcmByVariant = new Map<string, number>();
  for (const v of variants) {
    const id = String((v as any)?.id || "");
    if (!id) continue;
    sqcmByVariant.set(id, sqcmFromVariant(v));
  }

  let total = 0;
  for (const it of items) {
    const variantId = String((it as any)?.product_variant_id || "");
    if (!variantId) continue;
    const qty = safeNum((it as any)?.quantity);
    if (qty <= 0) continue;
    total += (sqcmByVariant.get(variantId) ?? 0) * qty;
  }

  return total;
}

function pillStyle(variant: "open" | "done" | "neutral"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 900,
    padding: "6px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    whiteSpace: "nowrap",
  };

  if (variant === "open") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--brand-600) 22%, var(--border))",
      background: "var(--brand-050)",
      color: "var(--brand-800)",
    };
  }

  if (variant === "done") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--success) 28%, var(--border))",
      background: "color-mix(in srgb, var(--success) 14%, white)",
      color: "color-mix(in srgb, var(--success) 75%, black)",
    };
  }

  return {
    ...base,
    borderColor: "var(--border)",
    background: "var(--surface)",
    color: "var(--foreground)",
  };
}

function orderStatusVariant(status: string) {
  const s = (status || "").toUpperCase();
  if (["DRAFT", "SENT", "CONFIRMED", "FULFILLING", "LOCKED"].includes(s)) return "open" as const;
  if (["COMPLETED"].includes(s)) return "done" as const;
  return "neutral" as const;
}

function ivrStatusVariant(status: string) {
  const s = (status || "").toUpperCase();
  if (["NEW", "IN_REVIEW", "SUBMITTED"].includes(s)) return "open" as const;
  if (["COMPLETED", "APPROVED", "DONE"].includes(s)) return "done" as const;
  return "neutral" as const;
}

function orderTimelineSteps(status?: string | null) {
  const s = (status || "").toUpperCase();
  const steps = ["Order received", "Confirmed", "Picking", "Shipped"];
  let activeIndex = 0;

  if (["CONFIRMED"].includes(s)) activeIndex = 1;
  if (["FULFILLING", "LOCKED"].includes(s)) activeIndex = 2;
  if (["COMPLETED"].includes(s)) activeIndex = 3;

  return steps.map((title, idx) => ({ title, active: idx <= activeIndex }));
}

const baseBorder = {
  borderWidth: 1,
  borderStyle: "solid" as const,
  borderColor: "var(--border)",
};

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 16, display: "flex", flexDirection: "column", gap: 18 },

  hero: {
    borderRadius: 22,
    overflow: "hidden",
    border: "1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border))",
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
    maxWidth: 820,
  },

  heroRight: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },

  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "var(--brand-600)",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
    textDecoration: "none",
  },

  ghostBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 950,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
    textDecoration: "none",
  },

  heroStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 6,
    borderTop: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.03)",
  },

  heroStat: {
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 10,
    borderRight: "1px solid rgba(255,255,255,0.10)",
  },

  heroStatLabel: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: 900,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  heroStatValue: { color: "white", fontWeight: 950, fontSize: 20 },

  heroStatSub: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: 0.2,
  },

  card: {
    ...baseBorder,
    background: "var(--surface)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "var(--shadow-1)",
  },

  statLabel: {
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "var(--muted)",
  },

  statValue: { fontSize: 22, fontWeight: 950, marginTop: 8, color: "var(--foreground)" },

  statMeta: { marginTop: 6, fontSize: 13, color: "var(--muted)", lineHeight: 1.35 },

  section: { display: "flex", flexDirection: "column", gap: 12 },

  sectionHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  sectionTitle: { fontSize: 18, fontWeight: 950, margin: 0 },

  sectionLink: { fontSize: 14, fontWeight: 950, color: "var(--brand-700)", textDecoration: "none" },

  sectionHint: {
    fontSize: 13,
    color: "var(--muted)",
    fontWeight: 700,
  },

  tableWrap: {
    ...baseBorder,
    borderRadius: 16,
    overflow: "hidden",
    background: "var(--surface)",
    boxShadow: "var(--shadow-1)",
  },

  table: { width: "100%", borderCollapse: "collapse" },

  th: {
    textAlign: "left",
    padding: 12,
    fontSize: 12,
    fontWeight: 950,
    background: "rgba(0,0,0,0.03)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    whiteSpace: "nowrap",
  },

  thRight: {
    textAlign: "right",
    padding: 12,
    fontSize: 12,
    fontWeight: 950,
    background: "rgba(0,0,0,0.03)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    whiteSpace: "nowrap",
  },

  // ✅ Narrow, right-aligned header for date columns
  thNarrowRight: {
    textAlign: "right",
    padding: 12,
    fontSize: 12,
    fontWeight: 950,
    background: "rgba(0,0,0,0.03)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    whiteSpace: "nowrap",
    width: 96,
  },

  td: { padding: 12, borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13, verticalAlign: "top" },

  tdRight: {
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    fontSize: 13,
    verticalAlign: "top",
    textAlign: "right",
    whiteSpace: "nowrap",
  },

  // ✅ Narrow, right-aligned cell for date columns
  tdNarrowRight: {
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    fontSize: 13,
    verticalAlign: "top",
    textAlign: "right",
    whiteSpace: "nowrap",
    width: 96,
  },

  // Narrow dashboard cards (invites / accounts): auto layout avoids role/account column overlap
  tableFit: { width: "100%", borderCollapse: "collapse", tableLayout: "auto" as const },
  thFit: {
    textAlign: "left",
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 950,
    background: "rgba(0,0,0,0.03)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    whiteSpace: "normal",
    lineHeight: 1.25,
    verticalAlign: "bottom",
  },
  thFitDate: {
    textAlign: "right",
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 950,
    background: "rgba(0,0,0,0.03)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    whiteSpace: "nowrap",
    width: "5.25rem",
    verticalAlign: "bottom",
  },
  tdFit: {
    padding: "8px 10px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    fontSize: 12,
    verticalAlign: "top",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  tdFitDate: {
    padding: "8px 10px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    fontSize: 12,
    verticalAlign: "top",
    textAlign: "right",
    whiteSpace: "nowrap",
    width: "5.25rem",
  },
  thFitRole: {
    textAlign: "left",
    padding: "8px 10px",
    fontSize: 10,
    fontWeight: 950,
    background: "rgba(0,0,0,0.03)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    whiteSpace: "nowrap",
    width: "1%",
    verticalAlign: "bottom",
    letterSpacing: 0.02,
  },
  tdFitRole: {
    padding: "6px 10px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    fontSize: 10,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    width: "1%",
    maxWidth: "9.25rem",
  },
  tdFitId: {
    padding: "8px 10px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    fontSize: 12,
    verticalAlign: "top",
    whiteSpace: "nowrap",
    maxWidth: "7rem",
    fontVariantNumeric: "tabular-nums",
    cursor: "default",
  },
  tdFitUsers: {
    padding: "8px 10px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    fontSize: 12,
    verticalAlign: "top",
    textAlign: "right",
    whiteSpace: "nowrap",
    width: "4rem",
    fontVariantNumeric: "tabular-nums",
  },
  thFitUsers: {
    textAlign: "right",
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 950,
    background: "rgba(0,0,0,0.03)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    whiteSpace: "nowrap",
    width: "4rem",
    verticalAlign: "bottom",
  },

  rowLink: { fontWeight: 950, textDecoration: "none", color: "var(--brand-700)" },

  empty: { padding: 16, fontSize: 13, color: "var(--muted)" },

  // ✅ strict 2-col when space allows, collapses to 1-col automatically
  twoCol: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    alignItems: "stretch",
  },

  twoColSection: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 0,
    minWidth: 0,
  },

  sectionCard: {
    ...baseBorder,
    borderRadius: 20,
    background: "var(--surface)",
    padding: 22,
    boxShadow: "0 4px 20px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  sectionCardIvR: {
    borderLeft: "4px solid color-mix(in srgb, var(--brand-600) 45%, transparent)",
  },

  sectionCardOrders: {
    borderLeft: "4px solid color-mix(in srgb, #059669 45%, transparent)",
  },

  sectionCardInvoices: {
    borderLeft: "4px solid color-mix(in srgb, #7c3aed 45%, transparent)",
  },

  sectionCardInvites: {
    borderLeft: "4px solid color-mix(in srgb, #ea580c 45%, transparent)",
  },

  sectionCardAccounts: {
    borderLeft: "4px solid color-mix(in srgb, #0ea5e9 45%, transparent)",
  },

  twoColTableWrap: {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
  },

  toolkitGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 18,
    marginTop: 14,
  },

  toolkitCard: {
    ...baseBorder,
    background: "var(--surface)",
    borderRadius: 16,
    padding: 16,
    display: "grid",
    gap: 12,
  },

  toolkitTitle: {
    fontSize: 15,
    fontWeight: 950,
  },

  toolkitSub: {
    fontSize: 13,
    color: "var(--muted)",
  },

  toolkitTimeline: {
    display: "grid",
    gap: 10,
  },

  toolkitItem: {
    display: "grid",
    gridTemplateColumns: "16px 1fr",
    gap: 12,
    alignItems: "start",
  },

  toolkitDot: {
    width: 10,
    height: 10,
    marginTop: 4,
    borderRadius: 999,
    background: "var(--border)",
  },

  toolkitDotActive: {
    background: "var(--brand-600)",
  },

  toolkitItemTitle: {
    fontWeight: 900,
    fontSize: 13,
  },

  toolkitMuted: {
    fontSize: 12,
    color: "var(--muted)",
  },

  sectionKpis: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "stretch",
  },

  sectionKpisInline: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 8,
    flexShrink: 0,
  },

  sectionKpiCard: {
    ...baseBorder,
    background:
      "radial-gradient(120px 60px at 10% 0%, color-mix(in srgb, var(--brand-600) 14%, transparent), transparent 70%)," +
      "linear-gradient(180deg, color-mix(in srgb, var(--brand-050) 40%, white), white)",
    borderRadius: 12,
    padding: "10px 12px",
    minWidth: 150,
    boxShadow: "var(--shadow-1)",
  },

  sectionKpiCardCompact: {
    ...baseBorder,
    background:
      "radial-gradient(120px 60px at 10% 0%, color-mix(in srgb, var(--brand-600) 14%, transparent), transparent 70%)," +
      "linear-gradient(180deg, color-mix(in srgb, var(--brand-050) 40%, white), white)",
    borderRadius: 10,
    padding: "8px 10px",
    minWidth: 0,
    boxShadow: "var(--shadow-1)",
  },

  sectionKpiLabel: {
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "var(--muted)",
  },

  sectionKpiValue: { fontSize: 18, fontWeight: 950, marginTop: 6, color: "var(--foreground)" },

  sectionKpiSub: { marginTop: 4, fontSize: 12, color: "var(--muted)", fontWeight: 700 },
};

export default async function AdminDashboardHome() {
  await requireAdmin();
  const supabase: any = createSupabaseAdminClient();

  const [
    accountsCountRes,
    invitesPendingCountRes,
    ivrNewCountRes,
    ivrReviewCountRes,
    ivrTotalCountRes,
    ordersCountRes,
    ordersOpenCountRes,
    ordersKpiRes,
    recentAccountsRes,
    recentInvitesRes,
    recentIvrRes,
    recentOrdersRes,
    invoicesKpiRes,
    recentInvoicesRes,
    usersCountRes,
  ] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }),

    supabase
      .from("account_invites")
      .select("id", { count: "exact", head: true })
      .is("accepted_at", null)
      .is("revoked_at", null)
      .is("archived_at", null),

    supabase.from("ivr_requests").select("id", { count: "exact", head: true }).eq("status", "NEW"),

    supabase.from("ivr_requests").select("id", { count: "exact", head: true }).eq("status", "IN_REVIEW"),

    supabase.from("ivr_requests").select("id", { count: "exact", head: true }),

    supabase.from("orders").select("id", { count: "exact", head: true }),

    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["DRAFT", "SENT", "CONFIRMED", "FULFILLING", "LOCKED"]),

    supabase
      .from("orders")
      .select("id, status, total")
      .order("created_at", { ascending: false })
      .limit(2000),

    supabase.from("accounts").select("id,name,created_at").order("created_at", { ascending: false }).limit(5),

    supabase
      .from("account_invites")
      .select("id,account_id,email,role,created_at,accepted_at,revoked_at,expires_at")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("ivr_requests")
      .select("id,status,account_id,created_at,patient_first_name,patient_last_name")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("orders")
      .select("id,account_id,created_at,placed_at,status,order_number,total")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("invoices")
      .select("id,status,total,amount_paid,issued_at,created_at,account_id")
      .order("created_at", { ascending: false })
      .limit(2000),

    supabase
      .from("invoices")
      .select("id,invoice_number,status,total,issued_at,account_id")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase.auth.admin.listUsers({ page: 1, perPage: 1 }),
  ]);

  const accountsCount = accountsCountRes.count ?? 0;
  const invitesPendingCount = invitesPendingCountRes.count ?? 0;
  const usersCount =
    (usersCountRes as any)?.data?.total ??
    (usersCountRes as any)?.total ??
    (usersCountRes as any)?.data?.users?.length ??
    0;

  const ivrNewCount = ivrNewCountRes.count ?? 0;
  const ivrReviewCount = ivrReviewCountRes.count ?? 0;
  const ivrTotalCount = ivrTotalCountRes.count ?? 0;

  const ordersCount = ordersCountRes.count ?? 0;
  const ordersOpenCount = ordersOpenCountRes.count ?? 0;

  const ordersKpiRows: AnyRow[] = ordersKpiRes.data ?? [];
  const recentAccounts: AnyRow[] = recentAccountsRes.data ?? [];
  const recentAccountIds = recentAccounts.map((a: any) => String(a?.id ?? "").trim()).filter(Boolean);

  const userCountByAccount: Record<string, number> = {};
  if (recentAccountIds.length) {
    const { data: auRows } = await supabase.from("account_users").select("account_id").in("account_id", recentAccountIds);
    for (const r of auRows ?? []) {
      const aid = String((r as any)?.account_id ?? "");
      if (!aid) continue;
      userCountByAccount[aid] = (userCountByAccount[aid] ?? 0) + 1;
    }
  }

  const recentInvites: AnyRow[] = recentInvitesRes.data ?? [];
  const recentIvr: AnyRow[] = recentIvrRes.data ?? [];
  const recentOrders: AnyRow[] = recentOrdersRes.data ?? [];
  const invoicesKpiRows: AnyRow[] = invoicesKpiRes.data ?? [];
  const recentInvoices: AnyRow[] = recentInvoicesRes.data ?? [];

  const latestOrder = recentOrders[0] || null;

  const accountIds = Array.from(
    new Set(
      [
        ...recentInvites.map((x: any) => x.account_id).filter(Boolean),
        ...recentIvr.map((x: any) => x.account_id).filter(Boolean),
        ...recentOrders.map((x: any) => x.account_id).filter(Boolean),
        ...recentInvoices.map((x: any) => x.account_id).filter(Boolean),
      ].map(String)
    )
  );

  const accountNameById: Record<string, string> = {};
  if (accountIds.length) {
    const { data: accs } = await supabase.from("accounts").select("id,name").in("id", accountIds);
    (accs ?? []).forEach((a: any) => {
      if (a?.id) accountNameById[String(a.id)] = safeStr(a.name) || String(a.id);
    });
  }

  const ordersTotalValue = ordersKpiRows.reduce((sum, r) => sum + safeNum(r?.total), 0);
  const ordersSqcmTotal = await totalSqcmForOrders(
    supabase,
    ordersKpiRows.map((r: any) => String(r?.id || "")).filter(Boolean)
  );

  const invoiceAccountIds = Array.from(
    new Set(invoicesKpiRows.map((r: any) => String(r?.account_id || "")).filter(Boolean))
  );
  const { data: pricingRows } = invoiceAccountIds.length
    ? await supabase
        .from("account_pricing")
        .select("account_id, payment_terms_days")
        .in("account_id", invoiceAccountIds)
        .limit(500)
    : { data: [] };
  const termsDaysByAccount = new Map<string, number>();
  (pricingRows ?? []).forEach((p: any) => {
    const id = String(p?.account_id || "");
    if (!id) return;
    const days = Number(p?.payment_terms_days);
    termsDaysByAccount.set(id, Number.isFinite(days) ? days : 30);
  });

  const invoiceSummary = invoicesKpiRows.reduce(
    (acc: any, r: any) => {
      const status = safeStr(r?.status).toUpperCase();
      const total = safeNum(r?.total);
      const paidRaw = Number(r?.amount_paid);
      const paid = Number.isFinite(paidRaw) ? paidRaw : status === "PAID" ? total : 0;
      const isVoided = status === "VOID" || status === "VOIDED";
      const outstanding = isVoided ? 0 : Math.max(0, total - paid);

      const accountId = String(r?.account_id || "");
      const termsDays = termsDaysByAccount.get(accountId) ?? 30;
      const baseDateRaw = safeStr(r?.issued_at || r?.created_at);
      const baseDate = baseDateRaw ? new Date(baseDateRaw) : null;
      const dueDate = baseDate && !Number.isNaN(baseDate.getTime()) ? addDays(baseDate, termsDays) : null;
      const isOverdue = !!dueDate && outstanding > 0 && new Date().getTime() > dueDate.getTime();

      acc.total += 1;
      acc.outstandingTotal += outstanding;
      acc.overdueTotal += isOverdue ? outstanding : 0;

      if (status === "ISSUED" || status === "SENT") {
        acc.issuedCount += 1;
        acc.issuedTotal += total;
      } else if (status === "PAID") {
        acc.paidCount += 1;
        acc.paidTotal += total;
      } else if (status === "PARTIALLY_PAID") {
        acc.partialCount += 1;
        acc.partialTotal += total;
      }

      return acc;
    },
    {
      total: 0,
      issuedCount: 0,
      issuedTotal: 0,
      paidCount: 0,
      paidTotal: 0,
      partialCount: 0,
      partialTotal: 0,
      outstandingTotal: 0,
      overdueTotal: 0,
    }
  );

  const shouldPulseIvr = ivrNewCount > 0;
  const shouldPulseOpenOrders = ordersOpenCount > 1;

  return (
    <main style={styles.page}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes kpi-pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.75; }
            }
            .kpi-pulse { animation: kpi-pulse 2s ease-in-out infinite; }
          `,
        }}
      />
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.heroKicker}>360 Admin</div>
            <h1 style={styles.heroTitle}>Dashboard</h1>
            <p style={styles.heroSub}>Overview + shortcuts for operations, accounts, and requests.</p>
          </div>

          <div style={styles.heroRight}>
            <Link href="/admin/invite" style={styles.primaryBtn}>
              Invite →
            </Link>
            <Link href="/admin/accounts/new" style={styles.ghostBtn}>
              + Account
            </Link>
            <Link href="/admin/orders" style={styles.ghostBtn}>
              Orders
            </Link>
            <Link href="/admin/documents" style={styles.ghostBtn}>
              Documents
            </Link>
            <Link href="/admin/ivr" style={styles.ghostBtn}>
              IVR
            </Link>
          </div>
        </div>

      {/* Quick stats */}
        <div style={styles.heroStatsRow}>
          <Link href="/admin/accounts" style={{ ...styles.heroStat, textDecoration: "none", color: "inherit" }}>
            <div style={styles.heroStatLabel}>Accounts</div>
            <div style={styles.heroStatValue}>{accountsCount}</div>
            <div style={styles.heroStatSub}>
              {usersCount.toLocaleString()} users • {invitesPendingCount.toLocaleString()} invites pending
            </div>
          </Link>

          <Link
            href="/admin/orders?status=OPEN"
            style={{ ...styles.heroStat, textDecoration: "none", color: "inherit" }}
            className={shouldPulseOpenOrders ? "kpi-pulse" : undefined}
          >
            <div style={styles.heroStatLabel}>Open Orders</div>
            <div style={styles.heroStatValue}>{ordersOpenCount}</div>
            <div style={styles.heroStatSub}>{ordersCount.toLocaleString()} total orders</div>
          </Link>

          <Link href="/admin/invoices" style={{ ...styles.heroStat, textDecoration: "none", color: "inherit" }}>
            <div style={styles.heroStatLabel}>Invoice Info</div>
            <div style={styles.heroStatValue}>{fmtMoney(invoiceSummary.outstandingTotal)}</div>
            <div style={styles.heroStatSub}>
              {fmtMoney(invoiceSummary.overdueTotal)} overdue • {invoiceSummary.issuedCount} issued
            </div>
          </Link>

          <Link
            href="/admin/ivr?status=NEW"
            style={{ ...styles.heroStat, textDecoration: "none", color: "inherit" }}
            className={shouldPulseIvr ? "kpi-pulse" : undefined}
          >
            <div style={styles.heroStatLabel}>IVR</div>
            <div style={styles.heroStatValue}>{ivrNewCount}</div>
            <div style={styles.heroStatSub}>{ivrReviewCount} in review</div>
          </Link>
        </div>
      </div>

      {/* Row 1: Recent IVR + Recent Orders */}
      <div style={styles.twoCol}>
        {/* Recent IVR */}
        <div style={{ ...styles.sectionCard, ...styles.sectionCardIvR, ...styles.twoColSection }}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Recent IVR Requests</h2>
            <Link href="/admin/ivr" style={styles.sectionLink}>
              View all →
            </Link>
          </div>

          <div style={styles.sectionKpis}>
            <Link href="/admin/ivr?status=ALL" style={{ ...styles.sectionKpiCard, textDecoration: "none", color: "inherit", cursor: "pointer" }}>
              <div style={styles.sectionKpiLabel}>Total</div>
              <div style={styles.sectionKpiValue}>{ivrTotalCount}</div>
            </Link>
            <Link
              href="/admin/ivr?status=NEW"
              style={{ ...styles.sectionKpiCard, textDecoration: "none", color: "inherit", cursor: "pointer" }}
              className={shouldPulseIvr ? "kpi-pulse" : undefined}
            >
              <div style={styles.sectionKpiLabel}>NEW</div>
              <div style={styles.sectionKpiValue}>{ivrNewCount}</div>
            </Link>
            <Link href="/admin/ivr?status=IN_REVIEW" style={{ ...styles.sectionKpiCard, textDecoration: "none", color: "inherit", cursor: "pointer" }}>
              <div style={styles.sectionKpiLabel}>IN_REVIEW</div>
              <div style={styles.sectionKpiValue}>{ivrReviewCount}</div>
            </Link>
          </div>

          <div style={{ ...styles.tableWrap, ...styles.twoColTableWrap }}>
            {recentIvr.length === 0 ? (
              <div style={styles.empty}>No IVR requests yet.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Patient</th>
                    <th style={styles.th}>Account</th>
                    <th style={styles.thNarrowRight}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIvr.map((r: any) => {
                    const id = safeStr(r.id);
                    const st = safeStr(r.status) || "—";
                    const patient = [r.patient_first_name, r.patient_last_name].filter(Boolean).join(" ").trim() || "—";
                    const acct = accountNameById[safeStr(r.account_id)] || shortId(r.account_id);

                    return (
                      <tr key={id}>
                        <td style={styles.td}>
                          <span style={pillStyle(ivrStatusVariant(st))}>{formatStatusLabel(st)}</span>
                        </td>
                        <td style={styles.td}>
                          <Link href={`/admin/ivr/${encodeURIComponent(id)}`} style={styles.rowLink}>
                            {patient}
                          </Link>
                        </td>
                        <td style={styles.td}>{acct}</td>
                        <td style={styles.tdNarrowRight}>{fmtDate(r.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div style={{ ...styles.sectionCard, ...styles.sectionCardOrders, ...styles.twoColSection }}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Recent Orders</h2>
            <Link href="/admin/orders" style={styles.sectionLink}>
              View all →
            </Link>
          </div>

          <div style={styles.sectionKpisInline}>
            <Link href="/admin/orders" style={{ ...styles.sectionKpiCardCompact, textDecoration: "none", color: "inherit", cursor: "pointer" }}>
              <div style={styles.sectionKpiLabel}>Total</div>
              <div style={styles.sectionKpiValue}>{ordersCount}</div>
            </Link>
            <Link
              href="/admin/orders?status=OPEN"
              style={{ ...styles.sectionKpiCardCompact, textDecoration: "none", color: "inherit", cursor: "pointer" }}
              className={shouldPulseOpenOrders ? "kpi-pulse" : undefined}
            >
              <div style={styles.sectionKpiLabel}>Open</div>
              <div style={styles.sectionKpiValue}>{ordersOpenCount}</div>
            </Link>
            <Link href="/admin/orders" style={{ ...styles.sectionKpiCardCompact, textDecoration: "none", color: "inherit", cursor: "pointer" }}>
              <div style={styles.sectionKpiLabel}>Value</div>
              <div style={styles.sectionKpiValue}>{fmtMoney(ordersTotalValue)}</div>
            </Link>
            <Link href="/admin/orders" style={{ ...styles.sectionKpiCardCompact, textDecoration: "none", color: "inherit", cursor: "pointer" }}>
              <div style={styles.sectionKpiLabel}>Sq cm</div>
              <div style={styles.sectionKpiValue}>{fmtNumber(ordersSqcmTotal)}</div>
            </Link>
          </div>

          <div style={{ ...styles.tableWrap, ...styles.twoColTableWrap }}>
            {recentOrders.length === 0 ? (
              <div style={styles.empty}>No orders yet.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Order #</th>
                    <th style={styles.th}>Account</th>
                    <th style={styles.thNarrowRight}>Date</th>
                    <th style={styles.thRight}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o: any) => {
                    const id = safeStr(o.id);
                    const st = safeStr(o.status) || "—";
                    const acct = accountNameById[safeStr(o.account_id)] || shortId(o.account_id);
                    const orderNum = safeStr(o.order_number) || shortId(id);
                    const created = fmtDate(o.placed_at || o.created_at);
                    const total = fmtMoney(o.total);

                    return (
                      <tr key={id}>
                        <td style={styles.td}>
                          <span style={pillStyle(orderStatusVariant(st))}>{formatStatusLabel(st)}</span>
                        </td>
                        <td style={styles.td}>
                          <Link href={`/admin/orders/${encodeURIComponent(id)}`} style={styles.rowLink}>
                            {orderNum}
                          </Link>
                        </td>
                        <td style={styles.td}>{acct}</td>
                        <td style={styles.tdNarrowRight}>{created}</td>
                        <td style={styles.tdRight}>{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Recent Invoices */}
      <div style={{ ...styles.sectionCard, ...styles.sectionCardInvoices }}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Recent Invoices</h2>
          <Link href="/admin/invoices" style={styles.sectionLink}>
            View all →
          </Link>
        </div>

        <div style={styles.sectionKpis}>
          <Link href="/admin/invoices?status=ISSUED" style={{ ...styles.sectionKpiCard, textDecoration: "none", color: "inherit", cursor: "pointer" }}>
            <div style={styles.sectionKpiLabel}>Issued</div>
            <div style={styles.sectionKpiValue}>{invoiceSummary.issuedCount}</div>
            <div style={styles.sectionKpiSub}>{fmtMoney(invoiceSummary.issuedTotal)}</div>
          </Link>
          <Link href="/admin/invoices?status=PAID" style={{ ...styles.sectionKpiCard, textDecoration: "none", color: "inherit", cursor: "pointer" }}>
            <div style={styles.sectionKpiLabel}>Paid</div>
            <div style={styles.sectionKpiValue}>{invoiceSummary.paidCount}</div>
            <div style={styles.sectionKpiSub}>{fmtMoney(invoiceSummary.paidTotal)}</div>
          </Link>
          <Link href="/admin/invoices?status=PARTIALLY_PAID" style={{ ...styles.sectionKpiCard, textDecoration: "none", color: "inherit", cursor: "pointer" }}>
            <div style={styles.sectionKpiLabel}>Partial</div>
            <div style={styles.sectionKpiValue}>{invoiceSummary.partialCount}</div>
            <div style={styles.sectionKpiSub}>{fmtMoney(invoiceSummary.partialTotal)}</div>
          </Link>
          <Link href="/admin/invoices" style={{ ...styles.sectionKpiCard, textDecoration: "none", color: "inherit", cursor: "pointer" }}>
            <div style={styles.sectionKpiLabel}>Outstanding</div>
            <div style={styles.sectionKpiValue}>{fmtMoney(invoiceSummary.outstandingTotal)}</div>
            <div style={styles.sectionKpiSub}>Open balance</div>
          </Link>
          <Link href="/admin/invoices" style={{ ...styles.sectionKpiCard, textDecoration: "none", color: "inherit", cursor: "pointer" }}>
            <div style={styles.sectionKpiLabel}>Overdue</div>
            <div style={styles.sectionKpiValue}>{fmtMoney(invoiceSummary.overdueTotal)}</div>
            <div style={styles.sectionKpiSub}>Past terms</div>
          </Link>
        </div>

        <div style={styles.tableWrap}>
          {recentInvoices.length === 0 ? (
            <div style={styles.empty}>No invoices yet.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Invoice #</th>
                  <th style={styles.th}>Account</th>
                  <th style={styles.thNarrowRight}>Issued</th>
                  <th style={styles.thRight}>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv: any) => {
                  const id = safeStr(inv.id);
                  const st = safeStr(inv.status) || "—";
                  const acct = accountNameById[safeStr(inv.account_id)] || shortId(inv.account_id);
                  const invNum = safeStr(inv.invoice_number) || shortId(id);
                  return (
                    <tr key={id}>
                      <td style={styles.td}>
                        <span style={pillStyle(st === "PAID" ? "done" : "open")}>{formatStatusLabel(st)}</span>
                      </td>
                      <td style={styles.td}>
                        <Link href={`/admin/invoices/${encodeURIComponent(id)}`} style={styles.rowLink}>
                          {invNum}
                        </Link>
                      </td>
                      <td style={styles.td}>{acct}</td>
                      <td style={styles.tdNarrowRight}>{fmtDate(inv.issued_at)}</td>
                      <td style={styles.tdRight}>{fmtMoney(inv.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Row 3: Recent Invites + Recent Accounts */}
      <div style={styles.twoCol}>
        {/* Recent Invites */}
        <div style={{ ...styles.sectionCard, ...styles.sectionCardInvites, ...styles.twoColSection }}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Recent Invites</h2>
            <Link href="/admin/invites" style={styles.sectionLink}>
              View all →
            </Link>
          </div>

          <div style={styles.tableWrap}>
            {recentInvites.length === 0 ? (
              <div style={styles.empty}>No invites yet.</div>
            ) : (
              <table style={styles.tableFit}>
                <thead>
                  <tr>
                    <th style={styles.thFit}>Email</th>
                    <th style={styles.thFitRole}>Role</th>
                    <th style={styles.thFit}>Account</th>
                    <th style={styles.thFitDate}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvites.map((inv: any) => {
                    const id = safeStr(inv.id);
                    const acct = accountNameById[safeStr(inv.account_id)] || shortId(inv.account_id);
                    return (
                      <tr key={id}>
                        <td style={styles.tdFit}>
                          <span style={{ fontWeight: 950 }}>{safeStr(inv.email) || "—"}</span>
                        </td>
                        <td style={styles.tdFitRole}>
                          <span
                            title={formatRoleLabel(inv.role) || undefined}
                            style={{
                              ...pillStyle("neutral"),
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "2px 6px",
                              lineHeight: 1.2,
                              maxWidth: "100%",
                              display: "inline-block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              verticalAlign: "middle",
                            }}
                          >
                            {formatRoleLabel(inv.role) || "—"}
                          </span>
                        </td>
                        <td style={{ ...styles.tdFit, minWidth: 0 }}>{acct}</td>
                        <td style={styles.tdFitDate}>{fmtDate(inv.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Accounts */}
        <div style={{ ...styles.sectionCard, ...styles.sectionCardAccounts, ...styles.twoColSection }}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Recent Accounts</h2>
            <Link href="/admin/accounts" style={styles.sectionLink}>
              View all →
            </Link>
          </div>

          <div style={styles.tableWrap}>
            {recentAccounts.length === 0 ? (
              <div style={styles.empty}>No accounts yet.</div>
            ) : (
              <table style={styles.tableFit}>
                <thead>
                  <tr>
                    <th style={styles.thFit}>Name</th>
                    <th style={styles.thFit}>ID</th>
                    <th style={styles.thFitUsers}>Users</th>
                    <th style={styles.thFitDate}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAccounts.map((a: any) => {
                    const id = safeStr(a.id);
                    const name = safeStr(a.name) || "—";
                    const nUsers = userCountByAccount[id] ?? 0;
                    return (
                      <tr key={id}>
                        <td style={styles.tdFit}>
                          <Link href={`/admin/accounts/${encodeURIComponent(id)}`} style={styles.rowLink}>
                            {name}
                          </Link>
                        </td>
                        <td style={styles.tdFitId} title={id}>
                          {shortId(id)}
                        </td>
                        <td style={styles.tdFitUsers}>{nUsers.toLocaleString()}</td>
                        <td style={styles.tdFitDate}>{fmtDate(a.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* UI Toolkit removed */}
    </main>
  );
}
