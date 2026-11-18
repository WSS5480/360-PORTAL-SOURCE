// src/app/portal/orders/[orderId]/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { formatOrderStatusLabel, formatStatusLabel } from "@/lib/formatStatusLabel";
import { formatBulkPricePerSqcmLabel, normalizeBulkRules } from "@/lib/bulkRules";
import { formatFedexServiceLabel } from "@/lib/fedex/shippingPriorityMap";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { buildTrackingLink } from "@/lib/shipping/buildTrackingLink";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canViewOrders, canCreateOrders } from "@/lib/portal/portalRoles";
import { isPortalOrderRowViewable } from "@/lib/portal/portalRowScope";
import AddressFixerClient from "./AddressFixerClient";
import InvoiceDownloadClient from "./InvoiceDownloadClient";
import PackingSlipDownloadClient from "./PackingSlipDownloadClient";
import DraftOrderEditorClient from "./DraftOrderEditorClient";
import AutoSubmitClient from "./AutoSubmitClient";
import OrderPortalOverlayCleanup from "./OrderPortalOverlayCleanup";
import StripePaymentReturnClient from "./StripePaymentReturnClient";
import PortalOrderTimeline from "./PortalOrderTimeline";

export const dynamic = "force-dynamic";

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

function baseBorder(): React.CSSProperties {
  return { borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)" };
}

function pill(tone: "neutral" | "success" | "warning" | "danger"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "color-mix(in srgb, var(--surface) 86%, var(--background))",
    color: "var(--foreground)",
    whiteSpace: "nowrap",
  };

  if (tone === "danger") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--danger) 26%, var(--border))",
      background: "color-mix(in srgb, var(--danger) 9%, var(--surface))",
      color: "color-mix(in srgb, var(--danger) 78%, black)",
    };
  }
  if (tone === "success") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--success) 26%, var(--border))",
      background: "color-mix(in srgb, var(--success) 9%, var(--surface))",
      color: "color-mix(in srgb, var(--success) 78%, black)",
    };
  }
  if (tone === "warning") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--warning) 26%, var(--border))",
      background: "color-mix(in srgb, var(--warning) 12%, var(--surface))",
    };
  }
  return base;
}

function statusTone(statusUpper: string): "neutral" | "success" | "warning" | "danger" {
  if (statusUpper === "CANCELLED" || statusUpper === "DENIED") return "danger";
  if (statusUpper === "COMPLETED" || statusUpper === "INVOICED" || statusUpper === "PAID") return "success";
  if (statusUpper === "PARTIALLY_PAID") return "warning";
  if (statusUpper === "LOCKED" || statusUpper === "CONFIRMED") return "warning";
  return "neutral";
}

