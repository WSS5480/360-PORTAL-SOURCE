/**
 * Quantities shipped per order line, aggregated from closed fulfillments.
 * Used for shipping supplement invoices and shipping emails.
 */

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

export type ShippedOrderLine = {
  order_item_id: string;
  product_variant_id: string | null;
  description: string;
  quantity: number;
  uom: string;
  sort_order: number;
};

function qtyFromFulfillmentItem(row: { picked_qty?: unknown; required_qty?: unknown }): number {
  const picked = safeNum(row.picked_qty);
  const req = safeNum(row.required_qty);
  if (picked > 0) return picked;
  if (req > 0) return req;
  return 0;
}

/**
 * Sums shipped qty from `fulfillment_items` for all CLOSED fulfillments on the order.
 */
export async function aggregateShippedQtyByOrderItem(sb: any, orderId: string): Promise<ShippedOrderLine[]> {
  const { data: closed } = await sb
    .from("fulfillments")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "CLOSED");

  const fIds = (closed ?? []).map((r: any) => r?.id).filter(Boolean);
  if (!fIds.length) return [];

  const { data: fiRows, error: fiErr } = await sb
    .from("fulfillment_items")
    .select("order_item_id, variant_id, description, required_qty, picked_qty, uom, sort_order")
    .in("fulfillment_id", fIds);

  if (fiErr) throw new Error(fiErr.message);

  const byOrderItem = new Map<
    string,
    { qty: number; description: string; uom: string; sort_order: number; variant_id: string | null }
  >();

  for (const row of fiRows ?? []) {
    const q = qtyFromFulfillmentItem(row);
    if (q <= 0) continue;

    const oiId = safeStr((row as any).order_item_id);
    if (!oiId) continue;

    const desc = safeStr((row as any).description) || "Item";
    const uom = safeStr((row as any).uom) || "Units";
    const so = safeNum((row as any).sort_order);
    const vid = safeStr((row as any).variant_id) || null;

    const prev = byOrderItem.get(oiId);
    if (prev) {
      prev.qty += q;
      if (desc && prev.description === "Item") prev.description = desc;
    } else {
      byOrderItem.set(oiId, { qty: q, description: desc, uom, sort_order: so, variant_id: vid });
    }
  }

  if (!byOrderItem.size) return [];

  const { data: oiRows } = await sb
    .from("order_items")
    .select("id, description, product_variant_id, line_type, uom, sort_order")
    .eq("order_id", orderId);

  const oiById = new Map<string, any>();
  for (const r of oiRows ?? []) {
    if (r?.id) oiById.set(String(r.id), r);
  }

  const out: ShippedOrderLine[] = [];

  for (const [orderItemId, agg] of byOrderItem) {
    const oi = oiById.get(orderItemId);
    const lt = safeStr(oi?.line_type).toUpperCase();
    if (oi && lt === "SHIPPING") continue;

    const description = oi ? safeStr(oi.description) || agg.description : agg.description;
    const uom = oi ? safeStr(oi.uom) || agg.uom : agg.uom;
    const sort_order = oi ? safeNum(oi.sort_order) : agg.sort_order;
    const product_variant_id = oi
      ? oi.product_variant_id != null
        ? String(oi.product_variant_id)
        : null
      : agg.variant_id;

    out.push({
      order_item_id: orderItemId,
      product_variant_id,
      description: description || "Item",
      quantity: agg.qty,
      uom: uom || "Units",
      sort_order,
    });
  }

  out.sort((a, b) => a.sort_order - b.sort_order || a.description.localeCompare(b.description));
  return out;
}
