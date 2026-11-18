import { supabaseAdmin } from "@/lib/supabase/admin";

export type NormalizedCaseLine = { product_id: string; sku_id: string; expected_quantity: number };

const MAX_LINES = 25;

export async function validateSurgicalCaseLineItems(
  lines: NormalizedCaseLine[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (lines.length === 0) return { ok: false, error: "At least one line item is required" };
  if (lines.length > MAX_LINES) return { ok: false, error: `At most ${MAX_LINES} line items allowed` };

  const skuIds = [...new Set(lines.map((l) => l.sku_id))];
  const { data: skuRows, error: skuErr } = await supabaseAdmin
    .from("surgical_sales_product_skus")
    .select("id, product_id, active")
    .in("id", skuIds);
  if (skuErr) return { ok: false, error: skuErr.message };

  const skuById = new Map((skuRows || []).map((r) => [String((r as { id: string }).id), r as { id: string; product_id: string; active?: boolean }]));

  const productIds = [...new Set(lines.map((l) => l.product_id))];
  const { data: prodRows, error: pErr } = await supabaseAdmin.from("surgical_sales_products").select("id, active").in("id", productIds);
  if (pErr) return { ok: false, error: pErr.message };
  const prodById = new Map((prodRows || []).map((r) => [String((r as { id: string }).id), r as { id: string; active?: boolean }]));

  for (const line of lines) {
    const sku = skuById.get(line.sku_id);
    if (!sku) return { ok: false, error: "SKU not found" };
    if (!sku.active) return { ok: false, error: "SKU is inactive" };
    if (String(sku.product_id) !== line.product_id) {
      return { ok: false, error: "SKU does not match product on a line item" };
    }
    const prod = prodById.get(line.product_id);
    if (!prod || !prod.active) {
      return { ok: false, error: "Product not found or inactive" };
    }
  }

  return { ok: true };
}