function invoiceTone(statusUpper: string): "neutral" | "success" | "warning" | "danger" {
  if (statusUpper === "VOID" || statusUpper === "VOIDED" || statusUpper === "CANCELLED") return "danger";
  if (statusUpper === "PAID") return "success";
  if (statusUpper === "SENT" || statusUpper === "ISSUED") return "warning";
  if (statusUpper === "DRAFT") return "neutral";
  return "neutral";
}

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtPct(n: number) {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function sqcmFromVariant(v: any): number {
  const direct = numOrZero(v?.total_sqcm);
  if (direct > 0) return direct;
  const w = numOrZero(v?.width_cm);
  const l = numOrZero(v?.length_cm);
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

function isVirtualWarehouseBulkDepositLine(it: any): boolean {
  return safeStr(it?.description).startsWith("Virtual warehouse bulk purchase");
}

function computeTotalSqcm(items: any[], variantsById: Map<string, any>) {
  let total = 0;
  for (const it of items ?? []) {
    const lineType = safeStr(it?.line_type).toUpperCase();
    if (lineType === "SHIPPING") continue;
    const qty = numOrZero(it?.quantity);
    if (qty <= 0) continue;
    const v = variantsById.get(String(it?.product_variant_id));
    total += sqcmFromVariant(v) * qty;
  }
  return total;
}

/** Sq cm for ship-now product lines only (excludes VW bulk deposit line). */
function computeShipNowLineSqcm(items: any[], variantsById: Map<string, any>) {
  let total = 0;
  for (const it of items ?? []) {
    if (isVirtualWarehouseBulkDepositLine(it)) continue;
    const lineType = safeStr(it?.line_type).toUpperCase();
    if (lineType === "SHIPPING") continue;
    const qty = numOrZero(it?.quantity);
    if (qty <= 0) continue;
    const v = variantsById.get(String(it?.product_variant_id));
    total += sqcmFromVariant(v) * qty;
  }
  return total;
}

function dateTime(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function softLink(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    textDecoration: "none",
    fontWeight: 950,
    color: "var(--brand-700)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  };
}

function primaryButtonStyle(disabled?: boolean): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
    background: disabled ? "color-mix(in srgb, var(--brand-700) 40%, var(--surface))" : "var(--brand-700)",
    color: "white",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
    width: "fit-content",
    opacity: disabled ? 0.75 : 1,
  };
}

function Banner({ kind, title, body }: { kind: "error" | "warning" | "ok"; title: string; body?: React.ReactNode }) {
  let bg = "color-mix(in srgb, var(--surface) 90%, var(--background))";
  let border = "var(--border)";
  let color = "var(--foreground)";

  if (kind === "error") {
    bg = "color-mix(in srgb, var(--danger) 10%, var(--surface))";
    border = "color-mix(in srgb, var(--danger) 26%, var(--border))";
    color = "color-mix(in srgb, var(--danger) 78%, black)";
  }
  if (kind === "warning") {
    bg = "color-mix(in srgb, var(--warning) 12%, var(--surface))";
    border = "color-mix(in srgb, var(--warning) 26%, var(--border))";
  }
  if (kind === "ok") {
    bg = "color-mix(in srgb, var(--success) 10%, var(--surface))";
    border = "color-mix(in srgb, var(--success) 26%, var(--border))";
    color = "color-mix(in srgb, var(--success) 78%, black)";
  }

  return (
    <div
      style={{
        ...baseBorder(),
        borderColor: border,
        background: bg,
        borderRadius: 16,
        padding: 14,
        color,
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div style={{ fontWeight: 950 }}>{title}</div>
      {body ? <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9, lineHeight: 1.45 }}>{body}</div> : null}
    </div>
  );
}

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...baseBorder(),
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--surface)",
        boxShadow: "var(--shadow-1)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          background: "color-mix(in srgb, var(--surface) 92%, var(--background))",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 950 }}>{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.35 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{right}</div> : null}
      </div>

      <div style={{ padding: 14, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function prettyAddress(v: any): string {
  if (!v || typeof v !== "object") return "—";
  const get = (k: string) => (v as any)?.[k] ?? "";
  const parts = [
    get("company"),
    get("attn") ? `Attn: ${get("attn")}` : "",
    get("line1"),
    get("line2"),
    [get("city"), get("state"), get("postal")].filter(Boolean).join(", ").replace(", ,", ","),
    get("country"),
    get("phone") ? `Phone: ${get("phone")}` : "",
    get("email") ? `Email: ${get("email")}` : "",
    get("notes") ? `Notes: ${get("notes")}` : "",
  ].filter((x) => String(x || "").trim().length > 0);

  if (parts.length === 0) return "—";
  return parts.join("\n");
}

function safeStr(v: any): string {
  return String(v ?? "").trim();
}

function safeUrl(v: any): string {
  const s = safeStr(v);
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return "";
}


function formatShippingPriorityLabel(priorityUpper: string | null, etaDays: number | null): string {
  if (!priorityUpper) return "—";
  if (priorityUpper === "GROUND") {
    if (etaDays && etaDays > 0) return `Ground (${etaDays} day${etaDays === 1 ? "" : "s"})`;
    return "Ground";
  }
  if (etaDays && etaDays > 0) return `${priorityUpper} (${etaDays} days)`;
  return priorityUpper;
}

function numOrZero(v: any): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pctClamp(v: any): number {
  const n = numOrZero(v);
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function computeTotalsFromItems(items: any[], overrideDiscountPercent?: number) {
  let rawMerch = 0;
  let merchAfterDiscount = 0;
  const override =
    typeof overrideDiscountPercent === "number" && Number.isFinite(overrideDiscountPercent)
      ? pctClamp(overrideDiscountPercent)
      : null;

  const hasVwBulkDeposit = (items ?? []).some((x) => isVirtualWarehouseBulkDepositLine(x));

  for (const it of items ?? []) {
    const lineType = safeStr(it?.line_type).toUpperCase();
    if (lineType === "SHIPPING") continue;

    const qty = numOrZero(it?.quantity);
    const unit = numOrZero(it?.unit_price);
    if (qty <= 0) continue;

    const raw = unit * qty;

    // VW bulk deposit line: unit_price is the bulk purchase total ($); line_total matches (tier $/sq cm × contract sq cm).
    if (isVirtualWarehouseBulkDepositLine(it)) {
      rawMerch += raw;
      const lt = numOrZero(it?.line_total);
      merchAfterDiscount += lt > 0 ? lt : raw * (1 - pctClamp(it?.discount_percent) / 100);
      continue;
    }

    // Ship-now / allocation lines: $0 — customer paid via bulk sq cm on the deposit line.
    if (hasVwBulkDeposit && lineType === "PRODUCT" && numOrZero(it?.line_total) === 0) {
      continue;
    }

    rawMerch += raw;

    if (override !== null) {
      merchAfterDiscount += raw * (1 - override / 100);
      continue;
    }

    const storedLineTotal = numOrZero(it?.line_total);
    if (storedLineTotal > 0) {
      merchAfterDiscount += storedLineTotal;
      continue;
    }

    const lineDiscount = pctClamp(it?.discount_percent);
    merchAfterDiscount += raw * (1 - lineDiscount / 100);
  }

  const discountAmount = Math.max(0, rawMerch - merchAfterDiscount);
  const discountPercent =
    override !== null ? override : rawMerch > 0 ? pctClamp((discountAmount / rawMerch) * 100) : 0;

  return { rawMerch, discountPercent, discountAmount, merchAfterDiscount };
}

function computeShippingFromItems(items: any[]): number {
  let sum = 0;
  for (const it of items ?? []) {
    if (safeStr(it?.line_type).toUpperCase() !== "SHIPPING") continue;
    sum += numOrZero(it?.line_total);
  }
  return sum;
}

function HeroStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "14px 18px",
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        borderRight: "1px solid rgba(255,255,255,0.10)",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.72)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 950, color: "white", textAlign: "right" }}>{value}</div>
    </div>
  );
}

