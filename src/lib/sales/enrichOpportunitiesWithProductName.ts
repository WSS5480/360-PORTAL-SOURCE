import { supabaseAdmin } from "@/lib/supabase/admin";

function collectProductIds(rows: Record<string, unknown>[]): string[] {
  const ids: string[] = [];
  for (const r of rows) {
    const pid = (r as { product_id?: string | null }).product_id;
    if (pid) ids.push(String(pid));
    const extra = (r as { additional_product_ids?: unknown }).additional_product_ids;
    if (Array.isArray(extra)) {
      for (const x of extra) {
        if (x) ids.push(String(x));
      }
    }
  }
  return [...new Set(ids)];
}

export async function enrichOpportunitiesWithProductName<T extends Record<string, unknown>>(rows: T[]): Promise<Array<T & { product_display: string }>> {
  const ids = collectProductIds(rows as Record<string, unknown>[]);
  if (ids.length === 0) {
    return rows.map((r) => {
      const line = (r as { product_line?: string | null }).product_line;
      return { ...r, product_display: (line && String(line)) || "—" };
    });
  }

  const { data: prows, error } = await supabaseAdmin.from("products").select("id,name").in("id", ids);
  if (error || !prows) {
    return rows.map((r) => {
      const line = (r as { product_line?: string | null }).product_line;
      return { ...r, product_display: (line && String(line)) || "—" };
    });
  }

  const nameById = new Map(prows.map((p: { id: string; name: string }) => [String(p.id), String(p.name ?? "").trim()]));

  return rows.map((r) => {
    const line = (r as { product_line?: string | null }).product_line;
    const ordered: string[] = [];
    const pid = (r as { product_id?: string | null }).product_id;
    if (pid) ordered.push(String(pid));
    const extra = (r as { additional_product_ids?: unknown }).additional_product_ids;
    if (Array.isArray(extra)) {
      for (const x of extra) {
        const id = x ? String(x) : "";
        if (id && id !== String(pid || "")) ordered.push(id);
      }
    }
    const uniqueOrdered = [...new Set(ordered)];
    const parts = uniqueOrdered.map((id) => nameById.get(id)).filter(Boolean) as string[];
    const resolved = parts.length > 0 ? parts.join(" · ") : line;
    return { ...r, product_display: (resolved && String(resolved)) || "—" };
  });
}
