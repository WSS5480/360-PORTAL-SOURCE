import { sqcmFromVariant } from "@/lib/virtualWarehouse/sqcmFromVariant";

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function s(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * Sq cm shown on invoice PDF totals (bottom left): for bulk orders, prefer the bulk purchase total
 * (`bulk_contract_sqcm` when set, else `orders.total_sqcm`), not the sum of per-line variant sq cm
 * (which can under-count VW deposit lines).
 */
export async function computeInvoiceDisplayTotalSqcm(sb: any, orderId: string): Promise<number> {
  const { data: orderRow } = await sb
    .from("orders")
    .select("bulk_mode, bulk_contract_sqcm, total_sqcm")
    .eq("id", orderId)
    .maybeSingle();

  if (orderRow && (orderRow as any).bulk_mode) {
    const bc = safeNum((orderRow as any).bulk_contract_sqcm);
    if (bc > 0) return bc;
    const ts = safeNum((orderRow as any).total_sqcm);
    if (ts > 0) return ts;
  }

  const { data: itemsRaw, error: itemsErr } = await sb
    .from("order_items")
    .select("product_variant_id, quantity, line_type")
    .eq("order_id", orderId)
    .limit(20000);
  if (itemsErr) throw new Error(itemsErr.message);

  const items = Array.isArray(itemsRaw) ? itemsRaw : [];
  const variantIds = Array.from(
    new Set(
      items
        .filter((i: any) => String(i?.line_type ?? "").toUpperCase() === "PRODUCT")
        .map((i: any) => s(i?.product_variant_id))
        .filter(Boolean)
    )
  );

  const { data: variantsRaw, error: vErr } = variantIds.length
    ? await sb
        .from("product_variants")
        .select("id, total_sqcm, width_cm, length_cm, size_label")
        .in("id", variantIds as any)
        .limit(5000)
    : { data: [], error: null };
  if (vErr) throw new Error(vErr.message);

  const variants = Array.isArray(variantsRaw) ? variantsRaw : [];
  const perVariant = new Map<string, number>();
  for (const v of variants) {
    const id = s((v as any)?.id);
    if (!id) continue;
    perVariant.set(id, sqcmFromVariant(v));
  }

  let total = 0;
  for (const it of items) {
    if (String((it as any)?.line_type ?? "").toUpperCase() !== "PRODUCT") continue;
    const variantId = s((it as any)?.product_variant_id);
    const qty = safeNum((it as any)?.quantity);
    if (!variantId || qty <= 0) continue;
    total += (perVariant.get(variantId) ?? 0) * qty;
  }

  return total;
}