export default async function PortalOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireCurrentAccount();
  const accountId = ctx.currentAccountId;

  if (!accountId) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 12 }}>
        <Banner kind="error" title="No account selected" body="Please select an account first." />
        <div>
          <Link href="/portal/orders" style={softLink()}>
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!canViewOrders(ctx.currentRole)) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 12 }}>
        <Banner kind="error" title="Forbidden" body="Your role does not have permission to view orders for this account." />
        <div>
          <Link href="/portal/orders" style={softLink()}>
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const resolved = await params;
  const sp = searchParams ? await searchParams : {};
  const autoSubmit = String((sp as any)?.autosubmit ?? "") === "1";
  const stripePi = String((sp as any)?.payment_intent ?? "").trim();
  const stripeRedirectStatus = String((sp as any)?.redirect_status ?? "").trim();
  /** Stripe appends these after card/redirect; do not run autosubmit confirm in parallel. */
  const stripeReturnFromPay = !!stripePi && stripeRedirectStatus === "succeeded";
  const orderId = normalizeParam(resolved?.orderId ?? "");

  if (!UUID_RE.test(orderId)) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 12 }}>
        <Banner kind="error" title="Invalid orderId" body="This order link is malformed." />
        <div>
          <Link href="/portal/orders" style={softLink()}>
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const sb: any = supabaseAdmin;

  // ✅ Account details (name/metadata)
  const { data: accountRow } = await sb
    .from("accounts")
    .select("id, name, discount_percent")
    .eq("id", accountId)
    .maybeSingle();
  const { data: pricingRow } = await sb
    .from("account_pricing")
    .select("payment_terms_label, payment_terms_days, bulk_enabled, bulk_rules, virtual_warehouse_enabled")
    .eq("account_id", accountId)
    .maybeSingle();

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select(
      "id, account_id, order_number, status, bulk_mode, total_sqcm, bulk_contract_sqcm, bulk_price_per_sqcm_snapshot, subtotal, total, payment_terms_label_snapshot, payment_terms_days_snapshot, created_at, placed_at, locked_at, invoice_address, delivery_address, shipping_priority, shipping_eta_days, created_by_user_id, submitted_by_contact_id"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 12 }}>
        <Banner kind="error" title="Failed to load order" body={ordErr.message} />
        <div>
          <Link href="/portal/orders" style={softLink()}>
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order || String(order.account_id) !== String(accountId)) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 12 }}>
        <Banner kind="error" title="Order not found" body="This order does not exist or you don’t have access." />
        <div>
          <Link href="/portal/orders" style={softLink()}>
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const actorId = String((ctx.user as any)?.id ?? "");
  const canSeeOrder = await isPortalOrderRowViewable(sb, accountId, actorId, ctx.currentRole, order as any);
  if (!canSeeOrder) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 12 }}>
        <Banner kind="error" title="Order not found" body="This order does not exist or you don’t have access." />
        <div>
          <Link href="/portal/orders" style={softLink()}>
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const { data: items, error: itemErr } = await sb
    .from("order_items")
    .select("id, product_variant_id, description, quantity, uom, unit_price, discount_percent, line_total, line_type, sort_order")
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true });

  if (itemErr) {
    return (
      <div style={{ padding: 16, maxWidth: 1100, display: "grid", gap: 12 }}>
        <Banner kind="error" title={`Order ${String(order.order_number || "")}`} body={itemErr.message} />
        <div>
          <Link href="/portal/orders" style={softLink()}>
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const itemVariantIds = Array.from(
    new Set((items ?? []).map((it: any) => String(it?.product_variant_id || "")).filter(Boolean))
  );
  const { data: orderVariants } = itemVariantIds.length
    ? await sb
        .from("product_variants")
        .select("id, size_label, width_cm, length_cm, total_sqcm")
        .in("id", itemVariantIds)
    : { data: [] as any[] };
  const orderVariantsById = new Map<string, any>((orderVariants ?? []).map((v: any) => [String(v.id), v]));

  // For the editor "add products" picker (only needed for DRAFT + canAct)
  let products: any[] = [];
  let variants: any[] = [];
  const statusUpper = String(order.status || "").toUpperCase();
  const canAct = canCreateOrders(ctx.currentRole);

  if (statusUpper === "DRAFT" && canAct) {
    const { data: pData } = await sb
      .from("products")
      .select("id, name, code, qcode, is_active, base_unit_price")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(400);
    products = pData ?? [];

    const productIds = (products ?? []).map((p: any) => String(p.id)).filter(Boolean);
    if (productIds.length > 0) {
      const { data: vData } = await sb
        .from("product_variants")
        .select("id, product_id, sku, size_label, base_unit_price, is_active")
        .eq("is_active", true)
        .in("product_id", productIds)
        .order("sku", { ascending: true })
        .limit(4000);
      variants = vData ?? [];
    }
  }

  const { data: invoice } = await sb
    .from("invoices")
    .select("id, invoice_number, status, issued_at, total, amount_paid, metadata, created_at")
    .eq("order_id", orderId)
    .eq("invoice_kind", "PRIMARY")
    .maybeSingle();

  let invoicePaymentsTotal = 0;
  if (invoice?.id) {
    try {
      const { data: invPayRows } = await sb.from("invoice_payments").select("amount").eq("invoice_id", String(invoice.id));
      invoicePaymentsTotal = (invPayRows ?? []).reduce((sum: number, r: any) => sum + (Number(r?.amount) || 0), 0);
    } catch {
      invoicePaymentsTotal = 0;
    }
  }
  const invoiceTotalNum = invoice?.id ? Number((invoice as any)?.total) || 0 : 0;
  const invoiceStoredPaid = invoice?.id ? Number((invoice as any)?.amount_paid) || 0 : 0;
  const invoiceAmountPaid = invoice?.id ? Math.max(invoiceStoredPaid, invoicePaymentsTotal) : 0;
  const invoiceRemaining = invoice?.id ? Math.max(0, invoiceTotalNum - invoiceAmountPaid) : 0;
  const invoiceFullyPaid = !!invoice?.id && invoiceRemaining <= 0.005;

  const { data: fulfillmentRows } = await sb
    .from("fulfillments")
    .select("id, status, fulfillment_source, created_at, metadata")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(50);

  const invMeta: any = invoice?.metadata ?? {};
  let shipMeta: any = invMeta?.shipping ?? {};
  // Fallback to fulfillment metadata when invoice has no shipping (e.g. saved on fulfillment before sync)
  let fulfillmentShipForMerge: any = null;
  if (!shipMeta?.tracking_number && !shipMeta?.label_url) {
    const fWithShip = (fulfillmentRows ?? []).find((f: any) => {
      const m = f?.metadata && typeof f.metadata === "object" ? f.metadata : {};
      const s = m?.shipping && typeof m.shipping === "object" ? m.shipping : {};
      return s?.tracking_number || s?.label_url || (f as any)?.tracking_number;
    });
    if (fWithShip) {
      const m = fWithShip?.metadata && typeof fWithShip.metadata === "object" ? fWithShip.metadata : {};
      const s = m?.shipping && typeof m.shipping === "object" ? m.shipping : {};
      const src = String((fWithShip as any)?.fulfillment_source || "").toUpperCase();
      shipMeta =
        src === "DROPSHIP"
          ? {
              carrier: safeStr((fWithShip as any)?.dropship_carrier),
              tracking_number: safeStr((fWithShip as any)?.dropship_tracking_number),
              shipped_at: safeStr((fWithShip as any)?.dropship_ship_date),
            }
          : {
              carrier: safeStr(s?.carrier),
              tracking_number: safeStr(s?.tracking_number) || safeStr((fWithShip as any)?.tracking_number),
              label_url: safeStr(s?.label_url),
              shipped_at: safeStr(s?.shipped_at) || safeStr((fWithShip as any)?.shipped_at),
              no_tracking: !!s?.no_tracking,
              service: safeStr(s?.service),
              service_change_reason: safeStr(s?.service_change_reason),
              service_changed_from: safeStr(s?.service_changed_from),
              service_changed_to: safeStr(s?.service_changed_to),
              saturday_delivery: !!s?.saturday_delivery,
            };
    }
  } else {
    // Invoice has shipping; still check fulfillments for service_change_reason (in case sync missed it)
    const fWithShip = (fulfillmentRows ?? []).find((f: any) => {
      const m = f?.metadata && typeof f.metadata === "object" ? f.metadata : {};
      const s = m?.shipping && typeof m.shipping === "object" ? m.shipping : {};
      return s?.tracking_number || s?.label_url || (f as any)?.tracking_number;
    });
    if (fWithShip) {
      const s = fWithShip?.metadata?.shipping;
      if (s && typeof s === "object") fulfillmentShipForMerge = s;
    }
  }
  // Merge service + change reason from fulfillment when invoice lacks them (ensures note always shows)
  if (fulfillmentShipForMerge && (shipMeta?.tracking_number || shipMeta?.label_url)) {
    const hasServiceChange = !!safeStr(fulfillmentShipForMerge?.service_change_reason);
    const needsMerge = hasServiceChange || !!(safeStr(fulfillmentShipForMerge?.service) && !safeStr(shipMeta?.service));
    if (needsMerge) {
      shipMeta = {
        ...shipMeta,
        service: safeStr(shipMeta?.service) || safeStr(fulfillmentShipForMerge?.service),
        service_change_reason: safeStr(shipMeta?.service_change_reason) || safeStr(fulfillmentShipForMerge?.service_change_reason),
        service_changed_from: safeStr(shipMeta?.service_changed_from) || safeStr(fulfillmentShipForMerge?.service_changed_from),
        service_changed_to: safeStr(shipMeta?.service_changed_to) || safeStr(fulfillmentShipForMerge?.service_changed_to),
      };
    }
  }

  const invoiceStatusUpper = safeStr(invoice?.status).toUpperCase();
  const invoiceIssued =
    !!invoice?.id && ["ISSUED", "SENT", "PARTIALLY_PAID", "PAID"].includes(invoiceStatusUpper);
  const trackingNumber = safeStr(shipMeta?.tracking_number);
  const carrier = safeStr(shipMeta?.carrier);
  const labelUrl = safeUrl(shipMeta?.label_url);
  const shippingService = safeStr(shipMeta?.service);
  const saturdayDelivery = !!(shipMeta?.saturday_delivery || fulfillmentShipForMerge?.saturday_delivery);
  const serviceChangeReason = safeStr(shipMeta?.service_change_reason);
  const serviceChangedFrom = safeStr(shipMeta?.service_changed_from);

  const hasPdfPath = !!safeStr(invMeta?.invoice_pdf_path || "");

  const packingSlips = (fulfillmentRows ?? [])
    .map((f: any) => {
      const meta = f?.metadata && typeof f.metadata === "object" ? f.metadata : {};
      const slip = meta?.packing_slip && typeof meta.packing_slip === "object" ? meta.packing_slip : null;
      const path = safeStr(slip?.path);
      const generatedAt = safeStr(slip?.generated_at);
      return {
        id: String(f?.id || ""),
        status: String(f?.status || ""),
        fulfillmentSource: String(f?.fulfillment_source || ""),
        createdAt: safeStr(f?.created_at),
        path,
        generatedAt,
      };
    })
    .filter((r: { id: string; path: string }) => r.id && r.path);

  const { data: addressRows } = await sb
    .from("account_addresses")
    .select("id, kind, label, is_default, address, disabled_at, created_at")
    .eq("account_id", accountId)
    .is("disabled_at", null)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  const billingAddresses = (addressRows ?? []).filter((r: any) => String(r.kind).toUpperCase() === "BILLING");
  const shippingAddresses = (addressRows ?? []).filter((r: any) => String(r.kind).toUpperCase() === "SHIPPING");

  const defaultBillingId = billingAddresses.find((r: any) => !!r.is_default)?.id ?? "";
  const defaultShippingId = shippingAddresses.find((r: any) => !!r.is_default)?.id ?? "";

  const showConfirm = canAct && statusUpper === "DRAFT";
  const hasBilling = !!order.invoice_address;
  const hasShipping = !!order.delivery_address;
  const canSubmitNow = showConfirm && hasBilling && hasShipping;

  const showLockedHint = statusUpper === "LOCKED";
  const showConfirmedHint = statusUpper === "CONFIRMED";

  const terms =
    order.payment_terms_label_snapshot ??
    ((order as any).payment_terms_days_snapshot ? `Net ${(order as any).payment_terms_days_snapshot}` : null) ??
    pricingRow?.payment_terms_label ??
    (pricingRow?.payment_terms_days ? `Net ${pricingRow.payment_terms_days}` : "—");

  const actionPill = pill(statusTone(statusUpper));

  // Timeline step states
  const orderConfirmed = ["CONFIRMED", "LOCKED", "FULFILLING", "NEEDS_INVOICE", "INVOICED", "COMPLETED", "PAID", "PARTIALLY_PAID"].includes(statusUpper);
  const fulfilled = ["FULFILLING", "NEEDS_INVOICE", "INVOICED", "COMPLETED", "PAID", "PARTIALLY_PAID"].includes(statusUpper);
  const packingSlipGenerated = packingSlips.length > 0;
  const shipped = !!(trackingNumber || labelUrl);
  const carrierTrackUrl = buildTrackingLink(carrier, trackingNumber) || null;
  const trackingUrl = carrierTrackUrl || (labelUrl || null);
  const invoiced = !!invoiceIssued;
  const paid = invoiceFullyPaid || invoiceStatusUpper === "PAID";
  const invoiceVoided = ["VOID", "VOIDED"].includes(invoiceStatusUpper);
  const canPayInvoice =
    invoiced &&
    !invoiceVoided &&
    !!invoice?.id &&
    !invoiceFullyPaid &&
    ["ISSUED", "SENT", "PARTIALLY_PAID"].includes(invoiceStatusUpper);

  const shippingPriorityUpper = safeStr((order as any)?.shipping_priority || "").toUpperCase() || null;
  const etaRaw = (order as any)?.shipping_eta_days;
  const etaDays =
    typeof etaRaw === "number" && Number.isFinite(etaRaw) ? etaRaw : typeof etaRaw === "string" ? Number(etaRaw) : null;
  const etaDaysSafe = Number.isFinite(Number(etaDays)) ? Number(etaDays) : null;

  const shippingPriorityLabel = formatShippingPriorityLabel(shippingPriorityUpper, etaDaysSafe);

  const bulkEnabled = !!(pricingRow as any)?.bulk_enabled;
  const bulkRules = Array.isArray((pricingRow as any)?.bulk_rules) ? ((pricingRow as any).bulk_rules as any[]) : [];
  const virtualWarehouseEnabled = !!(pricingRow as any)?.virtual_warehouse_enabled;
  const bulkContractSqcm = numOrZero((order as any).bulk_contract_sqcm);
  const isVwBulkPurchase =
    !!(order as any).bulk_mode && virtualWarehouseEnabled && bulkContractSqcm > 0;

  const computedTotalSqcm = computeTotalSqcm(items ?? [], orderVariantsById);
  const shipNowLineSqcm = computeShipNowLineSqcm(items ?? [], orderVariantsById);

  const totalSqcmForRules = isVwBulkPurchase
    ? bulkContractSqcm
    : Number((order as any).total_sqcm ?? 0) > 0
      ? Number((order as any).total_sqcm)
      : computedTotalSqcm;

  const bulkRuleApplied =
    bulkEnabled && (order as any).bulk_mode
      ? normalizeBulkRules(bulkRules as Array<{ min_sqcm: number; price_per_sqcm: number }>)
          .filter((r) => totalSqcmForRules >= r.min_sqcm)
          .slice(-1)[0]
      : null;

  const totals = computeTotalsFromItems(items ?? []);
  const shippingTotal = computeShippingFromItems(items ?? []);
  const productItems = (items ?? []).filter((it: any) => safeStr(it?.line_type).toUpperCase() !== "SHIPPING");
  const productItemsShipNow = productItems.filter((it: any) => !isVirtualWarehouseBulkDepositLine(it));
  const itemCount = productItemsShipNow.length;
  const itemQty = productItemsShipNow.reduce((sum: number, it: any) => sum + numOrZero(it?.quantity), 0);
  const depositLines = productItems.filter((it: any) => isVirtualWarehouseBulkDepositLine(it));
  const shippingOnlyItems = (items ?? []).filter((it: any) => safeStr(it?.line_type).toUpperCase() === "SHIPPING");

  const bulkPricePerSqcmSnapshot = numOrZero((order as any).bulk_price_per_sqcm_snapshot);
  const showBulkRateColumn = !!(order as any).bulk_mode && bulkPricePerSqcmSnapshot > 0;

  const renderProductLineRow = (it: any) => {
    const qty = numOrZero(it?.quantity);
    const unit = numOrZero(it?.unit_price);
    const raw = unit * qty;
    const isDep = isVirtualWarehouseBulkDepositLine(it);
    const lineDiscount = isDep
      ? pctClamp(it.discount_percent)
      : Number.isFinite(Number(it?.discount_percent))
        ? pctClamp(it.discount_percent)
        : raw > 0 && numOrZero(it?.line_total) > 0
          ? pctClamp((1 - numOrZero(it.line_total) / raw) * 100)
          : totals.discountPercent;
    const discounted = raw * (1 - (lineDiscount ?? 0) / 100);
    const lineTotalVal = isDep ? numOrZero(it?.line_total) : numOrZero(it?.line_total) || discounted;

    const discountCell =
      showBulkRateColumn
        ? `$${formatBulkPricePerSqcmLabel(bulkPricePerSqcmSnapshot)}/sq cm`
        : `${fmtPct(lineDiscount ?? 0)}%`;

    return (
      <tr key={it.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <td style={{ padding: "12px 0", fontWeight: 950 }}>{String(it.description || "Item")}</td>
        <td style={{ padding: "12px 0", fontWeight: 900 }}>{qty || 0}</td>
        <td style={{ padding: "12px 0", color: "var(--muted)", fontWeight: 800 }}>{it.uom ?? "Units"}</td>
        <td style={{ padding: "12px 0", fontWeight: 900 }}>{discountCell}</td>
        <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 950 }}>{money(lineTotalVal)}</td>
      </tr>
    );
  };

  const renderShippingLineRow = (it: any) => {
    const lineType = safeStr(it?.line_type).toUpperCase();
    const shippingLineTotal = lineType === "SHIPPING" ? numOrZero(it?.line_total) : 0;
    const hasShippingAmount = lineType === "SHIPPING" && shippingLineTotal > 0;
    return (
      <tr key={it.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <td style={{ padding: "12px 0", fontWeight: 950 }}>
          {hasShippingAmount ? "Shipping" : "Shipping (TBD)"}
        </td>
        <td style={{ padding: "12px 0", fontWeight: 900 }}>—</td>
        <td style={{ padding: "12px 0", color: "var(--muted)", fontWeight: 800 }}>—</td>
        <td style={{ padding: "12px 0", fontWeight: 900 }}>—</td>
        <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 950 }}>
          {hasShippingAmount ? money(shippingLineTotal) : "TBD"}
        </td>
      </tr>
    );
  };

  return (
    <div
      style={{
        padding: 16,
        maxWidth: 1100,
        width: "100%",
        boxSizing: "border-box",
        display: "grid",
        gap: 16,
        minWidth: 0,
        overflowX: "hidden",
      }}
    >
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            .portal-order-grid {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: 16px;
              align-items: start;
              min-width: 0;
            }
            @media (min-width: 1400px) {
              .portal-order-grid {
                grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
              }
            }
          `,
        }}
      />

      {/* Header */}
      <div
        style={{
          borderRadius: 22,
          overflow: "hidden",
          border: "1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border))",
          background:
            "radial-gradient(900px 240px at 20% 10%, color-mix(in srgb, var(--brand-600) 42%, transparent), transparent 60%)," +
            "linear-gradient(180deg, #061225, #050b16)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <div
          className="portal-detail-header"
          style={{
            padding: 18,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 12,
            alignItems: "flex-end",
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", fontWeight: 950, letterSpacing: 0.4, textTransform: "uppercase" }}>
              360 Portal
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 950, margin: "6px 0 0", letterSpacing: -0.3, color: "white" }}>
              {String(order.order_number || "Order")}
            </h1>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ ...actionPill, background: "rgba(255,255,255,0.12)", color: "white" }}>
                {formatOrderStatusLabel(order.status)}
              </span>
              <span style={{ ...pill("neutral"), background: "rgba(255,255,255,0.12)", color: "white" }}>
                Account{" "}
                <span style={{ opacity: 0.9, fontWeight: 950 }}>
                  {ctx.currentAccountName ?? accountRow?.name ?? "—"}
                </span>
              </span>
              <span style={{ ...pill("neutral"), background: "rgba(255,255,255,0.12)", color: "white" }}>
                {showBulkRateColumn ? (
                  <>
                    Bulk rate{" "}
                    <span style={{ fontWeight: 950 }}>
                      ${formatBulkPricePerSqcmLabel(bulkPricePerSqcmSnapshot)}/sq cm
                    </span>
                  </>
                ) : (
                  <>
                    Discount{" "}
                    <span style={{ fontWeight: 950 }}>{fmtPct(totals.discountPercent)}%</span>
                  </>
                )}
                <span style={{ opacity: 0.55 }}>•</span>
                Terms <span style={{ fontWeight: 950 }}>{terms}</span>
              </span>
              {(order as any).bulk_mode ? (
                <span style={{ ...pill("success"), background: "rgba(16, 185, 129, 0.18)", color: "white" }}>
                  Bulk pricing
                </span>
              ) : null}
              {isVwBulkPurchase ? (
                <span style={{ ...pill("success"), background: "rgba(56, 189, 248, 0.2)", color: "white" }}>
                  Virtual warehouse bulk purchase
                </span>
              ) : null}
              {(order as any).bulk_mode ? (
                <span style={{ ...pill("neutral"), background: "rgba(255,255,255,0.10)", color: "white" }}>
                  Bulk tier:{" "}
                  {bulkRuleApplied ? (
                    <>
                      ${formatBulkPricePerSqcmLabel((order as any).bulk_price_per_sqcm_snapshot ?? bulkRuleApplied.price_per_sqcm)}
                      /sq cm · Sq cm {totalSqcmForRules.toFixed(2)} (rule {bulkRuleApplied.min_sqcm}+)
                    </>
                  ) : (
                    <>Sq cm {totalSqcmForRules.toFixed(2)} (no matching tier)</>
                  )}
                </span>
              ) : null}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.72)", fontWeight: 800, lineHeight: 1.4 }}>
              Created <b style={{ color: "white" }}>{dateTime(order.created_at)}</b>
              {"  "}
              <span style={{ opacity: 0.55 }}>•</span>
              {"  "}
              Submitted <b style={{ color: "white" }}>{dateTime(order.placed_at)}</b>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              justifySelf: "end",
            }}
          >
            <Link href="/portal/orders" style={{ ...softLink(), background: "rgba(255,255,255,0.10)", color: "white" }}>
              ← Orders
            </Link>

            {showConfirm ? (
              <div style={{ display: "grid", justifyItems: "end" }}>
                <form action={`/api/portal/orders/${encodeURIComponent(orderId)}/confirm`} method="post">
                  <button type="submit" style={primaryButtonStyle(!canSubmitNow)} disabled={!canSubmitNow}>
                    Submit Order
                  </button>
                </form>

                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8, textAlign: "right", maxWidth: 360, color: "white" }}>
                  {canSubmitNow ? (
                    <>Submitting sends this order to 360 Medical for processing.</>
                  ) : (
                    <>
                      Add <b>billing</b> and <b>shipping</b> addresses below before submitting.
                      <div style={{ marginTop: 6 }}>
                        <a href="#addresses" style={{ fontWeight: 950, color: "white", textDecoration: "underline" }}>
                          Jump to addresses →
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.8, textAlign: "right", maxWidth: 340, color: "white" }}>
                {showConfirmedHint
                  ? `Submitted: ${dateTime(order.placed_at)}`
                  : showLockedHint
                  ? "Processing (locked by 360 Medical)."
                  : "No actions available."}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.03)",
            padding: 16,
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <PortalOrderTimeline
              orderConfirmed={orderConfirmed}
              fulfilled={fulfilled}
              packingSlipGenerated={packingSlipGenerated}
              shipped={shipped}
              invoiced={invoiced}
              paid={paid}
              firstPackingSlipFulfillmentId={packingSlips[0]?.id ?? null}
              invoiceId={invoice?.id ?? null}
              hasInvoicePdf={hasPdfPath}
              trackingUrl={trackingUrl}
              canPayInvoice={canPayInvoice}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              columnGap: 6,
              rowGap: 6,
            }}
          >
            {isVwBulkPurchase ? (
              <HeroStat
                label="Bulk purchase (sq cm)"
                value={bulkContractSqcm.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              />
            ) : null}
            {isVwBulkPurchase && shipNowLineSqcm > 0 ? (
              <HeroStat label="Ship now (sq cm)" value={shipNowLineSqcm.toFixed(2)} />
            ) : null}
            <HeroStat label={isVwBulkPurchase ? "Items (ship now)" : "Items"} value={`${itemCount} (${itemQty})`} />
            <HeroStat label="Subtotal" value={money(totals.rawMerch)} />
            <HeroStat
              label={showBulkRateColumn ? "Bulk rate" : "Discount"}
              value={
                showBulkRateColumn
                  ? `$${formatBulkPricePerSqcmLabel(bulkPricePerSqcmSnapshot)}/sq cm`
                  : `${fmtPct(totals.discountPercent)}%`
              }
            />
            <HeroStat label="Total" value={money(totals.merchAfterDiscount)} />
          </div>
        </div>
      </div>

      <OrderPortalOverlayCleanup autosubmit={autoSubmit} stripeReturnFromPay={stripeReturnFromPay} />
      {stripeReturnFromPay && invoice?.id ? (
        <Suspense fallback={null}>
          <StripePaymentReturnClient invoiceId={String(invoice.id)} />
        </Suspense>
      ) : null}
      {autoSubmit && !stripeReturnFromPay ? <AutoSubmitClient orderId={orderId} enabled={true} /> : null}

      {statusUpper === "DRAFT" ? (
        <Banner kind="warning" title="Draft order" body={<>You can edit items below, then click <b>Submit Order</b> when ready.</>} />
      ) : null}

      {statusUpper === "DRAFT" && isVwBulkPurchase && canPayInvoice && !paid ? (
        <Banner
          kind="warning"
          title="Pay your bulk purchase invoice"
          body={
            <>
              This order is a virtual warehouse bulk purchase. Pay the invoice below for the sq cm total, then submit the
              order. Shipping for ship-now lines (if any) can be invoiced separately when 360 Medical fulfills.
            </>
          }
        />
      ) : null}

      {statusUpper === "CONFIRMED" ? (
        <Banner kind="ok" title="Order submitted" body="We’ve received your order. 360 Medical will review and begin processing." />
      ) : statusUpper === "LOCKED" ? (
        <Banner kind="ok" title="Order in processing" body="This order is locked by 360 Medical while it’s being processed." />
      ) : null}

      {/* Main grid */}
      <div className="portal-order-grid">
        <Card
          title="Line items"
          subtitle={
            statusUpper === "DRAFT"
              ? isVwBulkPurchase
                ? "Virtual warehouse bulk purchase + optional ship-now lines. Edit below while draft."
                : "Edit quantities, remove lines, or add products (draft only)."
              : isVwBulkPurchase
                ? "Bulk sq cm purchase adds to your virtual warehouse balance. Ship-now lines ship from stock. Additional shipping may be invoiced per shipment when you request fulfillment from Virtual warehouse."
                : "Products included in this order. Shipping is entered by 360 Medical."
          }
          right={statusUpper === "DRAFT" && canAct ? <span style={pill("warning")}>Editable</span> : undefined}
        >
          {statusUpper === "DRAFT" && canAct ? (
            <DraftOrderEditorClient
              orderId={String(order.id)}
              discountPercent={totals.discountPercent}
              initialItems={(items ?? []) as any}
              products={products as any}
              variants={variants as any}
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", fontSize: 12, color: "var(--muted)" }}>
                    <th style={{ padding: "10px 0" }}>Description</th>
                    <th style={{ padding: "10px 0" }}>Qty</th>
                    <th style={{ padding: "10px 0" }}>Unit</th>
                    <th style={{ padding: "10px 0" }}>{showBulkRateColumn ? "Bulk rate" : "Discount"}</th>
                    <th style={{ padding: "10px 0", textAlign: "right" }}>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {isVwBulkPurchase && depositLines.length > 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: "14px 0 6px",
                          fontWeight: 950,
                          fontSize: 12,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        Virtual warehouse bulk purchase
                      </td>
                    </tr>
                  ) : null}
                  {depositLines.map((it: any) => renderProductLineRow(it))}
                  {isVwBulkPurchase && productItemsShipNow.length > 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: "14px 0 6px",
                          fontWeight: 950,
                          fontSize: 12,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        Ship now
                      </td>
                    </tr>
                  ) : null}
                  {isVwBulkPurchase
                    ? productItemsShipNow.map((it: any) => renderProductLineRow(it))
                    : productItems.map((it: any) => renderProductLineRow(it))}
                  {shippingOnlyItems.map((it: any) => renderShippingLineRow(it))}
                  {!isVwBulkPurchase && (items ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "14px 0", color: "var(--muted)", fontWeight: 800 }}>
                        No line items.
                      </td>
                    </tr>
                  ) : null}
                  {isVwBulkPurchase &&
                  depositLines.length === 0 &&
                  productItemsShipNow.length === 0 &&
                  shippingOnlyItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "14px 0", color: "var(--muted)", fontWeight: 800 }}>
                        No line items.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          <Card
            title="Summary"
            subtitle={
              isVwBulkPurchase
                ? "Totals reflect your bulk purchase (sq cm) and any ship-now lines. Shipping for this order may be TBD; separate shipments can be invoiced later."
                : "Totals reflect the discount on this order. Shipping is entered by 360 Medical."
            }
            right={<span style={pill(statusTone(statusUpper))}>{formatOrderStatusLabel(order.status)}</span>}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <Row label="Merch subtotal" value={money(totals.rawMerch)} />
              <Row
                label={showBulkRateColumn ? "Bulk rate" : `Discount (${fmtPct(totals.discountPercent)}%)`}
                value={
                  <span style={{ fontWeight: 950 }}>
                    {showBulkRateColumn
                      ? `$${formatBulkPricePerSqcmLabel(bulkPricePerSqcmSnapshot)}/sq cm`
                      : totals.discountPercent > 0
                        ? `−${money(totals.discountAmount)}`
                        : money(0)}
                  </span>
                }
              />
              <Row label={<span style={{ fontWeight: 950 }}>Subtotal (after discount)</span>} value={<span style={{ fontWeight: 950 }}>{money(totals.merchAfterDiscount)}</span>} />

              <Row
                label="Shipping"
                value={
                  <span style={{ fontWeight: 950 }}>
                    {shippingTotal > 0 ? money(shippingTotal) : "TBD"}
                  </span>
                }
              />
              <Row
                label={shipped ? "Shipping service" : "Shipping priority"}
                value={
                  shipped && (shippingService || serviceChangeReason) ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontWeight: 950 }}>
                        {shippingService ? formatFedexServiceLabel(shippingService, { saturdayDelivery }) : "—"}
                      </span>
                      {serviceChangeReason ? (
                        <div
                          style={{
                            fontSize: 12,
                            padding: 8,
                            borderRadius: 8,
                            background: "rgba(255,153,0,0.08)",
                            border: "1px solid rgba(255,153,0,0.25)",
                            color: "rgba(120,60,0,1)",
                            fontWeight: 850,
                            lineHeight: 1.45,
                          }}
                        >
                          <div style={{ fontWeight: 950, marginBottom: 4 }}>
                            Service change: {serviceChangedFrom ? `from ${formatFedexServiceLabel(serviceChangedFrom)}` : ""}
                          </div>
                          {serviceChangeReason}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span style={{ fontWeight: 950 }}>{shippingPriorityLabel}</span>
                  )
                }
              />

              <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />

              <Row
                label={
                  <span style={{ fontWeight: 950 }}>
                    {shippingTotal > 0 ? "Total" : "Total (excl. shipping)"}
                  </span>
                }
                value={
                  <span style={{ fontWeight: 950, fontSize: 18 }}>
                    {money(shippingTotal > 0 ? totals.merchAfterDiscount + shippingTotal : totals.merchAfterDiscount)}
                  </span>
                }
              />

              <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.45 }}>
                {shippingTotal > 0 ? null : (
                  <>
                    Shipping cost will be added by 360 Medical after review.
                    <br />
                  </>
                )}
                Submitted: <b style={{ color: "var(--foreground)" }}>{dateTime(order.placed_at)}</b>
                <br />
              </div>
            </div>
          </Card>

          <Card
            title="Invoice & Tracking"
            subtitle={
              isVwBulkPurchase ? (
                invoiceIssued ? (
                  <>
                    Pay this invoice for your virtual warehouse bulk sq cm purchase. Tracking appears after shipment for
                    ship-now items.
                  </>
                ) : (
                  <>
                    After you submit, you’ll be asked to pay the bulk purchase invoice. Shipping for future VW shipments
                    can be invoiced per order.
                  </>
                )
              ) : invoiceIssued ? (
                <>Your invoice is available now. Tracking appears after shipment.</>
              ) : (
                <>Invoice will appear here after 360 Medical issues it.</>
              )
            }
            right={
              invoiceIssued ? (
                <span style={pill(invoiceTone(invoiceStatusUpper))}>{formatStatusLabel(invoice?.status) || "Invoice"}</span>
              ) : (
                <span style={pill("neutral")}>Not ready</span>
              )
            }
          >
            <div style={{ display: "grid", gap: 12 }}>
              {!invoiceIssued ? (
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 800, lineHeight: 1.5 }}>
                  No issued invoice yet. If you believe this is an error, contact 360 Medical and include your order number{" "}
                  <b style={{ color: "var(--foreground)" }}>{String(order.order_number || "")}</b>.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  <Row
                    label="Invoice"
                    value={
                      <span style={{ fontWeight: 950 }}>
                        {safeStr(invoice?.invoice_number) ? safeStr(invoice?.invoice_number) : `${String(invoice?.id).slice(0, 8)}…`}
                      </span>
                    }
                  />
                  <Row label="Issued" value={<span style={{ fontWeight: 900 }}>{dateTime(invoice?.issued_at || null)}</span>} />
                  <Row label="Invoice total" value={<span style={{ fontWeight: 950 }}>{money(invoice?.total)}</span>} />
                </div>
              )}

              {invoiceIssued ? <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} /> : null}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  alignItems: "stretch",
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ flex: "1 1 200px", minWidth: 0, display: "grid", gap: 8, alignContent: "start" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 950,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: 0.04,
                    }}
                  >
                    Packing slip
                  </div>
                  {packingSlips.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>Not available yet.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {packingSlips.map((slip: { id: string; fulfillmentSource: string; path: string; generatedAt: string }) => (
                        <div key={slip.id} style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 900 }}>
                            Fulfillment {slip.id.slice(0, 8)}… • {safeStr(slip.fulfillmentSource || "FULFILLMENT")}
                          </div>
                          {slip.generatedAt ? (
                            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>
                              Generated: <b>{dateTime(slip.generatedAt)}</b>
                            </div>
                          ) : null}
                          <PackingSlipDownloadClient fulfillmentId={slip.id} enabled={!!slip.path} compact />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ flex: "1 1 200px", minWidth: 0, display: "grid", gap: 8, alignContent: "start" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 950,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: 0.04,
                    }}
                  >
                    Tracking
                  </div>
                  {carrierTrackUrl ? (
                    <a
                      href={carrierTrackUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontWeight: 950, color: "var(--brand-700)", textDecoration: "none", width: "fit-content" }}
                    >
                      Track shipment →
                    </a>
                  ) : null}
                  {(trackingNumber || labelUrl) ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      {trackingNumber ? (
                        <div style={{ fontSize: 13, fontWeight: 900 }}>
                          {carrier ? <span style={{ marginRight: 8 }}>{carrier}</span> : null}
                          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{trackingNumber}</span>
                        </div>
                      ) : null}

                      {shippingService ? (
                        <div style={{ fontSize: 12, fontWeight: 850, opacity: 0.9 }}>
                          Service: {formatFedexServiceLabel(shippingService, { saturdayDelivery })}
                        </div>
                      ) : null}

                      {labelUrl ? (
                        <div>
                          <a
                            href={labelUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontWeight: 950, color: "var(--brand-700)", textDecoration: "none" }}
                          >
                            View shipping label →
                          </a>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>
                          A label link may appear here if provided by 360 Medical.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.45 }}>
                      Tracking hasn’t been added yet.
                    </div>
                  )}
                </div>

                <div style={{ flex: "1 1 200px", minWidth: 0, display: "grid", gap: 8, alignContent: "start" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 950,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: 0.04,
                    }}
                  >
                    Invoice PDF
                  </div>
                  {invoiceIssued ? (
                    <>
                      <InvoiceDownloadClient invoiceId={String(invoice?.id)} enabled={hasPdfPath} compact />
                      {!hasPdfPath ? (
                        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.45 }}>
                          PDF will be ready shortly after your first download request.
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800, lineHeight: 1.45 }}>
                      Available after 360 Medical issues your invoice.
                    </div>
                  )}
                </div>
              </div>

              {serviceChangeReason ? (
                <div
                  style={{
                    fontSize: 12,
                    padding: 10,
                    borderRadius: 10,
                    background: "rgba(255,153,0,0.08)",
                    border: "1px solid rgba(255,153,0,0.25)",
                    color: "rgba(120,60,0,1)",
                    fontWeight: 850,
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 950, marginBottom: 4 }}>
                    Service change: {serviceChangedFrom ? `from ${formatFedexServiceLabel(serviceChangedFrom)}` : ""}
                  </div>
                  {serviceChangeReason}
                </div>
              ) : null}
            </div>
          </Card>

          <Card
            title="Billing & Shipping"
            subtitle={
              <>
                Address snapshot on this order.
                {statusUpper === "DRAFT" && canAct ? <> You can update addresses below before submitting.</> : null}
              </>
            }
          >
            <div id="addresses" style={{ display: "grid", gap: 14, minWidth: 0 }}>
              <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 950, marginBottom: 6 }}>
                    Billing {!order.invoice_address ? <span style={{ marginLeft: 8, ...pill("warning") }}>Missing</span> : null}
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 12,
                      opacity: 0.9,
                      minWidth: 0,
                    }}
                  >
                    {prettyAddress(order.invoice_address)}
                  </pre>
                </div>

                <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 950, marginBottom: 6 }}>
                    Shipping {!order.delivery_address ? <span style={{ marginLeft: 8, ...pill("warning") }}>Missing</span> : null}
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 12,
                      opacity: 0.9,
                      minWidth: 0,
                    }}
                  >
                    {prettyAddress(order.delivery_address)}
                  </pre>
                </div>
              </div>

              {statusUpper === "DRAFT" && canAct ? (
                <div style={{ marginTop: 8, minWidth: 0 }}>
                  <div style={{ height: 1, background: "rgba(0,0,0,0.08)", marginBottom: 14 }} />
                  <AddressFixerClient
                    orderId={String(order.id)}
                    canEdit={true}
                    statusUpper={statusUpper}
                    billingAddresses={(billingAddresses ?? []) as any}
                    shippingAddresses={(shippingAddresses ?? []) as any}
                    defaultBillingId={defaultBillingId ? String(defaultBillingId) : ""}
                    defaultShippingId={defaultShippingId ? String(defaultShippingId) : ""}
                    initialInvoiceAddress={order.invoice_address ?? null}
                    initialDeliveryAddress={order.delivery_address ?? null}
                  />
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", minWidth: 0 }}>
      <div style={{ color: "var(--muted)", fontWeight: 900, fontSize: 13 }}>{label}</div>
      <div style={{ fontWeight: 950, fontSize: 13, minWidth: 0 }}>{value}</div>
    </div>
  );
}
