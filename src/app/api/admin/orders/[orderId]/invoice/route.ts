import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { computeInvoiceDisplayTotalSqcm } from "@/lib/billing/invoiceOrderTotalSqcm";
import { renderInvoicePdf, type InvoiceLine } from "@/lib/billing/renderInvoicePdf";
import { getInvoiceWireInstructionsText } from "@/lib/billing/invoiceWireInstructions";
import { schedulePartnerFulfillmentSync } from "@/lib/integrations/outbound/schedulePartnerFulfillmentSync";
import { buildVirtualWarehouseInvoiceNotes } from "@/lib/virtualWarehouse/invoicePdfNotes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Strict UUID v1–v5
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normId(v: unknown): string {
  const s = String(v ?? "").trim();
  return UUID_RE.test(s) ? s : "";
}

async function getOrderId(ctx: unknown): Promise<string> {
  const c = ctx as { params?: any };
  const p = c?.params;
  const resolved = typeof p?.then === "function" ? await p : p;
  return normId(resolved?.orderId);
}

function safeObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function todayYMD(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function nextInvoiceNumberLike(): string {
  const t = Date.now().toString().slice(-6);
  return `INV-${t}`;
}

function mergeMeta(prior: unknown, patch: unknown) {
  const p = prior && typeof prior === "object" ? (prior as Record<string, unknown>) : {};
  const q = patch && typeof patch === "object" ? (patch as Record<string, unknown>) : {};
  return { ...p, ...q };
}

function wantsJson(req: Request): boolean {
  const accept = (req.headers.get("accept") || "").toLowerCase();
  const xrw = (req.headers.get("x-requested-with") || "").toLowerCase();
  return accept.includes("application/json") || xrw === "xmlhttprequest";
}

function safeFileToken(raw: string): string {
  return raw.replace(/[^\w\-]/g, "_").slice(0, 80) || "INVOICE";
}

function uniqPush(map: Map<string, string[]>, key: string, val: string) {
  const k = s(key);
  const v = s(val);
  if (!k || !v) return;
  const cur = map.get(k) ?? [];
  if (!cur.includes(v)) cur.push(v);
  map.set(k, cur);
}

type OrderItemRow = {
  id: string;
  product_variant_id: string | null;
  description: string | null;
  quantity: number | string | null;
  uom: string | null;
  unit_price: number | string | null;
  discount_percent: number | string | null;
  line_total: number | string | null;
  line_type: string | null;
  sort_order: number | null;
};

async function buildSerialMapsForOrder(orderId: string) {
  const serialsByOrderItem = new Map<string, string[]>();
  const serialsByVariant = new Map<string, string[]>();

  const { data: fulfillsRaw, error: fErr } = await supabaseAdmin
    .from("fulfillments")
    .select("id, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (fErr) throw new Error(fErr.message);

  const fulfillments = Array.isArray(fulfillsRaw) ? fulfillsRaw : [];
  const fulfillmentIds = fulfillments.map((f: any) => s(f.id)).filter((x) => UUID_RE.test(x));

  if (!fulfillmentIds.length) {
    return { serialsByOrderItem, serialsByVariant };
  }

  const { data: fiRaw, error: fiErr } = await supabaseAdmin
    .from("fulfillment_items")
    .select("id, order_item_id, variant_id, fulfillment_id")
    .in("fulfillment_id", fulfillmentIds as any)
    .limit(20000);

  if (fiErr) throw new Error(fiErr.message);

  const fi = Array.isArray(fiRaw) ? fiRaw : [];
  const fiIdToOrderItem = new Map<string, string>();
  const fiIdToVariant = new Map<string, string>();

  for (const r of fi) {
    const fiId = s((r as any).id);
    if (!UUID_RE.test(fiId)) continue;

    const oiId = s((r as any).order_item_id);
    const vId = s((r as any).variant_id);

    if (UUID_RE.test(oiId)) fiIdToOrderItem.set(fiId, oiId);
    if (UUID_RE.test(vId)) fiIdToVariant.set(fiId, vId);
  }

  // A) fulfillment_item_trace
  const fiIds = Array.from(fiIdToOrderItem.keys());
  if (fiIds.length) {
    const { data: trRaw, error: trErr } = await supabaseAdmin
      .from("fulfillment_item_trace")
      .select("fulfillment_item_id, variant_id, serial_number, lot_number")
      .in("fulfillment_item_id", fiIds as any)
      .limit(50000);

    if (trErr) throw new Error(trErr.message);

    const tr = Array.isArray(trRaw) ? trRaw : [];
    for (const r of tr) {
      const fiId = s((r as any).fulfillment_item_id);
      const oiId = fiIdToOrderItem.get(fiId) || "";
      const vId = s((r as any).variant_id) || fiIdToVariant.get(fiId) || "";
      const serial = s((r as any).serial_number);
      const lot = s((r as any).lot_number);

      if (UUID_RE.test(oiId)) {
        if (serial) uniqPush(serialsByOrderItem, oiId, serial);
        else if (lot) uniqPush(serialsByOrderItem, oiId, `LOT:${lot}`);
      }
      if (UUID_RE.test(vId)) {
        if (serial) uniqPush(serialsByVariant, vId, serial);
        else if (lot) uniqPush(serialsByVariant, vId, `LOT:${lot}`);
      }
    }
  }

  // B) fulfillment_picks -> product_variant_lots
  const { data: picksRaw, error: picksErr } = await supabaseAdmin
    .from("fulfillment_picks")
    .select("fulfillment_item_id, variant_id, lot_row_id, is_undo")
    .in("fulfillment_id", fulfillmentIds as any)
    .eq("is_undo", false)
    .limit(50000);

  if (picksErr) throw new Error(picksErr.message);

  const picks = Array.isArray(picksRaw) ? picksRaw : [];
  const lotRowIds = Array.from(
    new Set(
      picks
        .map((p: any) => s(p?.lot_row_id))
        .filter((x) => UUID_RE.test(x))
    )
  );

  const lotsById = new Map<string, { serial_number: string; lot_number: string }>();
  if (lotRowIds.length) {
    const { data: lotsRaw, error: lotsErr } = await supabaseAdmin
      .from("product_variant_lots")
      .select("id, serial_number, lot_number")
      .in("id", lotRowIds as any)
      .limit(50000);

    if (lotsErr) throw new Error(lotsErr.message);

    const lots = Array.isArray(lotsRaw) ? lotsRaw : [];
    for (const l of lots) {
      const id = s((l as any).id);
      if (!UUID_RE.test(id)) continue;
      lotsById.set(id, {
        serial_number: s((l as any).serial_number),
        lot_number: s((l as any).lot_number),
      });
    }
  }

  for (const p of picks) {
    const fiId = s((p as any).fulfillment_item_id);
    const oiId = fiIdToOrderItem.get(fiId) || "";
    const vId = s((p as any).variant_id) || fiIdToVariant.get(fiId) || "";
    const lotRowId = s((p as any).lot_row_id);
    if (!UUID_RE.test(lotRowId)) continue;

    const lot = lotsById.get(lotRowId);
    if (!lot) continue;

    const serial = s(lot.serial_number);
    const lotNumber = s(lot.lot_number);

    if (UUID_RE.test(oiId)) {
      if (serial) uniqPush(serialsByOrderItem, oiId, serial);
      else if (lotNumber) uniqPush(serialsByOrderItem, oiId, `LOT:${lotNumber}`);
    }
    if (UUID_RE.test(vId)) {
      if (serial) uniqPush(serialsByVariant, vId, serial);
      else if (lotNumber) uniqPush(serialsByVariant, vId, `LOT:${lotNumber}`);
    }
  }

  return { serialsByOrderItem, serialsByVariant };
}

export async function POST(req: Request, ctx: unknown) {
  const authCtx: any = await requireOrdersStaffOrAdmin();

  const orderId = await getOrderId(ctx);
  if (!orderId) return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });

  const url = new URL(req.url);
  const rebuildLines = url.searchParams.get("rebuild_lines") === "1";

  // 1) Load order (NOTE: tax might be on orders; ok to select it. Your error was invoices.tax.)
  const { data: order, error: oErr } = await supabaseAdmin
    .from("orders")
    .select(
      "id, account_id, order_number, subtotal, shipping_total, total, discount_percent_snapshot, payment_terms_label_snapshot, payment_terms_days_snapshot, invoice_address, delivery_address, bulk_mode"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (oErr) return NextResponse.json({ ok: false, error: oErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  const accountId = normId((order as any).account_id);
  if (!accountId) return NextResponse.json({ ok: false, error: "Order is missing account_id" }, { status: 400 });

  const billingAddr = safeObj((order as any).invoice_address) || null;

  const deliveryAddr = safeObj((order as any).delivery_address) || null;

  // 2) Load existing invoice (one per order)
  const { data: existingInvoice, error: invFindErr } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_number, metadata")
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_PRIMARY)
    .maybeSingle();

  if (invFindErr) return NextResponse.json({ ok: false, error: invFindErr.message }, { status: 500 });

  const priorMeta =
    existingInvoice?.metadata && typeof existingInvoice.metadata === "object"
      ? (existingInvoice.metadata as Record<string, unknown>)
      : {};

  const priorPdf: any =
    (priorMeta as any)?.invoice_pdf && typeof (priorMeta as any).invoice_pdf === "object"
      ? (priorMeta as any).invoice_pdf
      : null;

  const invoiceNumber =
    s((existingInvoice as any)?.invoice_number) ||
    s(priorPdf?.number) ||
    s((priorMeta as any)?.invoice_pdf_number) ||
    nextInvoiceNumberLike();

  // 3) Upsert invoice row (NO invoices.tax!)
  const upsertPayload: any = {
    order_id: orderId,
    account_id: accountId,
    invoice_kind: INVOICE_KIND_PRIMARY,
    invoice_number: invoiceNumber,
    invoice_address: billingAddr,
    delivery_address: deliveryAddr,
    discount_percent_snapshot: safeNum((order as any).discount_percent_snapshot ?? 0),
    payment_terms_label_snapshot: (order as any).payment_terms_label_snapshot ?? null,
    payment_terms_days_snapshot: (order as any).payment_terms_days_snapshot ?? null,
    subtotal: (order as any).subtotal != null ? safeNum((order as any).subtotal) : null,
    shipping_total: (order as any).shipping_total != null ? safeNum((order as any).shipping_total) : null,
    total: (order as any).total != null ? safeNum((order as any).total) : null,
    created_by_user_id: normId(authCtx?.user?.id) || null,
    metadata: priorMeta,
  };

  let savedInvoice: { id?: string; invoice_number?: string; metadata?: unknown } | null = null;
  let invSaveErr: { message: string } | null = null;

  const existingId = normId((existingInvoice as any)?.id);
  if (existingId) {
    const up = await supabaseAdmin
      .from("invoices")
      .update(upsertPayload)
      .eq("id", existingId)
      .select("id, invoice_number, metadata")
      .maybeSingle();
    savedInvoice = up.data as any;
    invSaveErr = up.error as any;
  } else {
    const ins = await supabaseAdmin.from("invoices").insert(upsertPayload).select("id, invoice_number, metadata").maybeSingle();
    savedInvoice = ins.data as any;
    invSaveErr = ins.error as any;
  }

  if (invSaveErr) return NextResponse.json({ ok: false, error: invSaveErr.message }, { status: 500 });

  const invoiceId = normId(savedInvoice?.id) || normId(existingInvoice?.id);
  if (!invoiceId) return NextResponse.json({ ok: false, error: "Failed to resolve invoiceId" }, { status: 500 });

  // 4) Rebuild invoice_items if requested
  if (rebuildLines) {
    const del = await supabaseAdmin.from("invoice_items").delete().eq("invoice_id", invoiceId);
    if (del.error) return NextResponse.json({ ok: false, error: del.error.message }, { status: 500 });
  }

  // 5) Ensure invoice_items snapshot exists (with product_variant_id)
  const { data: anyLine, error: anyLineErr } = await supabaseAdmin
    .from("invoice_items")
    .select("id")
    .eq("invoice_id", invoiceId)
    .limit(1);

  if (anyLineErr) return NextResponse.json({ ok: false, error: anyLineErr.message }, { status: 500 });

  const hasAnyLines = Array.isArray(anyLine) && anyLine.length > 0;

  if (!hasAnyLines) {
    const { data: orderItems, error: oiErr } = await supabaseAdmin
      .from("order_items")
      .select("id, product_variant_id, description, quantity, uom, unit_price, discount_percent, line_total, line_type, sort_order")
      .eq("order_id", orderId)
      .order("sort_order", { ascending: true });

    if (oiErr) return NextResponse.json({ ok: false, error: oiErr.message }, { status: 500 });

    const rows = (orderItems ?? []) as unknown as OrderItemRow[];

    const payload = rows
      .map((r) => {
        const qty = safeNum(r.quantity);
        if (qty <= 0) return null;

        const pv = normId(r.product_variant_id);

        return {
          invoice_id: invoiceId,
          order_item_id: normId(r.id) || null,
          product_variant_id: pv || null,
          description: s(r.description) || "Item",
          quantity: qty,
          uom: s(r.uom) || "Units",
          unit_price: safeNum(r.unit_price),
          discount_percent: safeNum(r.discount_percent),
          line_total: r.line_total != null ? safeNum(r.line_total) : null,
          line_type: s(r.line_type) || "PRODUCT",
          sort_order: Number.isFinite(Number(r.sort_order)) ? Number(r.sort_order) : 0,
        };
      })
      .filter(Boolean) as any[];

    if (!payload.length) {
      return NextResponse.json({ ok: false, error: "No invoice lines found (order_items empty)." }, { status: 400 });
    }

    const ins = await supabaseAdmin.from("invoice_items").insert(payload);
    if (ins.error) return NextResponse.json({ ok: false, error: ins.error.message }, { status: 500 });
  }

  // 6) Load invoice_items for PDF + join keys
  const { data: invItems, error: invItemsErr } = await supabaseAdmin
    .from("invoice_items")
    .select("description, quantity, uom, unit_price, sort_order, order_item_id, product_variant_id")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true })
    .limit(2000);

  if (invItemsErr) return NextResponse.json({ ok: false, error: invItemsErr.message }, { status: 500 });

  // 7) Serial maps (best-effort)
  let serialsByOrderItem = new Map<string, string[]>();
  let serialsByVariant = new Map<string, string[]>();
  try {
    const maps = await buildSerialMapsForOrder(orderId);
    serialsByOrderItem = maps.serialsByOrderItem;
    serialsByVariant = maps.serialsByVariant;
  } catch {
    // ignore
  }

  const lines: InvoiceLine[] = (invItems ?? [])
    .map((r: any): InvoiceLine | null => {
      const qty = safeNum(r.quantity);
      if (qty <= 0) return null;

      const oiId = normId(r.order_item_id);
      const pvId = normId(r.product_variant_id);

      const serials =
        (oiId ? serialsByOrderItem.get(oiId) : null) ||
        (pvId ? serialsByVariant.get(pvId) : null) ||
        null;

      return {
        description: s(r.description) || "Item",
        qty,
        uom: s(r.uom) || "Units",
        unit_price: safeNum(r.unit_price),
        serials: serials && serials.length ? serials : null,
      };
    })
    .filter(Boolean) as InvoiceLine[];

  // Totals (tax handled as 0 unless you later add it)
  const subtotal = (order as any).subtotal != null ? safeNum((order as any).subtotal) : null;
  const shipping = (order as any).shipping_total != null ? safeNum((order as any).shipping_total) : null;
  const total = (order as any).total != null ? safeNum((order as any).total) : null;
  let totalSqcm = 0;
  try {
    totalSqcm = await computeInvoiceDisplayTotalSqcm(supabaseAdmin, orderId);
  } catch {
    totalSqcm = 0;
  }

  const footerNotes = await buildVirtualWarehouseInvoiceNotes(supabaseAdmin as any, orderId);

  // 8) Render PDF (tax=0)
  const pdfBytes = await renderInvoicePdf({
    invoiceNumber,
    orderNumber: s((order as any).order_number) || null,
    orderDateISO: todayYMD(),
    totalSqcm,
    totalSqcmCaption: (order as any).bulk_mode ? "Bulk purchase (sq cm)" : null,
    billTo: billingAddr,
    shipTo: deliveryAddr,
    lines,
    subtotal,
    tax: 0,
    shipping,
    total,
    amountPaid: 0,
    shippingInvoicedPerFulfillment: !!(order as any).bulk_mode,
    footerNotes: footerNotes.length ? footerNotes : null,
    wireInstructions: getInvoiceWireInstructionsText(),
    brand: {
      companyName: "360 Medical",
      addressLines: ["3900 N. 10th St. Suite 1050", "McAllen, TX 78501", "United States"],
      email: "info@360medical.net",
      website: "http://www.360medical.net",
    },
  });

  // 9) Upload PDF
  const bucket = "order-private";
  const safeInv = safeFileToken(invoiceNumber);
  const objectPath = `invoices/${orderId}/INVOICE-${safeInv}.pdf`;

  const up = await supabaseAdmin.storage.from(bucket).upload(objectPath, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (up.error) return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });

  const now = new Date().toISOString();

  // 10) Save metadata
  const nextMeta = mergeMeta(savedInvoice?.metadata ?? priorMeta, {
    invoice_pdf: { number: invoiceNumber, bucket, path: objectPath, created_at: now },
    invoice_pdf_bucket: bucket,
    invoice_pdf_path: objectPath,
    invoice_pdf_generated_at: now,
    invoice_pdf_includes_serials: true,
  });

  const { error: metaErr } = await supabaseAdmin.from("invoices").update({ metadata: nextMeta }).eq("id", invoiceId);
  if (metaErr) return NextResponse.json({ ok: false, error: metaErr.message }, { status: 500 });

  // 11) Backfill fulfillments.invoice_id (best-effort)
  try {
    await supabaseAdmin
      .from("fulfillments")
      .update({ invoice_id: invoiceId } as any)
      .eq("order_id", orderId)
      .is("invoice_id", null);
  } catch {
    // ignore
  }

  await schedulePartnerFulfillmentSync(supabaseAdmin, orderId);

  const invoiceDetailUrl = urlFromRequest(req, `/admin/invoices/${encodeURIComponent(invoiceId)}?ok=1`);

  if (!wantsJson(req)) {
    return NextResponse.redirect(invoiceDetailUrl, { status: 303 });
  }

  return NextResponse.json({
    ok: true,
    invoice: { id: invoiceId, number: invoiceNumber, bucket, path: objectPath },
  });
}
