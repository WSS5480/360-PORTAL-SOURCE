import type { SupabaseClient } from "@supabase/supabase-js";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { computeInvoiceDisplayTotalSqcm } from "@/lib/billing/invoiceOrderTotalSqcm";
import { renderInvoicePdf, type InvoiceLine } from "@/lib/billing/renderInvoicePdf";
import { getInvoiceWireInstructionsText } from "@/lib/billing/invoiceWireInstructions";
import { buildVirtualWarehouseInvoiceNotes } from "@/lib/virtualWarehouse/invoicePdfNotes";
import { schedulePartnerFulfillmentSync } from "@/lib/integrations/outbound/schedulePartnerFulfillmentSync";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normId(v: unknown): string {
  const s = String(v ?? "").trim();
  return UUID_RE.test(s) ? s : "";
}

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function mergeMeta(prior: unknown, patch: unknown) {
  const p = prior && typeof prior === "object" ? (prior as Record<string, unknown>) : {};
  const q = patch && typeof patch === "object" ? (patch as Record<string, unknown>) : {};
  return { ...p, ...q };
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

function safeFileToken(raw: string): string {
  return raw.replace(/[^\w\-]/g, "_").slice(0, 80) || "INVOICE";
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

/**
 * Portal: upsert invoice + snapshot lines + PDF for a draft order (virtual-warehouse bulk prepayment flow).
 */
export async function issuePortalInvoiceForOrder(
  sb: SupabaseClient,
  orderId: string,
  createdByUserId: string | null
): Promise<{ ok: true; invoiceId: string } | { ok: false; error: string }> {
  const oid = normId(orderId);
  if (!oid) return { ok: false, error: "Invalid orderId" };

  const { data: order, error: oErr } = await sb
    .from("orders")
    .select(
      "id, account_id, order_number, subtotal, shipping_total, total, discount_percent_snapshot, payment_terms_label_snapshot, payment_terms_days_snapshot, invoice_address, delivery_address, bulk_mode"
    )
    .eq("id", oid)
    .maybeSingle();

  if (oErr) return { ok: false, error: oErr.message };
  if (!order) return { ok: false, error: "Order not found" };

  const accountId = normId((order as any).account_id);
  if (!accountId) return { ok: false, error: "Order is missing account_id" };

  const billingAddr = safeObj((order as any).invoice_address) || null;
  const deliveryAddr = safeObj((order as any).delivery_address) || null;

  const { data: existingInvoice, error: invFindErr } = await sb
    .from("invoices")
    .select("id, invoice_number, metadata")
    .eq("order_id", oid)
    .eq("invoice_kind", INVOICE_KIND_PRIMARY)
    .maybeSingle();

  if (invFindErr) return { ok: false, error: invFindErr.message };

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

  const upsertPayload: any = {
    order_id: oid,
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
    created_by_user_id: normId(createdByUserId) || null,
    metadata: priorMeta,
    status: "ISSUED",
    issued_at: new Date().toISOString(),
  };

  let savedInvoice: { id?: string; invoice_number?: string; metadata?: unknown } | null = null;
  let invSaveErr: { message: string } | null = null;

  if (normId((existingInvoice as any)?.id)) {
    const up = await sb
      .from("invoices")
      .update(upsertPayload)
      .eq("id", normId((existingInvoice as any).id))
      .select("id, invoice_number, metadata")
      .maybeSingle();
    savedInvoice = up.data as any;
    invSaveErr = up.error as any;
  } else {
    const ins = await sb.from("invoices").insert(upsertPayload).select("id, invoice_number, metadata").maybeSingle();
    savedInvoice = ins.data as any;
    invSaveErr = ins.error as any;
  }

  if (invSaveErr) return { ok: false, error: invSaveErr.message };

  const invoiceId = normId(savedInvoice?.id) || normId((existingInvoice as any)?.id);
  if (!invoiceId) return { ok: false, error: "Failed to resolve invoiceId" };

  const { data: anyLine, error: anyLineErr } = await sb.from("invoice_items").select("id").eq("invoice_id", invoiceId).limit(1);

  if (anyLineErr) return { ok: false, error: anyLineErr.message };

  const hasAnyLines = Array.isArray(anyLine) && anyLine.length > 0;

  if (!hasAnyLines) {
    const { data: orderItems, error: oiErr } = await sb
      .from("order_items")
      .select("id, product_variant_id, description, quantity, uom, unit_price, discount_percent, line_total, line_type, sort_order")
      .eq("order_id", oid)
      .order("sort_order", { ascending: true });

    if (oiErr) return { ok: false, error: oiErr.message };

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
      return { ok: false, error: "No invoice lines found (order_items empty)." };
    }

    const ins = await sb.from("invoice_items").insert(payload);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  const { data: invItems, error: invItemsErr } = await sb
    .from("invoice_items")
    .select("description, quantity, uom, unit_price, sort_order, order_item_id, product_variant_id")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true })
    .limit(2000);

  if (invItemsErr) return { ok: false, error: invItemsErr.message };

  const lines: InvoiceLine[] = (invItems ?? [])
    .map((r: any): InvoiceLine | null => {
      const qty = Math.max(0, safeNum(r.quantity));
      if (qty <= 0) return null;
      return {
        description: s(r.description) || "Item",
        qty,
        uom: s(r.uom) || "Units",
        unit_price: Math.max(0, safeNum(r.unit_price)),
        serials: null,
      };
    })
    .filter(Boolean) as InvoiceLine[];

  if (!lines.length) {
    return { ok: false, error: "No non-zero invoice lines to render PDF." };
  }

  const metaAfter = savedInvoice?.metadata && typeof savedInvoice.metadata === "object" ? savedInvoice.metadata : priorMeta;
  const pdfPathExisting = s((metaAfter as any)?.invoice_pdf_path) || s((metaAfter as any)?.invoice_pdf?.path);
  const pdfBucketExisting = s((metaAfter as any)?.invoice_pdf_bucket) || s((metaAfter as any)?.invoice_pdf?.bucket);
  if (pdfPathExisting && pdfBucketExisting) {
    return { ok: true, invoiceId };
  }

  let totalSqcm = 0;
  try {
    totalSqcm = await computeInvoiceDisplayTotalSqcm(sb, oid);
  } catch {
    totalSqcm = 0;
  }

  const footerNotes = await buildVirtualWarehouseInvoiceNotes(sb, oid);

  const subtotal = (order as any).subtotal != null ? safeNum((order as any).subtotal) : null;
  const shipping = (order as any).shipping_total != null ? safeNum((order as any).shipping_total) : null;
  const total = (order as any).total != null ? safeNum((order as any).total) : null;

  const pdfBytes = await renderInvoicePdf({
    invoiceNumber,
    orderNumber: s((order as any).order_number) || null,
    orderDateISO: todayYMD(),
    totalSqcm,
    totalSqcmCaption: (order as any).bulk_mode ? "Bulk purchase (sq cm)" : null,
    billTo: billingAddr as any,
    shipTo: deliveryAddr as any,
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

  const bucket = "order-private";
  const safeInv = safeFileToken(invoiceNumber);
  const objectPath = `invoices/${oid}/INVOICE-${safeInv}.pdf`;

  const up = await sb.storage.from(bucket).upload(objectPath, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (up.error) return { ok: false, error: up.error.message };

  const now = new Date().toISOString();
  const nextMeta = mergeMeta(savedInvoice?.metadata ?? priorMeta, {
    invoice_pdf: { number: invoiceNumber, bucket, path: objectPath, created_at: now },
    invoice_pdf_bucket: bucket,
    invoice_pdf_path: objectPath,
    invoice_pdf_generated_at: now,
    invoice_pdf_includes_serials: false,
  });

  const { error: metaErr } = await sb.from("invoices").update({ metadata: nextMeta }).eq("id", invoiceId);
  if (metaErr) return { ok: false, error: metaErr.message };

  await schedulePartnerFulfillmentSync(sb, oid);

  return { ok: true, invoiceId };
}
