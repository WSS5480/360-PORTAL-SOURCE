import { supabaseAdmin } from "@/lib/supabase/admin";
import { uniqueOrderedIds } from "@/lib/sales/uniqueOrderedIds";

const MAX_PRODUCTS = 25;

/**
 * Resolve ordered product UUIDs to display names (all must exist).
 * Returns names in the same order as ids.
 */
export async function resolveActiveProductNamesOrdered(
  orderedIds: string[]
): Promise<{ ok: true; names: string[] } | { ok: false; error: string }> {
  const ids = uniqueOrderedIds(orderedIds);
  if (ids.length === 0) {
    return { ok: false, error: "Select at least one product" };
  }
  if (ids.length > MAX_PRODUCTS) {
    return { ok: false, error: `At most ${MAX_PRODUCTS} products` };
  }

  const { data, error } = await supabaseAdmin.from("products").select("id,name").in("id", ids);

  if (error) {
    return { ok: false, error: error.message };
  }

  const rows = (data || []) as { id: string; name: string }[];
  const nameById = new Map(rows.map((r) => [String(r.id), String(r.name ?? "").trim()]));

  if (nameById.size !== ids.length) {
    return { ok: false, error: "One or more products are unknown" };
  }

  const names = ids.map((id) => nameById.get(id) || "");
  if (names.some((n) => !n)) {
    return { ok: false, error: "One or more products are unknown" };
  }

  return { ok: true, names };
}
