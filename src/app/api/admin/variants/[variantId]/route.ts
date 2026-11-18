import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseNumberOrNull(v: unknown): number | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseMoneyLike(v: unknown): number {
  const raw = String(v ?? "").trim();
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return n;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ variantId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { variantId } = await Promise.resolve(params);
  if (!UUID_RE.test(variantId)) {
    return NextResponse.json({ ok: false, error: "Invalid variantId" }, { status: 400 });
  }

  const form = await req.formData();

  const sku = String(form.get("sku") ?? "").trim();
  const sizeLabel = String(form.get("size_label") ?? "").trim();
  const widthCm = parseNumberOrNull(form.get("width_cm"));
  const lengthCm = parseNumberOrNull(form.get("length_cm"));
  const totalSqcmInput = parseNumberOrNull(form.get("total_sqcm"));
  const isActive = form.get("is_active") === "on";

  // Manual override controls (no schema changes; just form inputs)
  const overridePrice = form.get("override_price") === "on";
  const manualPrice = parseMoneyLike(form.get("manual_base_unit_price"));

  if (!sku) {
    return NextResponse.json({ ok: false, error: "SKU is required" }, { status: 400 });
  }

  // Load variant -> product_id so we can compute price from product base_unit_price.
  const { data: existing, error: exErr } = await sb
    .from("product_variants")
    .select("id, product_id")
    .eq("id", variantId)
    .maybeSingle();

  if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { data: product, error: pErr } = await sb
    .from("products")
    .select("id, base_unit_price")
    .eq("id", existing.product_id)
    .maybeSingle();

  if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

  const productBase = parseMoneyLike(product.base_unit_price);
  if (!Number.isFinite(productBase) || productBase < 0) {
    return NextResponse.json({ ok: false, error: "Product base unit price is invalid" }, { status: 400 });
  }

  // total_sqcm: use explicit input, else compute from width*length if available, else null
  const computedSqcm =
    totalSqcmInput ?? (widthCm !== null && lengthCm !== null ? widthCm * lengthCm : null);

  // Price behavior:
  // - Default: calculated from product base × sqcm (existing behavior).
  // - Override: allow staff/admin to directly set variant.base_unit_price when needed.
  let nextVariantPrice: number;
  if (overridePrice) {
    if (!Number.isFinite(manualPrice) || manualPrice < 0) {
      return NextResponse.json(
        { ok: false, error: "Manual price must be a non-negative number (commas/$ allowed)." },
        { status: 400 }
      );
    }
    nextVariantPrice = manualPrice;
  } else {
    // If sqcm is missing, set 0 (safe) so it doesn’t accidentally bill something unknown.
    nextVariantPrice = computedSqcm !== null ? productBase * computedSqcm : 0;
  }

  const { error: updErr } = await sb
    .from("product_variants")
    .update({
      sku,
      size_label: sizeLabel ? sizeLabel : null,
      width_cm: widthCm,
      length_cm: lengthCm,
      total_sqcm: computedSqcm,
      base_unit_price: nextVariantPrice,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", variantId);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  return NextResponse.redirect(urlFromRequest(req, `/admin/variants/${encodeURIComponent(variantId)}`));
}
