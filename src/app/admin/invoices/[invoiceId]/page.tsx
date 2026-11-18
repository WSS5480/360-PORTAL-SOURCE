// src/app/admin/invoices/[invoiceId]/page.tsx
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reconcilePendingStripeSubmissionsForInvoice } from "@/lib/stripe/reconcilePendingStripeSubmissions";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import InvoicePdfActionsClient from "./InvoicePdfActionsClient";
import AdminInvoiceStripePayClient from "./AdminInvoiceStripePayClient";
import OrderStatusFlow from "@/components/admin/OrderStatusFlow";
import ShippingConfirmAction from "@/components/admin/ShippingConfirmAction";
import { formatStatusLabel } from "@/lib/formatStatusLabel";
import { effectivePaymentTermsDays } from "@/lib/billing/effectivePaymentTermsDays";
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

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}
function safeStr(v: unknown) {
  return String(v ?? "").trim();
}
function safeNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function safeObj(v: unknown) {
  return v && typeof v === "object" ? (v as any) : {};
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
  if (s === "ISSUED") return { ...base, background: "rgba(13, 110, 253, 0.14)" };
  if (s === "SENT") return { ...base, background: "rgba(13, 110, 253, 0.10)" };
  if (s === "PARTIALLY_PAID") return { ...base, background: "rgba(255, 193, 7, 0.18)" };
  if (s === "PAID") return { ...base, background: "rgba(25, 135, 84, 0.14)" };
  if (s === "VOID" || s === "VOIDED") return { ...base, background: "rgba(220, 53, 69, 0.12)" };
  return base;
}

const USD_FMT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const DT_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function money(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return USD_FMT.format(v);
}
function dateTime(v: unknown) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return DT_FMT.format(d);
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
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
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
  return parts || "—";
}

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 16,
    background: "white",
    boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
    overflow: "hidden",
  };
}
function cardHeader(): React.CSSProperties {
  return {
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    fontWeight: 950,
    background: "rgba(0,0,0,0.02)",
  };
}

function heroStat(label: string, value: React.ReactNode) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        display: "grid",
        gap: 4,
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontWeight: 950, fontSize: 16 }}>{value}</div>
    </div>
  );
}
function buttonStyle(opts?: { tone?: "primary" | "muted"; disabled?: boolean }): React.CSSProperties {
  const disabled = !!opts?.disabled;
  const tone = opts?.tone ?? "primary";

  const base: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 950,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    cursor: disabled ? "not-allowed" : "pointer",
    justifySelf: "start",
    width: "100%",
  };

  if (tone === "muted") {
    return {
      ...base,
      background: disabled ? "rgba(0,0,0,0.08)" : "white",
      color: "#111",
      opacity: disabled ? 0.6 : 1,
    };
  }

  return {
    ...base,
    background: disabled ? "rgba(0,0,0,0.12)" : "#111",
    color: disabled ? "rgba(0,0,0,0.5)" : "white",
    opacity: disabled ? 0.75 : 1,
  };
}

function selectStyle(disabled?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    fontWeight: 900,
    background: disabled ? "rgba(0,0,0,0.08)" : "white",
    color: disabled ? "rgba(0,0,0,0.55)" : "#111",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
function inputStyle(disabled?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    fontWeight: 900,
    background: disabled ? "rgba(0,0,0,0.08)" : "white",
    color: disabled ? "rgba(0,0,0,0.55)" : "#111",
  };
}

function buildTrackingLink(carrierRaw: string, tracking: string) {
  const c = safeUpper(carrierRaw);
  const t = safeStr(tracking);
  if (!t) return "";
  if (c.includes("FEDEX")) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(t)}`;
  if (c.includes("UPS")) return `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}`;
  if (c.includes("USPS")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(t)}`;
  return "";
}

function extractInventoryShipping(meta: any, f: any) {
  const ship = meta?.shipping && typeof meta.shipping === "object" ? meta.shipping : {};
  return {
    carrier: safeStr(ship?.carrier),
    tracking: safeStr(ship?.tracking_number) || safeStr(f?.tracking_number),
    labelUrl: safeStr(ship?.label_url),
    shippedAt: safeStr(ship?.shipped_at) || safeStr(f?.shipped_at),
    noTracking: !!ship?.no_tracking,
    packingSlipPath:
      safeStr(meta?.packing_slip_path) ||
      safeStr(meta?.docs?.packing_slip?.path) ||
      safeStr(meta?.packing_slip?.path) ||
      "",
  };
}

function extractDropshipShipping(f: any) {
  const meta: any = safeObj(f?.metadata);
  const ship: any = safeObj(meta?.shipping);
  return {
    carrier: safeStr(f?.dropship_carrier),
    tracking: safeStr(f?.dropship_tracking_number),
    shipDate: safeStr(f?.dropship_ship_date),
    packingSlipNo: safeStr(f?.dropship_packing_slip_number),
    labelUrl: safeStr(ship?.label_url),
    noTracking: !!ship?.no_tracking,
    shippedAt: safeStr(ship?.shipped_at) || safeStr(f?.shipped_at),
  };
}

function fulfillmentSignals(f: any) {
  if (!f) return { packingSlipGenerated: false, shippingInfoSaved: false };
  const source = safeUpper(f?.fulfillment_source);
  const meta: any = safeObj(f?.metadata);
  if (source === "DROPSHIP") {
    const ds = extractDropshipShipping(f);
    return {
      packingSlipGenerated: !!ds.packingSlipNo,
      shippingInfoSaved: !!ds.tracking || !!ds.shipDate || !!ds.labelUrl || !!ds.noTracking || !!ds.shippedAt,
    };
  }
  const inv = extractInventoryShipping(meta, f);
  return {
    packingSlipGenerated: !!inv.packingSlipPath,
    shippingInfoSaved: !!inv.tracking || !!inv.labelUrl || !!inv.noTracking || !!inv.shippedAt,
  };
}

