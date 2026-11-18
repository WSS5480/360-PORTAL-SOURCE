import { INVOICE_KIND_SHIPPING_SUPPLEMENT, normalizeInvoiceKind } from "@/lib/billing/invoiceKinds";
import { renderInvoicePdf, type InvoiceLine } from "@/lib/billing/renderInvoicePdf";
import { buildVirtualWarehouseInvoiceNotes } from "@/lib/virtualWarehouse/invoicePdfNotes";
import { getInvoiceWireInstructionsText } from "@/lib/billing/invoiceWireInstructions";
import {
  UUID_RE,
  s,
  safeObj,
  safeNum,
  computeOrderTotalSqcm,
  mergeMeta,
  ymdNowET,
  ensureInvoiceItemsSnapshot,
  buildSerialMapsForOrder,
  type SnapshotSource,
  type InvoiceItemRow,
} from "@/lib/billing/adminInvoicePdf";

/**
 * Generates invoice PDF, uploads to storage, and updates invoice metadata (same pipeline as admin POST).
 * Used when a portal user opens a PDF but metadata.invoice_pdf_path was never set.
 */
export async function generateInvoicePdfForInvoiceId(
  sb: any,
  invoiceId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID_RE.test(invoiceId)) return { ok: false, error: "Invalid invoiceId" };

  const { data: invoice, error: invErr } = await sb
    .from("invoices")
    .select(
      "id, order_id, invoice_number, invoice_kind, invoice_address, delivery_address, subtotal, shipping_total, tax, total, amount_paid, metadata, created_at"
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return { ok: false, error: invErr.message };
  if (!invoice) return { ok: false, error: "Invoice not found" };

  const orderId = s((invoice as any).order_id);
  if (!UUID_RE.test(orderId)) {
    return { ok: false, error: "Invoice is missing a valid order_id" };
  }

  let source: SnapshotSource = "invoice_items";

  const { data: invItems0, error: invItemsErr0 } = await sb
    .from("invoice_items")
    .select(
      "id, invoice_id, order_item_id, product_variant_id, description, quantity, uom, unit_price, discount_percent, line_total, line_type, sort_order"
    )
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true })
    .limit(2000);

  if (invItemsErr0) return { ok: false, error: invItemsErr0.message };

  const hasInvoiceItems = Array.isArray(invItems0) && invItems0.length > 0;

  if (!hasInvoiceItems) {
    source = "order_items";
    try {
      await ensureInvoiceItemsSnapshot(sb, invoiceId, orderId);
    } catch (e: any) {
      return { ok: false, error: e?.message || "Failed to snapshot invoice_items" };
    }
  }

  const { data: invItems1, error: invItemsErr1 } = await sb
    .from("invoice_items")
    .select(
      "id, invoice_id, order_item_id, product_variant_id, description, quantity, uom, unit_price, discount_percent, line_total, line_type, sort_order"
    )
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true })
    .limit(2000);

  if (invItemsErr1) return { ok: false, error: invItemsErr1.message };

  const invItems = (Array.isArray(invItems1) ? invItems1 : []) as unknown as InvoiceItemRow[];

  if (!invItems.length) {
    return {
      ok: false,
      error:
        source === "invoice_items"
          ? "No invoice_items found to render PDF."
          : "No order_items found to snapshot, so PDF cannot be rendered.",
    };
  }

  let serialsByOrderItem = new Map<string, string[]>();
  let serialsByVariant = new Map<string, string[]>();
  try {
    const maps = await buildSerialMapsForOrder(sb, orderId);
    serialsByOrderItem = maps.serialsByOrderItem;
    serialsByVariant = maps.serialsByVariant;
  } catch {
    // Not fatal
  }

  const lines: InvoiceLine[] = invItems
    .map((r: InvoiceItemRow): InvoiceLine | null => {
      const qty = Math.max(0, safeNum(r.quantity));
      if (qty <= 0) return null;

      const oiId = s(r.order_item_id || "");
      const vId = s(r.product_variant_id || "");

      const serials =
        (UUID_RE.test(oiId) ? serialsByOrderItem.get(oiId) : null) ||
        (UUID_RE.test(vId) ? serialsByVariant.get(vId) : null) ||
        null;

      return {
        description: s(r.description) || "Item",
        qty,
        uom: s(r.uom) || "Units",
        unit_price: Math.max(0, safeNum(r.unit_price)),
        serials: serials && serials.length ? serials : null,
      };
    })
    .filter(Boolean) as InvoiceLine[];

  if (!lines.length) {
    return { ok: false, error: "No non-zero invoice lines to render PDF." };
  }

  const invoiceNumber = s((invoice as any).invoice_number) || String(invoiceId).slice(0, 8);

  const { data: orderRow } = await sb
    .from("orders")
    .select("order_number, number, placed_at, created_at, total_sqcm, bulk_mode")
    .eq("id", orderId)
    .maybeSingle();

  const orderNumber = s((orderRow as any)?.order_number) || s((orderRow as any)?.number) || null;

  const placedOrCreated = s((orderRow as any)?.placed_at) || s((orderRow as any)?.created_at);
  const orderDateISO =
    placedOrCreated && placedOrCreated.length >= 10 ? placedOrCreated.slice(0, 10) : ymdNowET();

  const shippingTotal = (invoice as any).shipping_total != null ? safeNum((invoice as any).shipping_total) : 0;
  const subtotal = (invoice as any).subtotal != null ? safeNum((invoice as any).subtotal) : null;
  const tax = (invoice as any).tax != null ? safeNum((invoice as any).tax) : 0;
  const total = (invoice as any).total != null ? safeNum((invoice as any).total) : null;
  const isShippingSupplement = normalizeInvoiceKind((invoice as any).invoice_kind) === INVOICE_KIND_SHIPPING_SUPPLEMENT;

  let totalSqcm = 0;
  if (!isShippingSupplement) {
    try {
      totalSqcm = await computeOrderTotalSqcm(sb, orderId);
    } catch {
      totalSqcm = 0;
    }
  }

  const amountPaid = (invoice as any).amount_paid != null ? safeNum((invoice as any).amount_paid) : 0;

  const hasRefProductLines =
    isShippingSupplement &&
    invItems.some(
      (r) =>
        String(r.line_type ?? "").toUpperCase() === "PRODUCT" &&
        safeNum(r.quantity) > 0 &&
        safeNum(r.line_total) <= 0.0001
    );
  const footerNotes = isShippingSupplement
    ? [
        "Additional shipping charges for this order. The original paid invoice is unchanged.",
        ...(hasRefProductLines
          ? ["Product lines list quantities shipped; product charges were on the original invoice."]
          : []),
      ]
    : await buildVirtualWarehouseInvoiceNotes(sb, orderId);

  const shippingInvoicedPerFulfillment =
    isShippingSupplement || !!(orderRow as any)?.bulk_mode;

  const pdf = await renderInvoicePdf({
    invoiceNumber,
    orderNumber,
    orderDateISO,
    totalSqcm,
    totalSqcmCaption: isShippingSupplement ? null : (orderRow as any)?.bulk_mode ? "Bulk purchase (sq cm)" : null,
    billTo: safeObj((invoice as any).invoice_address) || null,
    shipTo: safeObj((invoice as any).delivery_address) || null,
    lines,
    subtotal,
    shipping: shippingTotal,
    tax,
    total,
    amountPaid,
    shippingInvoicedPerFulfillment,
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
  const safeInv = invoiceNumber.replace(/[^\w\-]/g, "_");
  const objectPath = `invoices/${orderId}/INVOICE-${safeInv}.pdf`;

  const { error: upErr } = await sb.storage.from(bucket).upload(objectPath, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (upErr) return { ok: false, error: `Upload failed: ${upErr.message}` };

  const prevMeta = safeObj((invoice as any).metadata) || {};
  const now = new Date().toISOString();

  const nextMeta = mergeMeta(prevMeta, {
    invoice_pdf: { number: invoiceNumber, bucket, path: objectPath, created_at: now },
    invoice_pdf_bucket: bucket,
    invoice_pdf_path: objectPath,
    invoice_pdf_generated_at: now,
    invoice_pdf_source: source,
    invoice_pdf_includes_serials: true,
  });

  const { error: metaErr } = await sb.from("invoices").update({ metadata: nextMeta }).eq("id", invoiceId);
  if (metaErr) return { ok: false, error: `DB update failed: ${metaErr.message}` };

  return { ok: true };
}
