import Link from "next/link";
import { Suspense } from "react";
import { formatBulkPricePerSqcmLabel, normalizeBulkRules } from "@/lib/bulkRules";
import AdminInvoiceStripePayClient from "@/app/admin/invoices/[invoiceId]/AdminInvoiceStripePayClient";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { formatOrderStatusLabel, formatStatusLabel } from "@/lib/formatStatusLabel";
import OrderStatusFlowForOrder from "@/components/admin/OrderStatusFlowForOrder";
import { extractDropshipShipping, extractInventoryShipping } from "@/lib/admin/fulfillmentSignals";
import LockAndFulfillButton from "@/components/admin/LockAndFulfillButton";
import { INVOICE_KIND_PRIMARY, INVOICE_KIND_SHIPPING_SUPPLEMENT } from "@/lib/billing/invoiceKinds";
import { effectivePaymentTermsDays } from "@/lib/billing/effectivePaymentTermsDays";
import { shipNowQtyForLine } from "@/lib/virtualWarehouse/shipNowQty";
import { loadPartnerOrigin } from "@/lib/integrations/partnerOriginLabel";

export const dynamic = "force-dynamic";

// Strict UUID v1–v5
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

function safeUpper(v: any) {
  return String(v ?? "").toUpperCase();
}

function safeStr(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}
function hasRole(ctx: any, role: string) {
  if (!ctx) return false;
  if (ctx.kind === "ADMIN") return true;
  const roles: string[] = Array.isArray(ctx.staffRoles) ? ctx.staffRoles : [];
  return roles.includes(role);
}

function pill(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    whiteSpace: "nowrap",
  };

  const s = safeUpper(status);
  if (s === "DRAFT") return { ...base, background: "rgba(0,0,0,0.04)" };
  if (s === "CONFIRMED") return { ...base, background: "rgba(13, 110, 253, 0.14)" };
  if (s === "LOCKED") return { ...base, background: "rgba(0,0,0,0.08)" };
  if (s === "FULFILLING") return { ...base, background: "rgba(255, 153, 0, 0.16)" };
  if (s === "NEEDS_INVOICE")
    return {
      ...base,
      background: "rgba(220, 53, 69, 0.10)",
      border: "1px solid rgba(220,53,69,0.25)",
    };
  if (s === "INVOICED")
    return {
      ...base,
      background: "rgba(13, 110, 253, 0.12)",
      border: "1px solid rgba(13,110,253,0.25)",
    };
  if (s === "PARTIALLY_PAID") return { ...base, background: "rgba(255,193,7,0.18)" };
  if (s === "PENDING_WIRE")
    return {
      ...base,
      background: "rgba(245, 158, 11, 0.16)",
      border: "1px solid rgba(245, 158, 11, 0.35)",
    };
  if (s === "PAID") return { ...base, background: "rgba(25, 135, 84, 0.14)" };
  if (s === "COMPLETED")
    return {
      ...base,
      background: "rgba(13, 110, 253, 0.12)",
      border: "1px solid rgba(13,110,253,0.25)",
    };
  if (s === "CANCELLED") return { ...base, background: "rgba(220, 53, 69, 0.12)" };
  return base;
}

/**
 * ✅ Hydration-safe money/date formatters
 */
const USD_FMT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const DT_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return USD_FMT.format(v);
}

function fmtPct(n: number) {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function fmtSqcm(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function dateTime(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return DT_FMT.format(d);
}

function compactJson(v: any) {
  try {
    if (!v) return "—";
    const s = JSON.stringify(v);
    if (s.length <= 220) return s;
    return s.slice(0, 220) + "…";
  } catch {
    return "—";
  }
}

function isVirtualWarehouseBulkDepositLine(it: any): boolean {
  return safeStr(it?.description).startsWith("Virtual warehouse bulk purchase");
}

function computeDiscountFromItems(items: any[], overrideDiscountPercent?: number) {
  let rawMerch = 0;
  let merchAfterDiscount = 0;
  const override =
    typeof overrideDiscountPercent === "number" && Number.isFinite(overrideDiscountPercent)
      ? Math.min(100, Math.max(0, overrideDiscountPercent))
      : null;
  const hasVwDeposit = (items ?? []).some((x) => isVirtualWarehouseBulkDepositLine(x));

  for (const it of items ?? []) {
    const lineType = safeUpper(it?.line_type);
    if (lineType === "SHIPPING") continue;
    const qty = safeNum(it?.quantity);
    const unit = safeNum(it?.unit_price);
    if (qty <= 0) continue;
    const raw = unit * qty;

    if (isVirtualWarehouseBulkDepositLine(it)) {
      rawMerch += raw;
      const lt = safeNum(it?.line_total);
      const disc = Math.min(100, Math.max(0, safeNum(it?.discount_percent)));
      merchAfterDiscount += lt > 0 ? lt : raw * (1 - disc / 100);
      continue;
    }

    if (hasVwDeposit && lineType === "PRODUCT" && safeNum(it?.line_total) === 0) {
      continue;
    }

    rawMerch += raw;

    if (override !== null) {
      merchAfterDiscount += raw * (1 - override / 100);
      continue;
    }

    const storedLineTotal = safeNum(it?.line_total);
    if (storedLineTotal > 0) {
      merchAfterDiscount += storedLineTotal;
      continue;
    }
    const lineDiscount = Math.min(100, Math.max(0, safeNum(it?.discount_percent)));
    merchAfterDiscount += raw * (1 - lineDiscount / 100);
  }
  const discountAmount = Math.max(0, rawMerch - merchAfterDiscount);
  const discountPercent =
    override !== null ? override : rawMerch > 0 ? Math.min(100, Math.max(0, (discountAmount / rawMerch) * 100)) : 0;
  return { rawMerch, merchAfterDiscount, discountPercent };
}

function sqcmFromVariant(v: any): number {
  const direct = safeNum(v?.total_sqcm);
  if (direct > 0) return direct;
  const w = safeNum(v?.width_cm);
  const l = safeNum(v?.length_cm);
  if (w > 0 && l > 0) return w * l;
  const s = safeStr(v?.size_label).toLowerCase().replace(/\s+/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)(?:cm)?$/i);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) return a * b;
  }
  return 0;
}

function computeTotalSqcm(items: any[], variantsById: Map<string, any>) {
  let total = 0;
  for (const it of items ?? []) {
    const lineType = safeUpper(it?.line_type);
    if (lineType === "SHIPPING") continue;
    const qty = safeNum(it?.quantity);
    if (qty <= 0) continue;
    const v = variantsById.get(String(it?.product_variant_id));
    total += sqcmFromVariant(v) * qty;
  }
  return total;
}

