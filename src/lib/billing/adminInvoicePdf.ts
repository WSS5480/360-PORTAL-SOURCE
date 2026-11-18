// Shared admin invoice PDF generation + post-payment regeneration
import { computeInvoiceDisplayTotalSqcm } from "@/lib/billing/invoiceOrderTotalSqcm";
import { INVOICE_KIND_SHIPPING_SUPPLEMENT, normalizeInvoiceKind } from "@/lib/billing/invoiceKinds";
import { renderInvoicePdf, type InvoiceLine } from "@/lib/billing/renderInvoicePdf";
import { buildVirtualWarehouseInvoiceNotes } from "@/lib/virtualWarehouse/invoicePdfNotes";
import { getInvoiceWireInstructionsText } from "@/lib/billing/invoiceWireInstructions";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

export function safeObj(v: unknown): Record<string, any> | null {
  return v && typeof v === "object" ? (v as any) : null;
}

export function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

export function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** @deprecated Prefer computeInvoiceDisplayTotalSqcm — kept for existing imports. */
export async function computeOrderTotalSqcm(sb: any, orderId: string): Promise<number> {
  return computeInvoiceDisplayTotalSqcm(sb, orderId);
}

export function mergeMeta(prior: unknown, patch: unknown) {
  const p = prior && typeof prior === "object" ? (prior as any) : {};
  const q = patch && typeof patch === "object" ? (patch as any) : {};
  return { ...p, ...q };
}

export function ymdNowET(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function uniqPush(map: Map<string, string[]>, key: string, val: string) {
  const k = s(key);
  const v = s(val);
  if (!k || !v) return;
  const cur = map.get(k) ?? [];
  if (!cur.includes(v)) cur.push(v);
  map.set(k, cur);
}

export type SnapshotSource = "invoice_items" | "order_items";

export type InvoiceItemRow = {
  id: string;
  invoice_id: string;
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

export async function ensureInvoiceItemsSnapshot(sb: any, invoiceId: string, orderId: string) {
  // If invoice_items empty, snapshot order_items into invoice_items.
  const { data: existing, error: exErr } = await sb
    .from("invoice_items")
    .select("id")
    .eq("invoice_id", invoiceId)
    .limit(1);

  if (exErr) throw new Error(exErr.message);
  if (Array.isArray(existing) && existing.length > 0) return;

  const { data: ordItems, error: ordItemsErr } = await sb
    .from("order_items")
    .select("id, description, quantity, uom, unit_price, discount_percent, line_total, sort_order, line_type, product_variant_id")
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true })
    .limit(2000);

  if (ordItemsErr) throw new Error(ordItemsErr.message);

  const rows = Array.isArray(ordItems) ? ordItems : [];
  if (!rows.length) return;

  const inserts = rows.map((r: any) => {
    const qty = Math.max(0, safeNum(r.quantity));
    const unit = Math.max(0, safeNum(r.unit_price));
    const discountPct = Math.max(0, safeNum(r.discount_percent));
    const computedLineTotal = qty * unit * (1 - discountPct / 100);
    const lineTotal = r.line_total != null ? safeNum(r.line_total) : computedLineTotal;

    return {
      invoice_id: invoiceId,
      order_item_id: UUID_RE.test(String(r.id)) ? String(r.id) : null,
      product_variant_id: UUID_RE.test(String(r.product_variant_id)) ? String(r.product_variant_id) : null,
      description: s(r.description) || "Item",
      quantity: qty,
      uom: s(r.uom) || "Units",
      unit_price: unit,
      discount_percent: discountPct,
      line_total: lineTotal,
      line_type: s(r.line_type) || "PRODUCT",
      sort_order: Number.isFinite(Number(r.sort_order)) ? Number(r.sort_order) : 0,
    };
  });

  const { error: insErr } = await sb.from("invoice_items").insert(inserts);
  if (insErr) throw new Error(insErr.message);
}

