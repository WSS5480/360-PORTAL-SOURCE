import type { SupabaseClient } from "@supabase/supabase-js";
import { sqcmFromVariant } from "./sqcmFromVariant";

/** First active bulk catalog variant with sq cm — matches portal VW bulk deposit pricing. */
export async function loadBulkPricingReferenceVariant(sb: SupabaseClient): Promise<any | null> {
  const { data: products, error: pErr } = await sb
    .from("products")
    .select("id")
    .eq("is_active", true)
    .eq("bulk_enabled", true)
    .limit(200);
  if (pErr) throw new Error(pErr.message);
  const pids = (products ?? []).map((p: any) => String(p.id)).filter(Boolean);
  if (!pids.length) return null;
  const { data: vars, error: vErr } = await sb
    .from("product_variants")
    .select("id, sku, size_label, base_unit_price, width_cm, length_cm, total_sqcm")
    .eq("is_active", true)
    .eq("bulk_enabled", true)
    .in("product_id", pids)
    .limit(500);
  if (vErr) throw new Error(vErr.message);
  for (const v of vars ?? []) {
    if (sqcmFromVariant(v) > 0) return v;
  }
  return null;
}
