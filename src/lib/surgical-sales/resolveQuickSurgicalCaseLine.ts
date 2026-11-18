import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadSurgicalNewCaseDefaults } from "@/lib/surgical-sales/newCaseDefaultsQuery";

/**
 * Picks a SKU and expected quantity for quick-create flows (minimal UI).
 */
export async function resolveQuickSurgicalCaseLine(params: {
  repUserId: string;
  accountId: string;
  productId: string;
}): Promise<{ ok: true; sku_id: string; expected_quantity: number } | { ok: false; message: string }> {
  const { data: skus, error } = await supabaseAdmin
    .from("surgical_sales_product_skus")
    .select("id")
    .eq("product_id", params.productId)
    .order("sku", { ascending: true });

  if (error) {
    return { ok: false, message: error.message };
  }

  const skuIds = (skus || []).map((r) => String((r as { id: string }).id));
  if (skuIds.length === 0) {
    return {
      ok: false,
      message: "No SKU is configured for this product. Use the full new case form to pick a SKU.",
    };
  }

  const defaults = await loadSurgicalNewCaseDefaults({
    repUserId: params.repUserId,
    accountId: params.accountId,
    productId: params.productId,
  });

  let sku_id = skuIds[0]!;
  for (const r of defaults.sku_rank) {
    if (skuIds.includes(r.sku_id)) {
      sku_id = r.sku_id;
      break;
    }
  }

  const q = defaults.suggested_expected_quantity;
  const expected_quantity =
    q != null && Number.isFinite(Number(q)) && Number(q) > 0
      ? Math.max(1, Math.min(1_000_000, Math.round(Number(q))))
      : 1;

  return { ok: true, sku_id, expected_quantity };
}