export async function buildSerialMapsForOrder(sb: any, orderId: string) {
  // Pull serials from BOTH:
  // A) fulfillment_item_trace via fulfillment_items
  // B) inventory fallback via fulfillment_picks.lot_row_id -> product_variant_lots.serial_number

  const serialsByOrderItem = new Map<string, string[]>();
  const serialsByVariant = new Map<string, string[]>();

  const { data: fulfillsRaw, error: fErr } = await sb
    .from("fulfillments")
    .select("id, order_id, metadata, shipped_at, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (fErr) throw new Error(fErr.message);

  const fulfillments = Array.isArray(fulfillsRaw) ? fulfillsRaw : [];
  const fulfillmentIds = fulfillments.map((f: any) => s(f.id)).filter((x) => UUID_RE.test(x));

  if (!fulfillmentIds.length) {
    return { serialsByOrderItem, serialsByVariant };
  }

  // fulfillment_items -> maps for joining
  const { data: fiRaw, error: fiErr } = await sb
    .from("fulfillment_items")
    .select("id, fulfillment_id, order_item_id, variant_id")
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

  const fiIds = Array.from(fiIdToOrderItem.keys());
  if (fiIds.length) {
    // A) fulfillment_item_trace
    const { data: trRaw, error: trErr } = await sb
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

  // B) fulfillment_picks -> product_variant_lots (inventory fallback)
  const { data: picksRaw, error: picksErr } = await sb
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
    const { data: lotsRaw, error: lotsErr } = await sb
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


/** Call after any payment update so the stored invoice PDF reflects current amount_paid / balance due. */
export async function regenerateInvoicePdfAfterPayment(
  sb: any,
  invoiceId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!UUID_RE.test(invoiceId)) return { ok: false, error: "Invalid invoiceId" };

  const { data: invoice, error: invErr } = await sb
    .from("invoices")
    .select(
      "id, order_id, invoice_number, invoice_kind, invoice_address, delivery_address, subtotal, shipping_total, tax, total, amount_paid, metadata"
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return { ok: false, error: invErr.message };
  if (!invoice) return { ok: true } as const;

  const meta = safeObj((invoice as any).metadata) || {};
  const bucket = s(meta.invoice_pdf_bucket || meta.invoice_pdf?.bucket || "order-private");
  const existingPath = s(meta.invoice_pdf_path || meta.invoice_pdf?.path);
  if (!existingPath) return { ok: true } as const;

  const orderId = s((invoice as any).order_id);
  if (!UUID_RE.test(orderId)) return { ok: true } as const;

  try {
    const { data: invItems0 } = await sb
      .from("invoice_items")
      .select("id")
      .eq("invoice_id", invoiceId)
      .limit(1);
    const hasInvoiceItems = Array.isArray(invItems0) && invItems0.length > 0;
    if (!hasInvoiceItems) {
      await ensureInvoiceItemsSnapshot(sb, invoiceId, orderId);
    }

    const { data: invItems1, error: invItemsErr1 } = await sb
      .from("invoice_items")
      .select(
        "id, invoice_id, order_item_id, product_variant_id, description, quantity, uom, unit_price, discount_percent, line_total, line_type, sort_order"
      )
      .eq("invoice_id", invoiceId)
      .order("sort_order", { ascending: true })
      .limit(2000);
    if (invItemsErr1 || !invItems1?.length) return { ok: true } as const;

    const invItems = invItems1 as unknown as InvoiceItemRow[];
    let serialsByOrderItem = new Map<string, string[]>();
    let serialsByVariant = new Map<string, string[]>();
    try {
      const maps = await buildSerialMapsForOrder(sb, orderId);
      serialsByOrderItem = maps.serialsByOrderItem;
      serialsByVariant = maps.serialsByVariant;
    } catch {}

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
          serials: serials?.length ? serials : null,
        };
      })
      .filter(Boolean) as InvoiceLine[];
    if (!lines.length) return { ok: true } as const;

    const invoiceNumber = s((invoice as any).invoice_number) || String(invoiceId).slice(0, 8);
    const { data: orderRow } = await sb
      .from("orders")
      .select("order_number, number, placed_at, created_at, total_sqcm, bulk_mode")
      .eq("id", orderId)
      .maybeSingle();
    const orderNumber = s((orderRow as any)?.order_number) || s((orderRow as any)?.number) || null;
    const placedOrCreated = s((orderRow as any)?.placed_at) || s((orderRow as any)?.created_at);
    const orderDateISO = placedOrCreated && placedOrCreated.length >= 10 ? placedOrCreated.slice(0, 10) : ymdNowET();
    const shippingTotal = (invoice as any).shipping_total != null ? safeNum((invoice as any).shipping_total) : 0;
    const subtotal = (invoice as any).subtotal != null ? safeNum((invoice as any).subtotal) : null;
    const tax = (invoice as any).tax != null ? safeNum((invoice as any).tax) : 0;
    const total = (invoice as any).total != null ? safeNum((invoice as any).total) : null;
    const isShippingSupplement = normalizeInvoiceKind((invoice as any).invoice_kind) === INVOICE_KIND_SHIPPING_SUPPLEMENT;

    let totalSqcm = 0;
    if (!isShippingSupplement) {
      totalSqcm = (orderRow as any)?.total_sqcm != null ? safeNum((orderRow as any).total_sqcm) : 0;
      if (totalSqcm <= 0) {
        try {
          totalSqcm = await computeOrderTotalSqcm(sb, orderId);
        } catch {
          totalSqcm = 0;
        }
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

    const { error: upErr } = await sb.storage.from(bucket).upload(existingPath, pdf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) return { ok: false, error: upErr.message };

    const now = new Date().toISOString();
    const nextMeta = mergeMeta(meta, {
      invoice_pdf_generated_at: now,
    });
    await sb.from("invoices").update({ metadata: nextMeta }).eq("id", invoiceId);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Regenerate failed" };
  }
}

