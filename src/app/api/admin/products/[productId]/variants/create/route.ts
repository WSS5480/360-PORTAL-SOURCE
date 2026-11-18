import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toNumOrNull(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  const n = Number(s.replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { productId } = await Promise.resolve(params);
  if (!UUID_RE.test(productId)) {
    return NextResponse.json({ ok: false, error: "Invalid productId" }, { status: 400 });
  }

  const { data: product, error: prodErr } = await sb
    .from("products")
    .select("id, base_unit_price, bulk_enabled")
    .eq("id", productId)
    .maybeSingle();

  if (prodErr) return NextResponse.json({ ok: false, error: prodErr.message }, { status: 500 });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

  const productBase = Number(String(product.base_unit_price ?? "0").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(productBase) || productBase < 0) {
    return NextResponse.json({ ok: false, error: "Product base unit price is invalid" }, { status: 400 });
  }

  const form = await req.formData();
  const sku = String(form.get("sku") ?? "").trim();
  const sizeLabel = String(form.get("size_label") ?? "").trim();
  const widthCm = toNumOrNull(String(form.get("width_cm") ?? ""));
  const lengthCm = toNumOrNull(String(form.get("length_cm") ?? ""));
  const totalSqcmRaw = toNumOrNull(String(form.get("total_sqcm") ?? ""));
  const isActive = form.get("is_active") === "on";

  if (!sku) return NextResponse.json({ ok: false, error: "SKU is required" }, { status: 400 });

  const computedSqcm =
    totalSqcmRaw ??
    (widthCm !== null && lengthCm !== null ? widthCm * lengthCm : null);

  const baseUnitPrice = computedSqcm !== null ? productBase * computedSqcm : 0;

  const { data, error } = await sb
    .from("product_variants")
    .insert({
      product_id: productId,
      sku,
      size_label: sizeLabel ? sizeLabel : null,
      width_cm: widthCm,
      length_cm: lengthCm,
      total_sqcm: computedSqcm,
      base_unit_price: baseUnitPrice,
      is_active: isActive,
      bulk_enabled: !!(product as any)?.bulk_enabled,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.redirect(urlFromRequest(req, `/admin/variants/${encodeURIComponent(String(data.id))}`));
}
