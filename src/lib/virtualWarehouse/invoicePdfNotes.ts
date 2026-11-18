import type { SupabaseClient } from "@supabase/supabase-js";

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sqcmFromVariant(v: any): number {
  const direct = safeNum(v?.total_sqcm);
  if (direct > 0) return direct;
  const w = safeNum(v?.width_cm);
  const l = safeNum(v?.length_cm);
  if (w > 0 && l > 0) return w * l;
  return 0;
}

/**
 * Footer lines for invoice PDF when the order has virtual-warehouse allocation on bulk lines.
 */
export async function buildVirtualWarehouseInvoiceNotes(
  sb: SupabaseClient,
  orderId: string
): Promise<string[]> {
  const { data: order } = await sb
    .from("orders")
    .select("id, bulk_mode, total_sqcm, bulk_contract_sqcm, virtual_warehouse_shipment")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return [];

  if ((order as any).virtual_warehouse_shipment) {
    return [
      "Virtual warehouse shipment: product lines are $0 (drawn from prepaid virtual warehouse sq cm).",
      "Shipping is invoiced when your order is fulfilled.",
    ];
  }

  if (!(order as any).bulk_mode) return [];

  const { data: items } = await sb
    .from("order_items")
    .select("product_variant_id, quantity, virtual_warehouse_qty, line_type, description")
    .eq("order_id", orderId);

  const lines = (items ?? []).filter((it: any) => String(it.line_type || "").toUpperCase() === "PRODUCT");
  const variantIds = Array.from(
    new Set(lines.map((it: any) => String(it.product_variant_id || "")).filter(Boolean))
  );
  if (!variantIds.length) return [];

  const { data: variants } = await sb
    .from("product_variants")
    .select("id, sku, total_sqcm, width_cm, length_cm")
    .in("id", variantIds);

  const byVid = new Map<string, any>((variants ?? []).map((v: any) => [String(v.id), v]));

  let shipNowSqcm = 0;
  let vwSqcm = 0;
  let allocatedSqcm = 0;
  const shipLines: string[] = [];

  for (const it of lines as any[]) {
    const vid = String(it.product_variant_id || "");
    const v = byVid.get(vid);
    const per = sqcmFromVariant(v);
    const qty = safeNum(it.quantity);
    allocatedSqcm += per * qty;
    const vw = Math.min(Math.max(0, Math.floor(safeNum(it.virtual_warehouse_qty))), qty);
    const ship = Math.max(0, qty - vw);
    shipNowSqcm += per * ship;
    vwSqcm += per * vw;
    if (ship > 0 && per > 0) {
      const sku = v?.sku ? String(v.sku) : vid.slice(0, 8);
      shipLines.push(`${sku}: ${ship} unit(s) ship now (${(per * ship).toLocaleString(undefined, { maximumFractionDigits: 2 })} sq cm)`);
    }
  }

  if (vwSqcm <= 0 && shipNowSqcm <= 0) return [];

  const notes: string[] = ["Virtual warehouse (bulk purchase summary):"];
  if (shipLines.length) {
    notes.push("Products shipping now:");
    for (const s of shipLines.slice(0, 12)) notes.push(`  • ${s}`);
    if (shipLines.length > 12) notes.push(`  • …and ${shipLines.length - 12} more`);
  } else {
    notes.push("  • No units marked for immediate shipment on this invoice.");
  }

  notes.push(
    `Sq cm shipping now: ${shipNowSqcm.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `Sq cm credited to virtual warehouse (after payment): ${vwSqcm.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  );

  const contract = safeNum((order as any).bulk_contract_sqcm);
  const totalOrder = safeNum((order as any).total_sqcm);
  if (contract > 0) {
    notes.push(`Declared bulk contract sq cm: ${contract.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
    const remainder = Math.max(0, contract - allocatedSqcm);
    if (remainder > 0.0001) {
      notes.push(
        `Remaining bulk contract sq cm (not allocated to lines on this invoice): ${remainder.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
      );
    }
  } else if (totalOrder > 0) {
    notes.push(`Order total sq cm: ${totalOrder.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
  }

  return notes;
}
