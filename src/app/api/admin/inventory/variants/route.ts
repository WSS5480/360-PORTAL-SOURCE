import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type VariantRow = {
  id: string;
  product_id: string | null;
  sku: string;
  size_label: string | null;
  is_active: boolean;
};

type ProductRow = {
  id: string;
  name: string | null;
};

type InventoryRow = {
  variant_id: string;
  qty_on_hand: number;
};

function norm(v: string): string {
  return v.trim();
}

export async function GET(req: Request) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const url = new URL(req.url);
  const q = norm(url.searchParams.get("q") || "");
  const onlyActive = url.searchParams.get("onlyActive") !== "0"; // default true
  const limitRaw = Number(url.searchParams.get("limit") || 300);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 300, 1), 1000);

  // 1) Variants list (avoid relying on PostgREST relationship names)
  let query = sb
    .from("product_variants")
    .select("id, product_id, sku, size_label, is_active")
    .order("sku", { ascending: true })
    .limit(limit);

  if (onlyActive) query = query.eq("is_active", true);
  if (q) query = query.ilike("sku", `%${q}%`);

  const { data: variantsData, error: vErr } = await query;
  if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });

  const variants: VariantRow[] = (variantsData ?? []).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      product_id: r.product_id ? String(r.product_id) : null,
      sku: String(r.sku ?? ""),
      size_label: r.size_label ? String(r.size_label) : null,
      is_active: !!r.is_active,
    };
  });

  const productIds = Array.from(new Set(variants.map((v) => v.product_id).filter(Boolean))) as string[];

  // 2) Product names
  const productsById = new Map<string, string | null>();
  if (productIds.length) {
    const { data: productsData, error: pErr } = await sb.from("products").select("id, name").in("id", productIds);
    if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });

    const products: ProductRow[] = (productsData ?? []).map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id ?? ""),
        name: r.name !== null && r.name !== undefined ? String(r.name) : null,
      };
    });

    for (const p of products) productsById.set(p.id, p.name);
  }

  // 3) On-hand (portal truth)
  const variantIds = variants.map((v) => v.id).filter(Boolean);
  const onHandByVariant = new Map<string, number>();

  if (variantIds.length) {
    const { data: invData, error: iErr } = await sb
      .from("product_variant_inventory")
      .select("variant_id, qty_on_hand")
      .in("variant_id", variantIds);

    if (iErr) return NextResponse.json({ ok: false, error: iErr.message }, { status: 500 });

    const invRows: InventoryRow[] = (invData ?? []).map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        variant_id: String(r.variant_id ?? ""),
        qty_on_hand: Number(r.qty_on_hand ?? 0) || 0,
      };
    });

    for (const r of invRows) onHandByVariant.set(r.variant_id, r.qty_on_hand);
  }

  const out = variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    size_label: v.size_label,
    is_active: v.is_active,
    product_id: v.product_id,
    product_name: v.product_id ? productsById.get(v.product_id) ?? null : null,
    qty_on_hand: onHandByVariant.get(v.id) ?? 0,
  }));

  return NextResponse.json({ ok: true, variants: out });
}