function uniqPush(map: Map<string, string[]>, key: string, val: string) {
  const k = safeStr(key);
  const v = safeStr(val);
  if (!k || !v) return;
  const cur = map.get(k) ?? [];
  if (!cur.includes(v)) cur.push(v);
  map.set(k, cur);
}

type InvoiceItemRow = {
  id: string;
  order_item_id: string | null;
  product_variant_id: string | null;
  description: string;
  quantity: number;
  uom: string | null;
  unit_price: number;
  discount_percent: number | null;
  line_total: number | null;
  line_type: string | null;
  sort_order: number;
};

type PaymentRow = {
  id: string;
  invoice_id: string;
  amount: number | null;
  note: string | null;
  created_at: string;
  created_by_user_id: string | null;
};

type SubmissionRow = {
  id: string;
  invoice_id: string;
  method: string | null;
  amount: number | null;
  status: string | null;
  reference: string | null;
  sent_at: string | null;
  note: string | null;
  created_at: string | null;
  stripe_payment_intent_status?: string | null;
  proof_bucket?: string | null;
  proof_path?: string | null;
  proofUrl?: string | null;
};

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  await requireOrdersStaffOrAdmin();

  const resolved = await params;
  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");

  if (!UUID_RE.test(invoiceId)) {
    return (
      <main style={{ padding: 18, maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Invoice</h1>
        <div style={{ marginTop: 12, color: "crimson", fontWeight: 950 }}>Invalid invoiceId.</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/admin/invoices" style={{ textDecoration: "none", fontWeight: 950 }}>
            ← Back to Invoices
          </Link>
        </div>
      </main>
    );
  }

  const { data: invoice, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select(
      "id, account_id, order_id, invoice_number, invoice_kind, status, issued_at, voided_at, subtotal, shipping_total, tax, total, metadata, created_at, amount_paid, paid_at"
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr || !invoice) {
    return (
      <main style={{ padding: 18, maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Invoice</h1>
        <div style={{ marginTop: 12, color: "crimson", fontWeight: 950 }}>{invErr?.message || "Not found."}</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/admin/invoices" style={{ textDecoration: "none", fontWeight: 950 }}>
            ← Back to Invoices
          </Link>
        </div>
      </main>
    );
  }

  await reconcilePendingStripeSubmissionsForInvoice(invoiceId);

  const { data: itemsRaw, error: itemErr } = await supabaseAdmin
    .from("invoice_items")
    .select(
      "id, order_item_id, product_variant_id, description, quantity, uom, unit_price, discount_percent, line_total, line_type, sort_order"
    )
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true });

  if (itemErr) {
    return (
      <main style={{ padding: 18, maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Invoice</h1>
        <div style={{ marginTop: 12, color: "crimson", fontWeight: 950 }}>{itemErr.message}</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/admin/invoices" style={{ textDecoration: "none", fontWeight: 950 }}>
            ← Back to Invoices
          </Link>
        </div>
      </main>
    );
  }

  const items = (itemsRaw ?? []) as unknown as InvoiceItemRow[];
  const orderId = safeStr((invoice as any).order_id);
  const accountId = safeStr((invoice as any).account_id);

  const { data: orderRow } = orderId
    ? await supabaseAdmin
        .from("orders")
        .select(
          "id, order_number, account_id, bulk_mode, invoice_address, delivery_address, created_at, placed_at, created_by_user_id, submitted_by_contact_id, status, payment_terms_label_snapshot, payment_terms_days_snapshot"
        )
        .eq("id", orderId)
        .maybeSingle()
    : { data: null };

  const showShippingPerFulfillmentNote =
    safeUpper((invoice as any).invoice_kind) === "SHIPPING_SUPPLEMENT" || !!(orderRow as any)?.bulk_mode;

  const resolvedAccountId = safeStr(orderRow?.account_id || accountId);
  const { data: accountRow } = resolvedAccountId
    ? await supabaseAdmin.from("accounts").select("id, name").eq("id", resolvedAccountId).maybeSingle()
    : { data: null };
  const { data: pricingRow } = resolvedAccountId
    ? await supabaseAdmin
        .from("account_pricing")
        .select("payment_terms_days, payment_terms_label")
        .eq("account_id", resolvedAccountId)
        .maybeSingle()
    : { data: null };

  // ---- Fulfillments for shipment + serial sourcing
  const { data: fulfillmentsRaw } = await supabaseAdmin
    .from("fulfillments")
    .select("id, status, created_at, shipped_at, fulfillment_source, metadata")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(50);

  const fulfillments = Array.isArray(fulfillmentsRaw) ? fulfillmentsRaw : [];

  const openFulfillment = fulfillments.find((f: any) => safeUpper(f.status) === "OPEN") ?? null;
  const latestFulfillment = fulfillments.length ? fulfillments[0] : null;
  const flowFulfillment = openFulfillment ?? latestFulfillment;
  const flowSignals = flowFulfillment ? fulfillmentSignals(flowFulfillment) : { packingSlipGenerated: false, shippingInfoSaved: false };
  const shippingMeta = (flowFulfillment as any)?.metadata?.shipping_confirmation;
  const shippingSent = !!shippingMeta?.sent_at;
  const shippingSkipped = !!shippingMeta?.skipped_at;
  const shippingConfirmed = shippingSent || shippingSkipped;
  const canEmailShipping = flowSignals.packingSlipGenerated && flowSignals.shippingInfoSaved;
  /** Matches OrderStatusFlowForOrder: timeline fulfillment step is complete when no OPEN fulfillment exists. */
  const allFulfillmentsClosed = fulfillments.length > 0 && !openFulfillment;

  const bestFulfillment =
    fulfillments.find((f: any) => {
      const meta: any = safeObj(f?.metadata);
      const ship: any = safeObj(meta?.shipping);
      return !!safeStr(ship?.carrier) || !!safeStr(ship?.tracking_number) || !!f?.shipped_at;
    }) ?? (fulfillments[0] ?? null);

  const fMeta: any = safeObj(bestFulfillment?.metadata);
  const fShipping: any = safeObj(fMeta?.shipping);
  const shipCarrier = safeStr(fShipping?.carrier);
  const shipTracking = safeStr(fShipping?.tracking_number || fShipping?.trackingNumber);
  const shipShippedAt = safeStr(fShipping?.shipped_at || bestFulfillment?.shipped_at);
  const shipNoTracking = !!fShipping?.no_tracking;
  const trackingLink = shipCarrier && shipTracking ? buildTrackingLink(shipCarrier, shipTracking) : "";

  const fulfillmentIds = fulfillments.map((f: any) => safeStr(f.id)).filter(Boolean);

  // Map: fulfillment_item_id -> order_item_id / variant_id
  const fiIdToOrderItem = new Map<string, string>();
  const fiIdToVariant = new Map<string, string>();

  if (fulfillmentIds.length) {
    const { data: fiRaw } = await supabaseAdmin
      .from("fulfillment_items")
      .select("id, fulfillment_id, order_item_id, variant_id")
      .in("fulfillment_id", fulfillmentIds as any)
      .limit(10000);

    const fi = Array.isArray(fiRaw) ? fiRaw : [];
    for (const r of fi) {
      const fiId = safeStr((r as any).id);
      if (!fiId) continue;
      const oiId = safeStr((r as any).order_item_id);
      const vId = safeStr((r as any).variant_id);
      if (oiId) fiIdToOrderItem.set(fiId, oiId);
      if (vId) fiIdToVariant.set(fiId, vId);
    }
  }

  const fiIds = Array.from(fiIdToOrderItem.keys());

  const serialsByOrderItem = new Map<string, string[]>();
  const serialsByVariant = new Map<string, string[]>();

  // (A) Trace table: fulfillment_item_trace
  if (fiIds.length) {
    const { data: trRaw } = await supabaseAdmin
      .from("fulfillment_item_trace")
      .select("fulfillment_item_id, variant_id, serial_number, lot_number")
      .in("fulfillment_item_id", fiIds as any)
      .limit(20000);

    const tr = Array.isArray(trRaw) ? trRaw : [];
    for (const r of tr) {
      const fiId = safeStr((r as any).fulfillment_item_id);
      const oiId = fiIdToOrderItem.get(fiId) || "";
      const vId = safeStr((r as any).variant_id) || fiIdToVariant.get(fiId) || "";
      const serial = safeStr((r as any).serial_number);
      const lot = safeStr((r as any).lot_number);

      if (oiId) {
        if (serial) uniqPush(serialsByOrderItem, oiId, serial);
        else if (lot) uniqPush(serialsByOrderItem, oiId, `LOT:${lot}`);
      }
      if (vId) {
        if (serial) uniqPush(serialsByVariant, vId, serial);
        else if (lot) uniqPush(serialsByVariant, vId, `LOT:${lot}`);
      }
    }
  }

  // (B) Inventory fallback: fulfillment_picks -> product_variant_lots
  if (fulfillmentIds.length) {
    const { data: picksRaw } = await supabaseAdmin
      .from("fulfillment_picks")
      .select("fulfillment_item_id, variant_id, lot_row_id, qty, created_at, is_undo")
      .in("fulfillment_id", fulfillmentIds as any)
      .eq("is_undo", false)
      .limit(20000);

    const picks = Array.isArray(picksRaw) ? picksRaw : [];
    const lotRowIds = Array.from(
      new Set(
        picks
          .map((p: any) => safeStr(p?.lot_row_id))
          .filter((x) => UUID_RE.test(x))
      )
    );

    const lotsById = new Map<string, { serial_number: string; lot_number: string }>();

    if (lotRowIds.length) {
      const { data: lotsRaw } = await supabaseAdmin
        .from("product_variant_lots")
        .select("id, serial_number, lot_number")
        .in("id", lotRowIds as any)
        .limit(20000);

      const lots = Array.isArray(lotsRaw) ? lotsRaw : [];
      for (const l of lots) {
        const id = safeStr((l as any).id);
        if (!id) continue;
        lotsById.set(id, {
          serial_number: safeStr((l as any).serial_number),
          lot_number: safeStr((l as any).lot_number),
        });
      }
    }

    for (const p of picks) {
      const fiId = safeStr((p as any).fulfillment_item_id);
      const oiId = fiIdToOrderItem.get(fiId) || "";
      const vId = safeStr((p as any).variant_id) || fiIdToVariant.get(fiId) || "";

      const lotRowId = safeStr((p as any).lot_row_id);
      if (!UUID_RE.test(lotRowId)) continue;

      const lot = lotsById.get(lotRowId);
      if (!lot) continue;

      if (oiId) {
        if (lot.serial_number) uniqPush(serialsByOrderItem, oiId, lot.serial_number);
        else if (lot.lot_number) uniqPush(serialsByOrderItem, oiId, `LOT:${lot.lot_number}`);
      }
      if (vId) {
        if (lot.serial_number) uniqPush(serialsByVariant, vId, lot.serial_number);
        else if (lot.lot_number) uniqPush(serialsByVariant, vId, `LOT:${lot.lot_number}`);
      }
    }
  }

  // ---- PDF metadata and email history
  const invMeta: any = safeObj((invoice as any).metadata);
  const emailsSentList: Array<{ type: string; at: string }> = Array.isArray(invMeta?.invoice_emails_sent)
    ? invMeta.invoice_emails_sent
    : [];
  const lastInvoiceEmailEntry = [...emailsSentList]
    .filter((e: any) => String(e?.type || "").toLowerCase() === "invoice")
    .sort((a: any, b: any) => (b?.at || "").localeCompare(a?.at || ""))[0];
  const invoiceSentAt = safeStr(lastInvoiceEmailEntry?.at || invMeta?.last_invoice_emailed_at);
  const invoiceSent = !!invoiceSentAt;
  const pdfObj: any = invMeta?.invoice_pdf && typeof invMeta.invoice_pdf === "object" ? invMeta.invoice_pdf : {};
  const pdfBucket = safeStr(pdfObj?.bucket || invMeta?.invoice_pdf_bucket || "");
  const pdfPath = safeStr(pdfObj?.path || invMeta?.invoice_pdf_path || "");
  const hasPdfPath = !!pdfBucket && !!pdfPath;

  // ---- status/payment
  const statusUpper = safeUpper((invoice as any).status);
  const isVoided = !!(invoice as any).voided_at || statusUpper === "VOID" || statusUpper === "VOIDED";

  const { data: flowPickRows } = flowFulfillment?.id
    ? await supabaseAdmin
        .from("fulfillment_items")
        .select("picked_qty")
        .eq("fulfillment_id", flowFulfillment.id)
    : { data: [] as any[] };
  const pickedItemsDone = (flowPickRows ?? []).some((r: any) => safeNum(r?.picked_qty) > 0);

  const accountNameForFlow = safeStr(accountRow?.name) || "—";
  const submitterUserId = safeStr(orderRow?.created_by_user_id);
  const submitterContactId = safeStr(orderRow?.submitted_by_contact_id);
  const { data: submitterProfile } = submitterUserId
    ? await supabaseAdmin.from("user_profiles").select("user_id, email, full_name").eq("user_id", submitterUserId).maybeSingle()
    : ({ data: null } as any);
  const { data: submitterContact } = submitterContactId
    ? await supabaseAdmin.from("account_contacts").select("id, email, full_name").eq("id", submitterContactId).maybeSingle()
    : ({ data: null } as any);
  const submittedName =
    safeStr(submitterContact?.full_name) || safeStr(submitterProfile?.full_name);
  const submittedEmail =
    safeStr(submitterContact?.email) || safeStr(submitterProfile?.email);
  const billingEmail = safeStr(invMeta?.billing_email) || submittedEmail;

  // Best effort: show amount_paid if you add it later; else compute from payments table if it exists
  let payments: PaymentRow[] = [];
  let amountPaid = safeNum((invoice as any).amount_paid);
  let submissions: SubmissionRow[] = [];

  // If you have an invoice_payments table, we’ll show it; if not, this silently does nothing.
  try {
    const { data: payRaw } = await supabaseAdmin
      .from("invoice_payments")
      .select("id, invoice_id, amount, note, created_at, created_by_user_id")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false })
      .limit(100);

    payments = Array.isArray(payRaw) ? (payRaw as any) : [];

    if (!Number.isFinite(Number((invoice as any).amount_paid))) {
      amountPaid = payments.reduce((sum: number, p: any) => sum + safeNum(p?.amount), 0);
    }
  } catch {
    // ignore
  }

  try {
    const { data: subRaw } = await supabaseAdmin
      .from("invoice_payment_submissions")
      .select(
        "id, invoice_id, method, amount, status, reference, sent_at, note, created_at, proof_bucket, proof_path, stripe_payment_intent_status"
      )
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false })
      .limit(100);
    const base = Array.isArray(subRaw) ? (subRaw as any[]) : [];
    const enriched: SubmissionRow[] = [];
    for (const s of base) {
      let proofUrl: string | null = null;
      const b = safeStr(s?.proof_bucket);
      const pth = safeStr(s?.proof_path);
      if (b && pth) {
        try {
          const { data } = await supabaseAdmin.storage.from(b).createSignedUrl(pth, 60 * 30);
          proofUrl = data?.signedUrl ?? null;
        } catch {
          proofUrl = null;
        }
      }
      enriched.push({ ...s, proofUrl });
    }
    submissions = enriched;
  } catch {
    // ignore
  }

  const total = safeNum((invoice as any).total);
  const remaining = Math.max(0, total - amountPaid);
  const stripePaid = payments.reduce(
    (sum: number, p: any) => (safeStr(p.note).startsWith("stripe:") ? sum + safeNum(p.amount) : sum),
    0
  );
  const wirePaid = payments.reduce(
    (sum: number, p: any) => (safeStr(p.note).startsWith("wire:") ? sum + safeNum(p.amount) : sum),
    0
  );

  // Display invoice number
  const invNumber = safeStr((invoice as any).invoice_number) || String((invoice as any).id).slice(0, 8) + "…";
  const orderNumber = safeStr((orderRow as any)?.order_number) || "—";
  const accountName = safeStr((accountRow as any)?.name) || "—";

  const orderBulk = !!(orderRow as any)?.bulk_mode;
  const termsLabelSnapshot = safeStr((orderRow as any)?.payment_terms_label_snapshot);
  const termsDaysSnapshot = Number((orderRow as any)?.payment_terms_days_snapshot);
  const pricingTermsLabel = safeStr((pricingRow as any)?.payment_terms_label);
  const pricingTermsDays = Number((pricingRow as any)?.payment_terms_days);
  const termsDaysFallback = Number.isFinite(pricingTermsDays) && pricingTermsDays > 0 ? pricingTermsDays : 30;

  const termsDays = effectivePaymentTermsDays({
    bulk_mode: (orderRow as any)?.bulk_mode,
    payment_terms_days_snapshot: (orderRow as any)?.payment_terms_days_snapshot,
    payment_terms_label_snapshot: (orderRow as any)?.payment_terms_label_snapshot,
    account_payment_terms_days: (pricingRow as any)?.payment_terms_days,
  });

  // Net-1 is only valid on VW bulk deposit orders; snapshot "1" on a non-bulk row is bad data.
  const corruptNet1OnNormalOrder =
    !orderBulk && Number.isFinite(termsDaysSnapshot) && termsDaysSnapshot === 1;

  // Match admin order page: regular orders never show "Net 0" from account pricing; bulk may use 0-day VW terms.
  const termsLabel = orderBulk
    ? pricingTermsLabel || `Net ${Number.isFinite(pricingTermsDays) ? pricingTermsDays : 0} (after delivery)`
    : corruptNet1OnNormalOrder
      ? pricingTermsLabel || `Net ${termsDays} (after delivery)`
      : termsLabelSnapshot ||
        (Number.isFinite(termsDaysSnapshot) && termsDaysSnapshot > 0 ? `Net ${termsDaysSnapshot} (after delivery)` : "") ||
        pricingTermsLabel ||
        `Net ${termsDaysFallback} (after delivery)`;

  const baseDateRaw =
    safeStr(shipShippedAt) || safeStr((invoice as any).issued_at) || safeStr((invoice as any).created_at);
  const baseDate = baseDateRaw ? new Date(baseDateRaw) : null;
  const dueDate = baseDate && !Number.isNaN(baseDate.getTime()) ? addDays(baseDate, termsDays) : null;
  const now = new Date();
  const isOverdue =
    !isVoided && remaining > 0 && !!dueDate && now.getTime() > (dueDate as Date).getTime();
  const overdueAmount = isOverdue ? remaining : 0;
  const daysPastDue = isOverdue && dueDate ? Math.ceil((now.getTime() - dueDate.getTime()) / 86400000) : 0;
  const dueInAWeek =
    !isVoided &&
    remaining > 0 &&
    !!dueDate &&
    now.getTime() <= (dueDate as Date).getTime() &&
    (dueDate as Date).getTime() <= now.getTime() + 7 * 86400000;

  const hasWirePendingVerification = submissions.some(
    (s) => safeUpper(s.method) === "WIRE" && safeUpper(s.status) === "WIRE_PENDING"
  );
  const orderIsPendingWire = safeUpper((orderRow as any)?.status) === "PENDING_WIRE";

  return (
    <main style={{ padding: 18, maxWidth: 1200, margin: "0 auto", display: "grid", gap: 16 }}>
      {hasWirePendingVerification || orderIsPendingWire ? (
        <div
          style={{
            borderRadius: 14,
            padding: "12px 14px",
            border: "1px solid rgba(245, 158, 11, 0.45)",
            background: "rgba(254, 243, 199, 0.35)",
            fontSize: 13,
            fontWeight: 800,
            color: "#78350f",
          }}
        >
          <div style={{ fontWeight: 950 }}>Wire payment pending verification</div>
          <div style={{ marginTop: 6, fontWeight: 700, opacity: 0.95 }}>
            Review the submission below (reference, amount, proof). When you verify wire, the payment is applied and
            the order updates from pending wire to paid / partially paid as appropriate.
          </div>
        </div>
      ) : null}
      {/* Header */}
      <div
        style={{
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(56,189,248,0.26)",
          background:
            "radial-gradient(900px 240px at 15% 10%, rgba(14,165,233,0.24), transparent 60%)," +
            "linear-gradient(180deg, #072238, #061218)",
          color: "white",
          boxShadow: "0 16px 36px rgba(15,23,42,0.12)",
        }}
      >
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.7, fontWeight: 900, textTransform: "uppercase" }}>
              Admin
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, color: "white" }}>
              <Link href="/admin/invoices" style={{ textDecoration: "none", fontWeight: 950, color: "white" }}>
                ← Invoices
              </Link>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 950, margin: "8px 0 0", color: "white" }}>
              {invNumber}
            </h1>
            <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ ...pill(String((invoice as any).status ?? "—")), background: "rgba(255,255,255,0.10)", color: "white" }}>
                {formatStatusLabel((invoice as any).status)}
              </span>
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                Order{" "}
                <Link
                  href={`/admin/orders/${encodeURIComponent(String(orderId))}`}
                  style={{ textDecoration: "none", fontWeight: 950, color: "white" }}
                >
                  {orderNumber}
                </Link>
              </span>
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                Account <b>{accountName}</b>
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 6, textAlign: "right", fontSize: 12, opacity: 0.85, color: "white" }}>
            <div>
              Issued: <b>{dateTime((invoice as any).issued_at)}</b>
            </div>
            {invoiceSentAt ? (
              <div>
                Last invoice email sent: <b>{dateTime(invoiceSentAt)}</b>
              </div>
            ) : null}
            <div>
              Voided: <b>{dateTime((invoice as any).voided_at)}</b>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 18px 18px", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {heroStat("Total", money(total))}
          {heroStat("Paid", money(amountPaid))}
          {heroStat("Outstanding", money(remaining))}
          {heroStat("Overdue", money(overdueAmount))}
          {heroStat("Items", items.length || 0)}
        </div>

      <OrderStatusFlow
        orderStatus={safeStr(orderRow?.status)}
        hasInvoice
        fulfillment={{
          ...flowSignals,
          pickedItems: pickedItemsDone,
          shippingConfirmationSent: shippingSent,
          shippingConfirmationSkipped: shippingSkipped,
          allFulfillmentsClosed,
        }}
        confirmedMeta={{
          accountName: accountNameForFlow,
          submittedName,
          submittedEmail,
        }}
        betweenLabel={
          openFulfillment?.id ? (
            <Link
              href={`/admin/fulfillments/${encodeURIComponent(String(openFulfillment.id))}`}
              style={{ fontWeight: 900, textDecoration: "none", color: "white" }}
            >
              Open fulfillment
            </Link>
          ) : flowFulfillment?.id ? (
            <Link
              href={`/admin/fulfillments/${encodeURIComponent(String(flowFulfillment.id))}`}
              style={{ fontWeight: 900, textDecoration: "none", color: "white" }}
            >
              Last fulfillment
            </Link>
          ) : (
            "No fulfillment"
          )
        }
        invoiceAction={
          <div style={{ display: "grid", gap: 6 }}>
            <Link
              href={`/api/admin/invoices/${encodeURIComponent(invoiceId)}/open`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.12)",
                color: "white",
                fontSize: 10,
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              View invoice
            </Link>
            {invoiceSent ? (
              <label
                style={{
                  display: "inline-flex",
                  gap: 6,
                  alignItems: "center",
                  fontSize: 10,
                  fontWeight: 900,
                  color: "rgba(34,197,94,0.95)",
                }}
              >
                <input type="checkbox" checked readOnly style={{ accentColor: "#22c55e", transform: "translateY(0.5px)" }} />
                Invoice sent
              </label>
            ) : null}
            {emailsSentList.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, opacity: 0.9, color: "white" }}>
                {[...emailsSentList]
                  .sort((a: any, b: any) => (a?.at || "").localeCompare(b?.at || ""))
                  .map((e: any, i: number) => (
                    <div key={i}>
                      {String(e?.type || "").toLowerCase() === "invoice" ? "Invoice sent" : "Reminder sent"} – {dateTime(e?.at)}
                    </div>
                  ))}
              </div>
            ) : null}
            <form
              method="POST"
              action={`/api/admin/orders/${encodeURIComponent(String(orderId))}/email-invoice`}
            >
              <input type="hidden" name="to_email" value={billingEmail} />
              <button
                type="submit"
                disabled={!billingEmail || invoiceSent}
                title={billingEmail ? `Send to ${billingEmail}` : "No customer email on file"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: invoiceSent ? "1px solid rgba(34,197,94,0.8)" : "1px solid #0b5cab",
                  background: invoiceSent ? "rgba(34,197,94,0.95)" : "#0b5cab",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 900,
                  textDecoration: "none",
                  cursor: billingEmail && !invoiceSent ? "pointer" : "not-allowed",
                  opacity: billingEmail && !invoiceSent ? 1 : 0.6,
                  animation: !invoiceSent && invoiceId ? "order-flow-cta 1.6s ease-in-out infinite" : undefined,
                }}
              >
                {invoiceSent ? "Invoice sent" : "Send invoice"}
              </button>
            </form>
            {!isVoided && remaining > 0 ? (
              <form method="POST" action={`/api/admin/invoices/${encodeURIComponent(invoiceId)}/email-reminder`}>
                <input type="hidden" name="to_email" value={billingEmail} />
                <button
                  type="submit"
                  disabled={!billingEmail}
                  title={
                    billingEmail
                      ? `Friendly reminder: invoice due ${dueDate ? (dueDate as Date).toLocaleDateString() : ""}`
                      : "No customer email on file"
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(245,158,11,0.9)",
                    background: "rgba(245,158,11,0.9)",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 900,
                    cursor: billingEmail ? "pointer" : "not-allowed",
                    opacity: billingEmail ? 1 : 0.6,
                    animation:
                      billingEmail && (dueInAWeek || isOverdue) ? "order-flow-cta 1.6s ease-in-out infinite" : undefined,
                  }}
                >
                  Send reminder
                </button>
              </form>
            ) : null}
          </div>
        }
        shippingAction={
          <ShippingConfirmAction
            actionUrl={`/api/admin/orders/${encodeURIComponent(orderId)}/email-shipping`}
            enabled={canEmailShipping}
            onDark
            sent={shippingSent}
            skipped={shippingSkipped}
            pulse={!!openFulfillment && !shippingConfirmed}
          />
        }
        invoiceSummary={{
          sent: invoiceSent,
          total: money(total),
          paid: money(amountPaid),
          outstanding: money(remaining),
          overdue: dueDate
            ? isOverdue
              ? `Overdue ${money(overdueAmount)} • Due ${dueDate.toLocaleDateString()}`
              : `Due ${money(remaining)} • ${dueDate.toLocaleDateString()}`
            : undefined,
        }}
      />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 420px)",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* Left: invoice lines */}
        <div style={card()}>
          <div style={cardHeader()}>Invoice Lines (with serials)</div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
                  <th style={{ padding: 12 }}>Description</th>
                  <th style={{ padding: 12 }}>Qty</th>
                  <th style={{ padding: 12 }}>Unit</th>
                  <th style={{ padding: 12 }}>Unit Price</th>
                  <th style={{ padding: 12 }}>Line Total</th>
                  <th style={{ padding: 12 }}>Serials / Lots</th>
                </tr>
              </thead>
              <tbody>
                {(items ?? []).map((it: any) => {
                  const oiId = safeStr(it.order_item_id);
                  const vId = safeStr(it.product_variant_id);

                  const serials =
                    (oiId && serialsByOrderItem.get(oiId)) || (vId && serialsByVariant.get(vId)) || [];

                  return (
                    <tr key={String(it.id)} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                      <td style={{ padding: 12, fontWeight: 900 }}>{it.description}</td>
                      <td style={{ padding: 12, fontWeight: 900 }}>{safeNum(it.quantity) || 0}</td>
                      <td style={{ padding: 12, opacity: 0.85 }}>{it.uom ?? "Units"}</td>
                      <td style={{ padding: 12, fontWeight: 900 }}>{money(it.unit_price)}</td>
                      <td style={{ padding: 12, fontWeight: 950 }}>{money(it.line_total)}</td>
                      <td style={{ padding: 12, fontSize: 12, opacity: 0.9, whiteSpace: "pre-wrap" }}>
                        {serials.length ? serials.join(", ") : "—"}
                      </td>
                    </tr>
                  );
                })}

                {(items ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 18, opacity: 0.75 }}>
                      No invoice lines.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right rail */}
        <div style={{ display: "grid", gap: 14 }}>
          {/* Payment KPIs */}
          <div style={card()}>
            <div style={cardHeader()}>Payment status</div>
            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Paid</div>
                  <div style={{ fontWeight: 950 }}>{money(amountPaid)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Outstanding</div>
                  <div style={{ fontWeight: 950 }}>{money(remaining)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Overdue</div>
                  <div style={{ fontWeight: 950, color: isOverdue ? "crimson" : undefined }}>{money(overdueAmount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Days past due</div>
                  <div style={{ fontWeight: 950 }}>{isOverdue ? daysPastDue : "—"}</div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 10, display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Terms</div>
                <div style={{ fontWeight: 950 }}>{termsLabel}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Due date: <b>{dueDate ? dateTime(dueDate.toISOString()) : "—"}</b>
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Based on: <b>{baseDate ? dateTime(baseDate.toISOString()) : "—"}</b> (shipment when available)
                </div>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div style={card()}>
            <div style={cardHeader()}>Customer & Order</div>
            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Account</div>
                <div style={{ fontWeight: 950 }}>{accountName}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{resolvedAccountId ? resolvedAccountId.slice(0, 8) + "…" : "—"}</div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Order</div>
                <Link
                  href={`/admin/orders/${encodeURIComponent(String(orderId))}`}
                  style={{ textDecoration: "none", fontWeight: 950, color: "#111" }}
                >
                  {orderNumber}
                </Link>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Billing</div>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.85 }}>
                  {prettyAddress((orderRow as any)?.invoice_address)}
                </pre>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Shipping</div>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.85 }}>
                  {prettyAddress((orderRow as any)?.delivery_address)}
                </pre>
              </div>
            </div>
          </div>

          {/* Status & Payments */}
          <div style={{ ...card(), overflow: "visible" }}>
            <div style={cardHeader()}>Invoice Status & Payments</div>

            <div
              style={{
                padding: 12,
                paddingBottom: 18,
                display: "grid",
                gap: 12,
              }}
            >
              <form
                action={`/api/admin/invoices/${encodeURIComponent(invoiceId)}/status`}
                method="post"
                style={{ display: "grid", gap: 8 }}
              >
                <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.8 }}>Status</div>

                <select
                  name="status"
                  defaultValue={String((invoice as any).status || "DRAFT")}
                  disabled={isVoided}
                  style={selectStyle(isVoided)}
                >
                  <option value="DRAFT">{formatStatusLabel("DRAFT")}</option>
                  <option value="ISSUED">{formatStatusLabel("ISSUED")}</option>
                  <option value="PARTIALLY_PAID">{formatStatusLabel("PARTIALLY_PAID")}</option>
                  <option value="PAID">{formatStatusLabel("PAID")}</option>
                  <option value="VOID">{formatStatusLabel("VOID")}</option>
                </select>

                <button type="submit" style={buttonStyle({ disabled: isVoided })} disabled={isVoided}>
                  Update Status
                </button>

                {isVoided ? (
                  <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>
                    This invoice is voided. Status and payments are locked.
                  </div>
                ) : null}
              </form>

              <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />

              <AdminInvoiceStripePayClient
                invoiceId={invoiceId}
                remaining={remaining}
                accountName={accountName}
                disabled={isVoided}
              />

              <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.8 }}>Apply Payment</div>

                <form
                  action={`/api/admin/invoices/${encodeURIComponent(invoiceId)}/payment`}
                  method="post"
                  style={{ display: "grid", gap: 8 }}
                >
                  <input
                    name="add_payment"
                    inputMode="decimal"
                    placeholder="Amount (e.g. 250.00)"
                    disabled={isVoided}
                    style={inputStyle(isVoided)}
                  />
                  <input
                    name="note"
                    placeholder="Note (optional)"
                    disabled={isVoided}
                    style={inputStyle(isVoided)}
                  />

                  <button type="submit" style={buttonStyle({ disabled: isVoided })} disabled={isVoided}>
                    Apply Payment
                  </button>
                </form>

                <form
                  action={`/api/admin/invoices/${encodeURIComponent(invoiceId)}/payment`}
                  method="post"
                  style={{ display: "grid", gap: 8 }}
                >
                  <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.8 }}>Set total paid</div>
                  <input
                    name="amount_paid"
                    inputMode="decimal"
                    placeholder="Total paid (e.g. 750.00)"
                    disabled={isVoided}
                    style={inputStyle(isVoided)}
                  />
                  <button type="submit" style={buttonStyle({ disabled: isVoided })} disabled={isVoided}>
                    Update Total Paid
                  </button>
                </form>

                <div style={{ display: "grid", gap: 6, marginTop: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ opacity: 0.75, fontWeight: 900 }}>Paid</div>
                    <div style={{ fontWeight: 950 }}>{money(amountPaid)}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ opacity: 0.75, fontWeight: 900 }}>Remaining</div>
                    <div style={{ fontWeight: 950 }}>{money(remaining)}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ opacity: 0.75, fontWeight: 900 }}>Stripe</div>
                    <div style={{ fontWeight: 950 }}>{money(stripePaid)}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ opacity: 0.75, fontWeight: 900 }}>Wire</div>
                    <div style={{ fontWeight: 950 }}>{money(wirePaid)}</div>
                  </div>

                </div>

                {submissions.length ? (
                  <div id="wire-payments" style={{ marginTop: 12, borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85, marginBottom: 8 }}>
                      Payment Submissions
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {submissions.slice(0, 12).map((s: any) => {
                        const status = safeUpper(s.status);
                        const methodU = safeUpper(s.method || "");
                        const isWireAwaitingVerify =
                          (status === "PENDING" || status === "WIRE_PENDING") && methodU === "WIRE";
                        return (
                          <div
                            key={String(s.id)}
                            style={{
                              padding: 10,
                              borderRadius: 12,
                              border: "1px solid rgba(0,0,0,0.10)",
                              background: "rgba(0,0,0,0.01)",
                              display: "grid",
                              gap: 8,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ fontWeight: 950 }}>
                                {safeUpper(s.method || "WIRE")} · {money(s.amount)}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.75 }}>{dateTime(s.sent_at || s.created_at)}</div>
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>
                              Status: <b>{formatStatusLabel(s.status)}</b>
                              {safeStr((s as any).stripe_payment_intent_status) ? (
                                <>
                                  {" "}
                                  · Stripe: <b>{safeStr((s as any).stripe_payment_intent_status)}</b>
                                </>
                              ) : null}
                              {safeStr(s.reference) ? ` · Ref: ${safeStr(s.reference)}` : ""}
                            </div>
                            {safeStr(s.note) ? <div style={{ fontSize: 12, opacity: 0.75 }}>{safeStr(s.note)}</div> : null}
                            {safeStr((s as any).proofUrl) ? (
                              <div style={{ fontSize: 12 }}>
                                <a
                                  href={safeStr((s as any).proofUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontWeight: 950, color: "#1565c0" }}
                                >
                                  View wire proof
                                </a>
                              </div>
                            ) : null}

                            {isWireAwaitingVerify && !isVoided ? (
                              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
                                <form
                                  action={`/api/admin/invoices/${encodeURIComponent(invoiceId)}/wire-submissions/${encodeURIComponent(
                                    String(s.id)
                                  )}/approve`}
                                  method="post"
                                >
                                  <button type="submit" style={buttonStyle()}>
                                    Verify wire
                                  </button>
                                </form>
                                <form
                                  action={`/api/admin/invoices/${encodeURIComponent(invoiceId)}/wire-submissions/${encodeURIComponent(
                                    String(s.id)
                                  )}/reject`}
                                  method="post"
                                >
                                  <button type="submit" style={buttonStyle({ tone: "muted" })}>
                                    Reject
                                  </button>
                                </form>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {payments.length ? (
                  <div style={{ marginTop: 10, borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85, marginBottom: 8 }}>
                      Payment History
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {payments.slice(0, 8).map((p: any) => (
                        <div
                          key={String(p.id)}
                          style={{
                            padding: 10,
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,0.10)",
                            background: "rgba(0,0,0,0.01)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ fontWeight: 950 }}>{money(p.amount)}</div>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>{dateTime(p.created_at)}</div>
                          </div>
                          {safeStr(p.note) ? (
                            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>{safeStr(p.note)}</div>
                          ) : null}
                          <div style={{ marginTop: 8 }}>
                            <form
                              action={`/api/admin/invoices/${encodeURIComponent(invoiceId)}/payment/${encodeURIComponent(
                                String(p.id)
                              )}/delete`}
                              method="post"
                            >
                              <button type="submit" style={buttonStyle()}>
                                Remove payment
                              </button>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Documents */}
          <div style={card()}>
            <div style={cardHeader()}>Invoice PDF</div>
            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              <form
                action={`/api/admin/invoices/${encodeURIComponent(invoiceId)}/pdf`}
                method="post"
                style={{ display: "grid", gap: 8 }}
              >
                <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                  Regenerate the PDF any time shipping/serials change.
                </div>
                <button type="submit" style={buttonStyle({ disabled: isVoided })} disabled={isVoided}>
                  Generate / Refresh Invoice PDF
                </button>
              </form>

              <InvoicePdfActionsClient invoiceId={invoiceId} hasPdfPath={hasPdfPath} />

              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Bucket: <b>{pdfBucket || "—"}</b>
                <br />
                Path:{" "}
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{pdfPath || "—"}</span>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div style={card()}>
            <div style={cardHeader()}>Totals</div>

            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ opacity: 0.75, fontWeight: 900 }}>Untaxed Amount</div>
                <div style={{ fontWeight: 950 }}>{money((invoice as any).subtotal)}</div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ opacity: 0.75, fontWeight: 900 }}>Shipping</div>
                  {showShippingPerFulfillmentNote && Number((invoice as any).shipping_total ?? 0) > 0 ? (
                    <div style={{ fontSize: 11, opacity: 0.65, fontWeight: 700, marginTop: 4 }}>
                      Invoiced separately per fulfillment
                    </div>
                  ) : null}
                </div>
                <div style={{ fontWeight: 950 }}>{money((invoice as any).shipping_total)}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ opacity: 0.75, fontWeight: 900 }}>Tax</div>
                <div style={{ fontWeight: 950 }}>{money((invoice as any).tax)}</div>
              </div>

              <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ opacity: 0.75, fontWeight: 950 }}>Total</div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>{money((invoice as any).total)}</div>
              </div>
            </div>
          </div>

          {/* Shipment */}
          <div style={card()}>
            <div style={cardHeader()}>Shipment (from fulfillments)</div>
            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Showing:{" "}
                {bestFulfillment?.id ? (
                  <Link
                    href={`/admin/fulfillments/${encodeURIComponent(String(bestFulfillment.id))}`}
                    style={{ fontWeight: 950, textDecoration: "none" }}
                  >
                    {String(bestFulfillment.id).slice(0, 8)}…
                  </Link>
                ) : (
                  "—"
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ opacity: 0.75, fontWeight: 900 }}>Carrier</div>
                <div style={{ fontWeight: 950 }}>{shipCarrier || "—"}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ opacity: 0.75, fontWeight: 900 }}>Tracking</div>
                <div style={{ fontWeight: 950 }}>
                  {shipTracking ? (
                    trackingLink ? (
                      <a
                        href={trackingLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: "none", fontWeight: 950 }}
                      >
                        {shipTracking}
                      </a>
                    ) : (
                      shipTracking
                    )
                  ) : shipNoTracking ? (
                    "No tracking"
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ opacity: 0.75, fontWeight: 900 }}>Shipped</div>
                <div style={{ fontWeight: 950 }}>{dateTime(shipShippedAt)}</div>
              </div>

              <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>
                Shipment edits live on the fulfillment page (invoice only displays what exists).
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