function buttonStyle(primary?: boolean, danger?: boolean, onDark?: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 950,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    whiteSpace: "nowrap",
    textDecoration: "none",
  };

  if (danger) {
    return {
      ...base,
      border: "1px solid rgba(220,53,69,0.35)",
      background: onDark ? "rgba(220,53,69,0.18)" : "rgba(220,53,69,0.08)",
      color: onDark ? "white" : "crimson",
    };
  }

  if (primary) return { ...base, background: onDark ? "#1e88e5" : "#111", color: "white" };
  return { ...base, background: onDark ? "rgba(255,255,255,0.95)" : "white", color: "#111" };
}

function HeroStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 10,
        borderRight: "1px solid rgba(255,255,255,0.12)",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 950, color: "white", textAlign: "right" }}>{value}</div>
    </div>
  );
}

type ActivityRow = {
  id: string;
  kind: "STATUS" | "AUDIT" | "LOCK_AUDIT" | "WIRE";
  title: string;
  when: string | null;
  actor: string | null;
  meta: any;
  sub?: string | null;
};

type AccountRow = { id: string; name: string | null };
type ProfileRow = { user_id: string; email: string; full_name: string | null };
type ContactRow = { id: string; email: string; full_name: string | null };

function displayAccount(a: AccountRow | null | undefined) {
  const nm = String(a?.name ?? "").trim();
  return nm || "—";
}

function displayUser(p: ProfileRow | null | undefined) {
  if (!p) return "—";
  const nm = String(p.full_name ?? "").trim();
  if (nm) return nm;
  const em = String(p.email ?? "").trim();
  return em || "—";
}

function displayContact(p: ContactRow | null | undefined) {
  if (!p) return "—";
  const nm = String(p.full_name ?? "").trim();
  if (nm) return nm;
  const em = String(p.email ?? "").trim();
  return em || "—";
}

function buildTrackingLink(carrierRaw: string, trackingRaw: string) {
  const carrier = safeUpper(carrierRaw);
  const tracking = safeStr(trackingRaw);
  if (!tracking) return null;

  if (carrier.includes("FEDEX"))
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(tracking)}`;
  if (carrier.includes("UPS"))
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(tracking)}`;
  if (carrier.includes("USPS"))
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(tracking)}`;

  return null;
}

// ✅ Keep style object stable
const PAGE_CARD: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 16,
  background: "white",
  boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
  overflow: "hidden",
};

const ORDER_SELECT = `id, account_id, order_number, status, created_by_user_id, submitted_by_contact_id, shipping_priority, shipping_eta_days,
discount_percent_snapshot, bulk_price_per_sqcm_snapshot, payment_terms_label_snapshot, payment_terms_days_snapshot, bulk_mode, total_sqcm,
subtotal, shipping_total, total, created_at, placed_at, locked_at, invoice_address, delivery_address` as const;

const ITEMS_SELECT =
  `id, description, quantity, uom, unit_price, discount_percent, line_total, line_type, sort_order` as const;

const INVOICE_SELECT = `id, invoice_number, status, metadata, created_at, issued_at, voided_at, total, amount_paid` as const;

const FULFILLMENT_SELECT =
  `id, order_id, status, fulfillment_source, created_at, closed_at, shipped_at, tracking_number, metadata,
