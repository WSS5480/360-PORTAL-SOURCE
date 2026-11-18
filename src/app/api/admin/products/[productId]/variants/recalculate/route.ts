import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function num(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  await requireOrdersStaffOrAdmin();

  const sb: any = createSupabaseAdminClient();
  const { productId: rawProductId } = await Promise.resolve(params as any);
  const productId = String(rawProductId ?? "").trim();

  if (!UUID_RE.test(productId)) {
    return NextResponse.json({ ok: false, error: "Invalid productId" }, { status: 400 });
  }

  const { data: product, error: prodErr } = await sb
    .from("products")
    .select("id, base_unit_price")
    .eq("id", productId)
    .maybeSingle();

  if (prodErr) return NextResponse.json({ ok: false, error: prodErr.message }, { status: 500 });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

  const base = num(product.base_unit_price) ?? 0;

  const { data: variants, error: varErr } = await sb
    .from("product_variants")
    .select("id, total_sqcm")
    .eq("product_id", productId);

  if (varErr) return NextResponse.json({ ok: false, error: varErr.message }, { status: 500 });

  let updated = 0;
  const updates: any[] = [];

  for (const v of variants ?? []) {
    const sqcm = num(v.total_sqcm);
    if (sqcm === null) continue; // only recalc where total_sqcm exists
    const price = base * sqcm;
    updates.push({ id: v.id, base_unit_price: price, updated_at: new Date().toISOString() });
  }

  // bulk update (best-effort)
  for (const u of updates) {
    const { error } = await sb.from("product_variants").update(u).eq("id", u.id);
    if (!error) updated++;
  }

  return NextResponse.json({ ok: true, updated, total: updates.length });
}
