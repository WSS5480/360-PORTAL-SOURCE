import { supabaseAdmin } from "@/lib/supabase/admin";

export async function resolveActiveProductName(productId: string): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const id = String(productId || "").trim();
  if (!id) return { ok: false, error: "Product is required" };

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  const name = data?.name != null ? String(data.name).trim() : "";
  if (!name) return { ok: false, error: "Unknown product" };

  return { ok: true, name };
}