dropship_vendor_id, dropship_status, dropship_packing_slip_number, dropship_tracking_number, dropship_carrier, dropship_ship_date` as const;

const ACCT_SELECT = `id, name, is_demo` as const;
const PROFILE_SELECT = `user_id, email, full_name` as const;

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireOrdersStaffOrAdmin();

  const resolved = await params;
  const sp = (await (searchParams ?? Promise.resolve({}))) as Record<string, string | string[] | undefined>;
  const skippedFulfillmentQuery =
    sp?.skipped_fulfillment === "1" ||
    (Array.isArray(sp?.skipped_fulfillment) && sp?.skipped_fulfillment[0] === "1");
  const orderId = normalizeParam(resolved?.orderId ?? "");

  if (!UUID_RE.test(orderId)) {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Order</h1>
        <div style={{ marginTop: 12, color: "crimson", fontWeight: 950 }}>Invalid orderId.</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/admin/orders" style={{ textDecoration: "none", fontWeight: 950 }}>
            ← Back to Orders
          </Link>
        </div>
      </main>
    );
  }

  const { data: order, error: ordErr } = await supabaseAdmin
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Order</h1>
        <div style={{ marginTop: 12, color: "crimson", fontWeight: 950 }}>{ordErr.message}</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/admin/orders" style={{ textDecoration: "none", fontWeight: 950 }}>
            ← Back to Orders
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Order</h1>
        <div style={{ marginTop: 12, opacity: 0.8 }}>Not found.</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/admin/orders" style={{ textDecoration: "none", fontWeight: 950 }}>
            ← Back to Orders
          </Link>
        </div>
      </main>
    );
  }

  const { data: items, error: itemErr } = await supabaseAdmin
    .from("order_items")
    .select(ITEMS_SELECT)
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true });

  if (itemErr) {
    return (
      <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>
          Order {(order as any).order_number ?? ""}
        </h1>
        <div style={{ marginTop: 12, color: "crimson", fontWeight: 950 }}>{itemErr.message}</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/admin/orders" style={{ textDecoration: "none", fontWeight: 950 }}>
            ← Back to Orders
          </Link>
        </div>
      </main>
    );
  }

  const allProductLinesForPick = (items ?? []).filter((it: any) => safeUpper(it?.line_type) === "PRODUCT");
  const needsInventoryFulfillment = allProductLinesForPick.some((it: any) => shipNowQtyForLine(it) > 0);
  const hasProductLinesForPick = allProductLinesForPick.length > 0;
  const showNoInventoryFulfillmentBanner =
    skippedFulfillmentQuery || (hasProductLinesForPick && !needsInventoryFulfillment);

  const itemVariantIds = Array.from(
    new Set((items ?? []).map((it: any) => String(it?.product_variant_id || "")).filter(Boolean))
  );
  const { data: orderVariants } = itemVariantIds.length
    ? await supabaseAdmin
        .from("product_variants")
        .select("id, size_label, width_cm, length_cm, total_sqcm")
        .in("id", itemVariantIds)
    : { data: [] as any[] };
  const orderVariantsById = new Map<string, any>((orderVariants ?? []).map((v: any) => [String(v.id), v]));

  const [{ data: acctRow }, { data: pricingRow }, { data: placedByRow }, { data: contactRow }] = await Promise.all([
    supabaseAdmin.from("accounts").select(ACCT_SELECT).eq("id", (order as any).account_id).maybeSingle(),
    supabaseAdmin
      .from("account_pricing")
      .select("payment_terms_days, payment_terms_label, bulk_enabled, bulk_rules")
      .eq("account_id", (order as any).account_id)
      .maybeSingle(),
    (order as any).created_by_user_id
      ? supabaseAdmin
          .from("user_profiles")
          .select(PROFILE_SELECT)
          .eq("user_id", (order as any).created_by_user_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
    (order as any).submitted_by_contact_id
      ? supabaseAdmin
          .from("account_contacts")
          .select("id, email, full_name")
          .eq("id", (order as any).submitted_by_contact_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const account: AccountRow | null = acctRow
    ? { id: String((acctRow as any).id), name: (acctRow as any).name ?? null }
    : null;
  const isDemoAccount = !!(acctRow as { is_demo?: boolean | null } | null)?.is_demo;

  const placedBy: ProfileRow | null = placedByRow
    ? {
        user_id: String((placedByRow as any).user_id),
        email: String((placedByRow as any).email ?? ""),
        full_name: (placedByRow as any).full_name ?? null,
      }
    : null;

  const placedByContact: ContactRow | null = contactRow
    ? {
        id: String((contactRow as any).id),
        email: String((contactRow as any).email ?? ""),
        full_name: (contactRow as any).full_name ?? null,
      }
    : null;

  // Primary invoice (bulk / products — one per order)
  const { data: existingInvoice } = await supabaseAdmin
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_PRIMARY)
    .maybeSingle();

  const { data: shippingSupplementInvoices } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, status, total, created_at, metadata")
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_SHIPPING_SUPPLEMENT)
    .order("created_at", { ascending: true });

  let primaryInvoiceHasShippingLine = false;
  if (safeStr((existingInvoice as any)?.id)) {
    const { data: piLines } = await supabaseAdmin
      .from("invoice_items")
      .select("line_type, line_total")
      .eq("invoice_id", safeStr((existingInvoice as any).id))
      .limit(400);
    primaryInvoiceHasShippingLine = (piLines ?? []).some(
      (r: any) => safeUpper(r.line_type) === "SHIPPING" && safeNum(r.line_total) > 0
    );
  }

  const invMeta: any = (existingInvoice as any)?.metadata ?? {};
  const invoiceSentAt = safeStr(invMeta?.last_invoice_emailed_at);
  const invoiceSent = !!invoiceSentAt;

  // Support BOTH shapes:
  // - new: metadata.invoice_pdf { bucket, path, number }
  // - flat: metadata.invoice_pdf_bucket + metadata.invoice_pdf_path
  const invoicePdfObj: any =
    invMeta?.invoice_pdf && typeof invMeta.invoice_pdf === "object" ? invMeta.invoice_pdf : {};

  const pdfBucket = safeStr(invoicePdfObj?.bucket) || safeStr(invMeta?.invoice_pdf_bucket) || "";
  const pdfPath = safeStr(invoicePdfObj?.path) || safeStr(invMeta?.invoice_pdf_path) || "";
  const pdfNumber = safeStr(invoicePdfObj?.number) || safeStr(invMeta?.invoice_pdf_number) || "";

  const hasInvoice = !!(existingInvoice as any)?.id;
  const invoiceId = safeStr((existingInvoice as any)?.id);
  const invoiceNumber = safeStr((existingInvoice as any)?.invoice_number) || safeStr(pdfNumber);
  const hasInvoicePdf = !!pdfBucket && !!pdfPath;

  const invoiceTotal = safeNum((existingInvoice as any)?.total ?? (order as any)?.total);
  let amountPaid = safeNum((existingInvoice as any)?.amount_paid);
  if (hasInvoice && invoiceId) {
    try {
      const { data: payRaw } = await supabaseAdmin
        .from("invoice_payments")
        .select("amount")
        .eq("invoice_id", invoiceId);
      const paymentsTotal = (payRaw ?? []).reduce((sum: number, p: any) => sum + safeNum(p?.amount), 0);
      amountPaid = Math.max(amountPaid, paymentsTotal);
    } catch {
      // ignore
    }
  }
  const outstanding = Math.max(0, invoiceTotal - amountPaid);
  const invoiceStatusUpper = safeUpper((existingInvoice as any)?.status);
  const invoiceVoided =
    !!(existingInvoice as any)?.voided_at ||
    invoiceStatusUpper === "VOID" ||
    invoiceStatusUpper === "VOIDED";
  const termsDays = effectivePaymentTermsDays({
    bulk_mode: (order as any)?.bulk_mode,
    payment_terms_days_snapshot: (order as any)?.payment_terms_days_snapshot,
    payment_terms_label_snapshot: (order as any)?.payment_terms_label_snapshot,
    account_payment_terms_days: (pricingRow as any)?.payment_terms_days,
  });
  const baseDateRaw =
    safeStr((existingInvoice as any)?.issued_at) ||
    safeStr((existingInvoice as any)?.created_at) ||
    safeStr((order as any)?.placed_at) ||
    safeStr((order as any)?.created_at);
  const baseDate = baseDateRaw ? new Date(baseDateRaw) : null;
  const dueDate = baseDate && !Number.isNaN(baseDate.getTime()) ? addDays(baseDate, termsDays) : null;
  const now = new Date();
  const isOverdue = !!dueDate && outstanding > 0 && now.getTime() > dueDate.getTime();

  const primaryPaidLocked =
    safeUpper((existingInvoice as any)?.status) === "PAID" || (invoiceTotal > 0 && outstanding <= 0.02);
  const orderShipAmt = safeNum((order as any).shipping_total);
  const supplementList = Array.isArray(shippingSupplementInvoices) ? shippingSupplementInvoices : [];
  const canCreateShippingSupplement =
    !!(order as any).bulk_mode &&
    hasInvoice &&
    primaryPaidLocked &&
    orderShipAmt > 0 &&
    !primaryInvoiceHasShippingLine &&
    supplementList.length === 0;

  // Fulfillments
  const { data: fulfillments } = await supabaseAdmin
    .from("fulfillments")
    .select(FULFILLMENT_SELECT)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const fulfillmentRows = Array.isArray(fulfillments) ? fulfillments : [];
  const openFulfillments = fulfillmentRows.filter((f: any) => safeUpper(f.status) === "OPEN");
  // Prefer INVENTORY when multiple open (user typically works inventory first; avoids landing on empty dropship)
  const openFulfillment =
    openFulfillments.find((f: any) => safeUpper(f.fulfillment_source || "") === "INVENTORY") ??
    openFulfillments[0] ??
    null;
  const latestFulfillment = fulfillmentRows.length ? fulfillmentRows[fulfillmentRows.length - 1] : null;

  const statusUpper = safeUpper((order as any).status);
  const productItems = (items ?? []).filter((it: any) => safeUpper(it?.line_type) !== "SHIPPING");
  const itemCount = productItems.length;
  const itemQty = productItems.reduce((sum: number, it: any) => sum + safeNum(it?.quantity), 0);
  const bulkEnabled = !!(pricingRow as any)?.bulk_enabled;
  const bulkRules = Array.isArray((pricingRow as any)?.bulk_rules) ? ((pricingRow as any).bulk_rules as any[]) : [];
  const computedTotalSqcm = computeTotalSqcm(items ?? [], orderVariantsById);
  const totalSqcmForRules =
    Number((order as any).total_sqcm ?? 0) > 0 ? Number((order as any).total_sqcm) : computedTotalSqcm;

  const bulkRuleMatch =
    bulkEnabled
      ? normalizeBulkRules(bulkRules as Array<{ min_sqcm: number; price_per_sqcm: number }>)
          .filter((r) => totalSqcmForRules >= r.min_sqcm)
          .slice(-1)[0]
      : null;
  const bulkRuleApplied = (order as any).bulk_mode ? bulkRuleMatch : null;

  const discountSummary = computeDiscountFromItems(items ?? []);
  const bulkPricePerSqcmSnapshot = safeNum((order as any).bulk_price_per_sqcm_snapshot);
  const showBulkRateColumn = !!(order as any).bulk_mode && bulkPricePerSqcmSnapshot > 0;

  const effectiveDiscountPercent = (order as any).bulk_mode
    ? 0
    : discountSummary.rawMerch > 0
      ? discountSummary.discountPercent
      : safeNum((order as any).discount_percent_snapshot);

  const canSubmit = statusUpper === "DRAFT";
  const canLockAndFulfill =
    statusUpper === "CONFIRMED" ||
    statusUpper === "PAID" ||
    statusUpper === "PARTIALLY_PAID" ||
    statusUpper === "INVOICED" ||
    statusUpper === "PENDING_WIRE" ||
    statusUpper === "FULFILLING" ||
    statusUpper === "NEEDS_INVOICE" ||
    statusUpper === "LOCKED";
  const canUnlockRole = hasRole(ctx, "ORDER_MANAGER") || hasRole(ctx, "ADMIN");
  const canUnlock = statusUpper === "LOCKED" && canUnlockRole;

  const canCreateInvoice =
    (statusUpper === "NEEDS_INVOICE" ||
      statusUpper === "COMPLETED" ||
      statusUpper === "FULFILLING") &&
    !hasInvoice;

  const canFulfill =
    statusUpper === "LOCKED" ||
    statusUpper === "FULFILLING" ||
    statusUpper === "NEEDS_INVOICE" ||
    statusUpper === "INVOICED" ||
    statusUpper === "PENDING_WIRE" ||
    statusUpper === "PAID" ||
    statusUpper === "PARTIALLY_PAID";

  const latestStatusUpper = safeUpper((latestFulfillment as any)?.status ?? "");
  const canReopenFulfillment = !!(latestFulfillment as any)?.id && latestStatusUpper === "CLOSED";

  const termsLabelSnapshot = safeStr((order as any).payment_terms_label_snapshot);
  const termsDaysSnapshot = Number((order as any).payment_terms_days_snapshot);
  const pricingTermsLabel = safeStr((pricingRow as any)?.payment_terms_label);
  const pricingTermsDays = Number((pricingRow as any)?.payment_terms_days);
  const termsDaysFallback = Number.isFinite(pricingTermsDays) && pricingTermsDays > 0 ? pricingTermsDays : 30;
  const orderBulk = !!(order as any)?.bulk_mode;
  const corruptNet1OnNormalOrder =
    !orderBulk && Number.isFinite(termsDaysSnapshot) && termsDaysSnapshot === 1;
  const terms = corruptNet1OnNormalOrder
    ? pricingTermsLabel || `Net ${termsDays} (after delivery)`
    : termsLabelSnapshot ||
      (Number.isFinite(termsDaysSnapshot) && termsDaysSnapshot > 0 ? `Net ${termsDaysSnapshot} (after delivery)` : "") ||
      pricingTermsLabel ||
      `Net ${termsDaysFallback} (after delivery)`;

  const { data: allOrderInvoices } = await supabaseAdmin
    .from("invoices")
    .select("id")
    .eq("order_id", orderId)
    .limit(200);
  const invoiceIdsForOrder = (allOrderInvoices ?? [])
    .map((r: any) => String(r.id))
    .filter((id: string) => UUID_RE.test(id));

  let wireSubmissionsForActivity: any[] = [];
  if (invoiceIdsForOrder.length) {
    const { data: ws } = await supabaseAdmin
      .from("invoice_payment_submissions")
      .select("id, invoice_id, method, amount, status, reference, sent_at, note, created_at, created_by_user_id")
      .in("invoice_id", invoiceIdsForOrder)
      .eq("method", "WIRE")
      .order("created_at", { ascending: false })
      .limit(50);
    wireSubmissionsForActivity = Array.isArray(ws) ? ws : [];
  }
  const hasWirePendingVerification = wireSubmissionsForActivity.some(
    (s: any) =>
      safeUpper(s.method) === "WIRE" && ["PENDING", "WIRE_PENDING"].includes(safeUpper(s.status))
  );
  const wireReviewInvoiceId = (() => {
    const pend = wireSubmissionsForActivity.find(
      (s: any) =>
        safeUpper(s.method) === "WIRE" && ["PENDING", "WIRE_PENDING"].includes(safeUpper(s.status))
    );
    const id = safeStr(pend?.invoice_id);
    if (UUID_RE.test(id)) return id;
    return invoiceId;
  })();

  // Activity merged
  const activity: ActivityRow[] = [];

  try {
    const { data: statusRows } = await supabaseAdmin
      .from("order_status_events")
      .select(`id, from_status, to_status, changed_by_user_id, comment, created_at` as const)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(50);

    for (const r of statusRows ?? []) {
      activity.push({
        id: String((r as any).id),
        kind: "STATUS",
        title: `Status: ${formatStatusLabel((r as any).from_status)} → ${formatStatusLabel((r as any).to_status)}`,
        when: (r as any).created_at ? String((r as any).created_at) : null,
        actor: (r as any).changed_by_user_id ? String((r as any).changed_by_user_id) : null,
        meta: { comment: (r as any).comment ?? null },
        sub: (r as any).comment ? String((r as any).comment) : null,
      });
    }
  } catch {}

  try {
    const { data: auditEvents } = await supabaseAdmin
      .from("audit_events")
      .select(`id, action, actor_user_id, metadata, created_at` as const)
      .eq("resource_type", "order")
      .eq("resource_id", orderId)
      .order("created_at", { ascending: false })
      .limit(50);

    for (const r of auditEvents ?? []) {
      activity.push({
        id: String((r as any).id),
        kind: "AUDIT",
        title: String((r as any).action ?? "AUDIT"),
        when: (r as any).created_at ? String((r as any).created_at) : null,
        actor: (r as any).actor_user_id ? String((r as any).actor_user_id) : null,
        meta: (r as any).metadata ?? null,
      });
    }
  } catch {}

  try {
    const { data: lockAudit } = await supabaseAdmin
      .from("order_audit_log")
      .select(`id, action, actor_user_id, meta, ip, user_agent, created_at` as const)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(50);

    for (const r of lockAudit ?? []) {
      activity.push({
        id: String((r as any).id),
        kind: "LOCK_AUDIT",
        title: String((r as any).action ?? "ORDER_AUDIT"),
        when: (r as any).created_at ? String((r as any).created_at) : null,
        actor: (r as any).actor_user_id ? String((r as any).actor_user_id) : null,
        meta: {
          ...(typeof (r as any).meta === "object" ? (r as any).meta : { meta: (r as any).meta }),
          ip: (r as any).ip ?? null,
          user_agent: (r as any).user_agent ?? null,
        },
      });
    }
  } catch {}

  activity.sort((a, b) => {
    const ta = a.when ? new Date(a.when).getTime() : 0;
    const tb = b.when ? new Date(b.when).getTime() : 0;
    return tb - ta;
  });

  // Map actors -> profiles
  const actorIds = Array.from(new Set(activity.map((a) => a.actor).filter(Boolean))) as string[];
  const actorMap = new Map<string, ProfileRow>();

  if (actorIds.length) {
    const { data: profs } = await supabaseAdmin
      .from("user_profiles")
      .select(PROFILE_SELECT)
      .in("user_id", actorIds as any);

    for (const p of (profs ?? []) as any[]) {
      actorMap.set(String(p.user_id), {
        user_id: String(p.user_id),
        email: String(p.email ?? ""),
        full_name: p.full_name ?? null,
      });
    }
  }

  const shippingPriority = String((order as any).shipping_priority ?? "GROUND");
  const shippingEtaDays = (order as any).shipping_eta_days;
  const partnerOrigin = await loadPartnerOrigin(supabaseAdmin, orderId);

  // Snapshot shipment cards (EDIT happens in fulfillment page)
  const shipmentCards = fulfillmentRows.map((f: any) => {
    const src = safeUpper(f.fulfillment_source || "INVENTORY");
    const id = String(f.id);

    if (src === "DROPSHIP") {
      const ds = extractDropshipShipping(f);
      const trackingLink = buildTrackingLink(ds.carrier, ds.tracking);

      return {
        id,
        src: "DROPSHIP" as const,
        status: String(f.status ?? ""),
        created_at: f.created_at ? String(f.created_at) : null,
        closed_at: f.closed_at ? String(f.closed_at) : null,

        shipped_at: ds.shippedAt,

        carrier: ds.carrier,
        tracking: ds.tracking,
        trackingLink,

        shipDate: ds.shipDate,
        packingSlipNo: ds.packingSlipNo,
        dropshipStatus: ds.dropshipStatus,

        poPath: ds.poPath,
        labelUrl: ds.labelUrl,
        noTracking: ds.noTracking,
      };
    }

    const inv = extractInventoryShipping(f);
    const trackingLink = buildTrackingLink(inv.carrier, inv.tracking);

    return {
      id,
      src: "INVENTORY" as const,
      status: String(f.status ?? ""),
      created_at: f.created_at ? String(f.created_at) : null,
      closed_at: f.closed_at ? String(f.closed_at) : null,

      shipped_at: inv.shippedAt,

      carrier: inv.carrier,
      tracking: inv.tracking,
      trackingLink,

      labelUrl: inv.labelUrl,
      noTracking: inv.noTracking,
      packingSlipPath: inv.packingSlipPath,
    };
  });

  return (
    <main style={{ padding: 18, maxWidth: 1400, margin: "0 auto", display: "grid", gap: 14 }}>
      {showNoInventoryFulfillmentBanner ? (
        <div
          role="status"
          style={{
            borderRadius: 14,
            padding: "12px 14px",
            border: "1px solid rgba(25,135,84,0.35)",
            background: "rgba(25,135,84,0.08)",
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1.45,
            color: "rgba(15,40,25,0.95)",
          }}
        >
          No inventory fulfillment needed — all product quantity is allocated to virtual warehouse. Warehouse pick / pack /
          ship does not apply to this order.
        </div>
      ) : null}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            .admin-order-grid {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: 14px;
              align-items: start;
              min-width: 0;
            }
            @media (min-width: 1200px) {
              .admin-order-grid {
                grid-template-columns: minmax(0, 1fr) 380px;
              }
            }
          `,
        }}
      />
      {/* Header */}
      <div
        style={{
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(41,182,246,0.28)",
          background:
            "radial-gradient(900px 240px at 15% 10%, rgba(30,136,229,0.38), transparent 60%)," +
            "linear-gradient(180deg, #0b1b3a, #061525)",
          boxShadow: "0 16px 36px rgba(15,23,42,0.12)",
        }}
      >
        <div
          style={{
            padding: 16,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 14,
            alignItems: "end",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.7, fontWeight: 900, textTransform: "uppercase", color: "white" }}>
              Admin
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, color: "white" }}>
              <Link href="/admin/orders" style={{ textDecoration: "none", fontWeight: 950, color: "white" }}>
              ← Orders
            </Link>
          </div>

          <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 24, fontWeight: 950, margin: 0, color: "white" }}>{(order as any).order_number ?? "Order"}</h1>
              {partnerOrigin ? (
                <span style={{ ...pill("neutral"), background: "rgba(255,255,255,0.12)", color: "white" }}>
                  Partner order · {partnerOrigin.partnerName} · {partnerOrigin.externalOrderNumber}
                </span>
              ) : null}
              <span style={{ ...pill(String((order as any).status ?? "—")), background: "rgba(255,255,255,0.12)", color: "white" }}>
                {formatOrderStatusLabel((order as any).status, {
                  wirePendingVerification: hasWirePendingVerification,
                })}
              </span>
            <span style={pill("SHIPPING")}>
              {shippingPriority}
              {Number.isFinite(Number(shippingEtaDays)) && Number(shippingEtaDays) > 0
                ? ` • ${Number(shippingEtaDays)}d`
                : ""}
            </span>
          </div>

          {isDemoAccount ? (
            <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 800, color: "#fde68a", maxWidth: 720, lineHeight: 1.45 }}>
              Demo account order — lock, pick, and ship update this order only. Inventory, lots, and customer emails are not affected.
            </p>
          ) : null}

          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, opacity: 0.85, color: "white" }}>
              <b>Account:</b> {displayAccount(account)}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, color: "white" }}>
              <b>Placed by:</b> {placedByContact ? displayContact(placedByContact) : displayUser(placedBy)}
            </div>

            {/* ✅ Invoice details moved to main content */}
            <div style={{ marginTop: 4 }} />

            {statusUpper === "DRAFT" ? (
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 950, color: "crimson", opacity: 0.9 }}>
                All fulfillments are closed. This order needs an invoice.
              </div>
            ) : null}
            {(statusUpper === "PENDING_WIRE" || hasWirePendingVerification) && UUID_RE.test(wireReviewInvoiceId) ? (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(251, 191, 36, 0.45)",
                  background: "rgba(251, 191, 36, 0.12)",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "rgba(254, 243, 199, 0.98)",
                  maxWidth: 520,
                }}
              >
                Wire proof is waiting for verification. Open the invoice to review details and proof, then verify the
                submission. The order stays unpaid until wire is approved.
                <div style={{ marginTop: 8 }}>
                  <Link
                    href={`/admin/invoices/${encodeURIComponent(wireReviewInvoiceId)}#wire-payments`}
                    style={{ color: "#fde68a", fontWeight: 950, textDecoration: "underline" }}
                  >
                    Review wire on invoice →
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Actions + timestamps */}
        <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
          <div style={{ fontSize: 13, opacity: 0.8, textAlign: "right", color: "white" }}>
            Created: <b>{dateTime((order as any).created_at)}</b>
            <br />
            Placed: <b>{dateTime((order as any).placed_at)}</b>
            <br />
            Locked: <b>{dateTime((order as any).locked_at)}</b>
          </div>

          <div style={{ fontSize: 13, opacity: 0.8, textAlign: "right", color: "white" }}>
            {showBulkRateColumn ? (
              <>
                Bulk rate: <b>${formatBulkPricePerSqcmLabel(bulkPricePerSqcmSnapshot)}/sq cm</b>
              </>
            ) : (
              <>
                Discount: <b>{fmtPct(effectiveDiscountPercent)}%</b>
              </>
            )}{" "}
            · Terms: <b>{terms}</b>
            <br />
            Bulk: <b>{(order as any).bulk_mode ? "On" : "Off"}</b> · Total sq cm: <b>{fmtSqcm((order as any).total_sqcm)}</b>
            {bulkRuleApplied ? (
              <>
                <br />
                Bulk tier:{" "}
                <b>
                  $
                  {formatBulkPricePerSqcmLabel(
                    (order as any).bulk_price_per_sqcm_snapshot ?? bulkRuleApplied.price_per_sqcm
                  )}
                </b>
                /sq cm · Sq cm <b>{computedTotalSqcm.toFixed(2)}</b> (rule {bulkRuleApplied.min_sqcm}+)
              </>
            ) : (order as any).bulk_mode ? (
              <>
                <br />
                Bulk pricing on · Sq cm <b>{computedTotalSqcm.toFixed(2)}</b> (no matching tier in current rules)
              </>
            ) : null}
          </div>
          {bulkRuleMatch && !(order as any).bulk_mode ? (
            <form action={`/api/admin/orders/${encodeURIComponent(orderId)}/apply-bulk`} method="post">
              <button
                type="submit"
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.35)",
                  background: "rgba(16, 185, 129, 0.18)",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Apply bulk pricing
              </button>
            </form>
          ) : null}

          {/* ✅ Actions: no duplicates, clear intent */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {canSubmit ? (
              <form action={`/api/admin/orders/${encodeURIComponent(orderId)}/confirm`} method="post">
                <button type="submit" style={buttonStyle(true, false, true)}>
                  Submit Order
                </button>
              </form>
            ) : null}
            {canLockAndFulfill && needsInventoryFulfillment ? (
              <LockAndFulfillButton orderId={orderId} />
            ) : null}

            {canUnlock ? (
              <form action={`/api/admin/orders/${encodeURIComponent(orderId)}/unlock`} method="post">
                <button type="submit" style={buttonStyle(false, true, true)}>
                  Unlock Order
                </button>
              </form>
            ) : null}

            {canCreateInvoice ? (
              <form action={`/api/admin/orders/${encodeURIComponent(orderId)}/invoice`} method="post">
                <button type="submit" style={buttonStyle(true, false, true)}>
                  Create Invoice
                </button>
              </form>
            ) : null}

            {hasInvoice ? (
              <Link
                href={`/admin/invoices/${encodeURIComponent(String(invoiceId))}`}
                style={buttonStyle(false, false, true)}
              >
                Invoice Details
              </Link>
            ) : null}

            {hasInvoice && hasInvoicePdf ? (
              <a
                href={`/api/admin/orders/${encodeURIComponent(orderId)}/invoice/open`}
                target="_blank"
                rel="noopener noreferrer"
                style={buttonStyle(false, false, true)}
              >
                Open Invoice PDF
              </a>
            ) : null}

            {/* ✅ Regenerate PDF (shipping changes, etc.) */}
            {hasInvoice ? (
              <form action={`/api/admin/invoices/${encodeURIComponent(String(invoiceId))}/pdf`} method="post">
                <button type="submit" style={buttonStyle(false, false, true)}>
                  Regenerate Invoice PDF
                </button>
              </form>
            ) : null}

            {canCreateShippingSupplement ? (
              <form action={`/api/admin/orders/${encodeURIComponent(orderId)}/shipping-invoice`} method="post">
                <button
                  type="submit"
                  style={buttonStyle(true, false, true)}
                  title="Creates a separate invoice for shipping only. Does not change the paid primary invoice."
                >
                  Create shipping invoice
                </button>
              </form>
            ) : null}

            {Array.isArray(shippingSupplementInvoices) && shippingSupplementInvoices.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.85 }}>Shipping invoices:</span>
                {(shippingSupplementInvoices as any[]).map((inv) => (
                  <Link
                    key={String(inv.id)}
                    href={`/admin/invoices/${encodeURIComponent(String(inv.id))}`}
                    style={{
                      ...buttonStyle(false, false, true),
                      fontSize: 12,
                      padding: "6px 10px",
                    }}
                  >
                    {safeStr(inv.invoice_number) || String(inv.id).slice(0, 8)}… ({formatStatusLabel(inv.status)})
                  </Link>
                ))}
              </div>
            ) : null}

            {!openFulfillment?.id && !(latestFulfillment as any)?.id && needsInventoryFulfillment ? (
              <form action={`/api/admin/orders/${encodeURIComponent(orderId)}/fulfillment/start`} method="post">
                <button
                  type="submit"
                  disabled={!canFulfill}
                  style={{
                    ...buttonStyle(true, false, true),
                    opacity: canFulfill ? 1 : 0.6,
                    cursor: canFulfill ? "pointer" : "not-allowed",
                    animation: canFulfill ? "order-flow-cta 1.6s ease-in-out infinite" : undefined,
                  }}
                >
                  Start Fulfillment
                </button>
              </form>
            ) : null}

            {canReopenFulfillment ? (
              <form
                action={`/api/admin/fulfillments/${encodeURIComponent(String((latestFulfillment as any).id))}/reopen`}
                method="post"
              >
                <button type="submit" style={buttonStyle(false, false, true)}>
                  Reopen Fulfillment
                </button>
              </form>
            ) : null}
          </div>
        </div>
        </div>

        <OrderStatusFlowForOrder
          orderId={orderId}
          fulfillmentRows={fulfillmentRows}
          closeBehavior={{ mode: "order" }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <HeroStat label="Items" value={`${itemCount} (${itemQty})`} />
          <HeroStat label="Total sq cm" value={fmtSqcm((order as any).total_sqcm)} />
          <HeroStat label="Bulk mode" value={(order as any).bulk_mode ? "On" : "Off"} />
          <HeroStat label="Subtotal" value={money((order as any).subtotal)} />
          <HeroStat label="Shipping" value={money((order as any).shipping_total)} />
          <HeroStat label="Total" value={money((order as any).total)} />
          <HeroStat label="Invoice" value={hasInvoice ? formatStatusLabel((existingInvoice as any)?.status) || "Invoice" : "Not ready"} />
        </div>
      </div>

      {/* Main grid */}
      <div className="admin-order-grid">
        {/* Left: Line items */}
        <div style={PAGE_CARD}>
          <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 950 }}>Line Items</div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
                  <th style={{ padding: 12 }}>Description</th>
                  <th style={{ padding: 12, width: 90 }}>Qty</th>
                  <th style={{ padding: 12, width: 110 }}>Unit</th>
                  <th style={{ padding: 12, width: 110 }}>{showBulkRateColumn ? "Bulk rate" : "Discount"}</th>
                  <th style={{ padding: 12, width: 140 }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {(items ?? []).map((it: any) => {
                  const lt = safeStr(it?.line_type).toUpperCase();
                  const discountCell =
                    showBulkRateColumn && lt === "PRODUCT"
                      ? `$${formatBulkPricePerSqcmLabel(bulkPricePerSqcmSnapshot)}/sq cm`
                      : lt === "SHIPPING"
                        ? "—"
                        : `${Number(it.discount_percent ?? 0) || 0}%`;
                  return (
                    <tr key={String(it.id)} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                      <td style={{ padding: 12, fontWeight: 900 }}>{it.description}</td>
                      <td style={{ padding: 12, fontWeight: 900 }}>{Number(it.quantity ?? 0) || 0}</td>
                      <td style={{ padding: 12, opacity: 0.85 }}>{it.uom ?? "Units"}</td>
                      <td style={{ padding: 12, fontWeight: 900 }}>{discountCell}</td>
                      <td style={{ padding: 12, fontWeight: 950 }}>{money(it.line_total)}</td>
                    </tr>
                  );
                })}

                {(items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 18, opacity: 0.75 }}>
                      No line items.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div style={{ padding: 12, borderTop: "1px solid rgba(0,0,0,0.08)", opacity: 0.75, fontSize: 12 }}>
            Admin-only view. Do not copy PHI into external tools.
          </div>
        </div>

        {/* Right rail */}
        <div style={{ display: "grid", gap: 14 }}>
          {/* Summary */}
          <div style={PAGE_CARD}>
            <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 950 }}>Summary</div>
            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ opacity: 0.75, fontWeight: 900 }}>Subtotal</div>
                <div style={{ fontWeight: 950 }}>{money((order as any).subtotal)}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ opacity: 0.75, fontWeight: 900 }}>Shipping</div>
                <div style={{ fontWeight: 950 }}>{money((order as any).shipping_total)}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ opacity: 0.75, fontWeight: 900 }}>Shipping priority</div>
                <div style={{ fontWeight: 950 }}>
                  {shippingPriority}
                  {Number.isFinite(Number(shippingEtaDays)) && Number(shippingEtaDays) > 0
                    ? ` (${Number(shippingEtaDays)} days)`
                    : ""}
                </div>
              </div>

              <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ opacity: 0.75, fontWeight: 950 }}>Total</div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>{money((order as any).total)}</div>
              </div>
            </div>
          </div>

          {hasInvoice ? (
            <div style={PAGE_CARD}>
              <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 950 }}>
                Payment
              </div>
              <div style={{ padding: 12, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ opacity: 0.75, fontWeight: 900 }}>Invoice</div>
                  <div style={{ fontWeight: 950 }}>{formatStatusLabel((existingInvoice as any)?.status)}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ opacity: 0.75, fontWeight: 900 }}>Paid</div>
                  <div style={{ fontWeight: 950 }}>{money(amountPaid)}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ opacity: 0.75, fontWeight: 900 }}>Remaining</div>
                  <div style={{ fontWeight: 950 }}>{money(outstanding)}</div>
                </div>
                {invoiceNumber ? (
                  <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 800 }}>
                    Invoice #{invoiceNumber}
                  </div>
                ) : null}
                <Link
                  href={`/admin/invoices/${encodeURIComponent(invoiceId)}`}
                  style={{ fontSize: 12, fontWeight: 950, textDecoration: "none", opacity: 0.85 }}
                >
                  Open invoice details →
                </Link>
                {!invoiceVoided && outstanding > 0 ? (
                  <Suspense fallback={null}>
                    <AdminInvoiceStripePayClient
                      invoiceId={invoiceId}
                      remaining={outstanding}
                      accountName={displayAccount(account)}
                      returnPath={`/admin/orders/${encodeURIComponent(orderId)}`}
                    />
                  </Suspense>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Shipments snapshot only (edit + docs inside fulfillment) */}
          <div style={PAGE_CARD}>
            <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 950 }}>Shipments</div>
            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              {shipmentCards.length === 0 ? (
                <div style={{ fontSize: 13, opacity: 0.75 }}>No fulfillments yet.</div>
              ) : (
                shipmentCards
                  .slice()
                  .reverse()
                  .map((s: any) => (
                    <div
                      key={s.id}
                      style={{
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 12,
                        padding: 10,
                        display: "grid",
                        gap: 8,
                        background: "rgba(0,0,0,0.01)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={pill(s.src)}>{s.src}</span>
                          <span style={pill(String(s.status || "—"))}>{formatStatusLabel(s.status)}</span>
                        </div>

                        <Link
                          href={`/admin/fulfillments/${encodeURIComponent(s.id)}`}
                          style={{ fontWeight: 950, fontSize: 12, textDecoration: "none", opacity: 0.85 }}
                        >
                          View →
                        </Link>
                      </div>

                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Created: <b>{dateTime(s.created_at)}</b>
                        {s.closed_at ? (
                          <>
                            {" "}
                            · Closed: <b>{dateTime(s.closed_at)}</b>
                          </>
                        ) : null}
                      </div>

                      <div style={{ fontSize: 12, opacity: 0.9 }}>
                        <b>Carrier:</b> {safeStr(s.carrier) || "—"}
                        <br />
                        <b>Tracking:</b>{" "}
                        {safeStr(s.tracking) ? (
                          s.trackingLink ? (
                            <a
                              href={s.trackingLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontWeight: 950, textDecoration: "none" }}
                            >
                              {safeStr(s.tracking)}
                            </a>
                          ) : (
                            <span style={{ fontWeight: 950 }}>{safeStr(s.tracking)}</span>
                          )
                        ) : s.noTracking ? (
                          <span style={{ fontWeight: 950 }}>No tracking</span>
                        ) : (
                          "—"
                        )}
                      </div>

                      <div style={{ fontSize: 12, opacity: 0.9 }}>
                        <b>Shipped:</b> {dateTime(s.shipped_at)}
                        <br />
                        <b>Shipping charge:</b> {money((order as any).shipping_total)}
                      </div>

                      {s.src === "INVENTORY" ? (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <a
                            href={`/api/admin/fulfillments/${encodeURIComponent(s.id)}/packing-slip/open`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              ...buttonStyle(false),
                              padding: "8px 10px",
                              borderRadius: 10,
                              textDecoration: "none",
                            }}
                          >
                            Open packing slip →
                          </a>

                          {safeStr(s.labelUrl) ? (
                            <a
                              href={String(s.labelUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                ...buttonStyle(false),
                                padding: "8px 10px",
                                borderRadius: 10,
                                textDecoration: "none",
                              }}
                            >
                              Open label URL →
                            </a>
                          ) : null}

                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <a
                              href={`/api/admin/fulfillments/${encodeURIComponent(s.id)}/dropship/po/open`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                ...buttonStyle(false),
                                padding: "8px 10px",
                                borderRadius: 10,
                                textDecoration: "none",
                              }}
                            >
                              Open PO →
                            </a>

                            <a
                              href={`/api/admin/fulfillments/${encodeURIComponent(s.id)}/dropship/packing-slip/open`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                ...buttonStyle(false),
                                padding: "8px 10px",
                                borderRadius: 10,
                                textDecoration: "none",
                              }}
                            >
                              Open packing slip →
                            </a>

                            {safeStr(s.labelUrl) ? (
                              <a
                                href={String(s.labelUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  ...buttonStyle(false),
                                  padding: "8px 10px",
                                  borderRadius: 10,
                                  textDecoration: "none",
                                }}
                              >
                                Open label URL →
                              </a>
                            ) : null}
                          </div>

                          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
                            {safeStr(s.dropshipStatus) ? <>Status: {formatStatusLabel(s.dropshipStatus)}</> : null}
                            {safeStr(s.packingSlipNo) ? <> · Packing slip #: {safeStr(s.packingSlipNo)}</> : null}
                            {safeStr(s.shipDate) ? <> · Ship date: {safeStr(s.shipDate)}</> : null}
                          </div>

                        </div>
                      )}
                    </div>
                  ))
              )}

              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Snapshot only: edit shipping + generate documents inside the fulfillment page.
              </div>
            </div>
          </div>

          {/* Activity */}
          <div style={PAGE_CARD}>
            <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 950 }}>Activity</div>

            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              {activity.length === 0 ? (
                <div style={{ opacity: 0.75, fontSize: 13 }}>No activity yet.</div>
              ) : (
                activity.slice(0, 60).map((a) => {
                  const prof = a.actor ? actorMap.get(String(a.actor)) ?? null : null;
                  return (
                    <div
                      key={`${a.kind}:${a.id}`}
                      style={{
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 12,
                        padding: 10,
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 950 }}>
                          {a.title}{" "}
                          <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 6 }}>
                            {a.kind === "STATUS"
                              ? "status"
                              : a.kind === "AUDIT"
                                ? "audit"
                                : a.kind === "WIRE"
                                  ? "wire"
                                  : "lock-audit"}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>{dateTime(a.when)}</div>
                      </div>

                      <div style={{ fontSize: 12, opacity: 0.9 }}>
                        <b>Actor:</b> {prof ? displayUser(prof) : a.actor ? "Unknown user" : "—"}
                      </div>

                      {a.sub ? <div style={{ fontSize: 12, opacity: 0.8 }}>{a.sub}</div> : null}

                      <details style={{ fontSize: 12, opacity: 0.75 }}>
                        <summary style={{ cursor: "pointer", fontWeight: 900 }}>Meta</summary>
                        <div style={{ marginTop: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {compactJson(a.meta)}
                        </div>
                      </details>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ padding: 12, borderTop: "1px solid rgba(0,0,0,0.08)", opacity: 0.7, fontSize: 12 }}>
              Activity merged from order_status_events, invoice wire submissions, audit_events, and order_audit_log (if
              present).
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
