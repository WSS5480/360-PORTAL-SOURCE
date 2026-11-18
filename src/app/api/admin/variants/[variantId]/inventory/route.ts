import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseQty(v: unknown): number | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[, ]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ variantId: string }> }
) {
  await requireOrdersStaffOrAdmin();

  const sb: any = createSupabaseAdminClient();
  const { variantId: rawVariantId } = await Promise.resolve(params as any);
  const variantId = String(rawVariantId ?? "").trim();

  if (!UUID_RE.test(variantId)) {
    return NextResponse.json({ ok: false, error: "Invalid variantId" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const qty = parseQty((body as any)?.qty_on_hand);

  if (qty === null || qty < 0) {
    return NextResponse.json({ ok: false, error: "qty_on_hand must be a non-negative number" }, { status: 400 });
  }

  // Ensure variant exists
  const { data: variant, error: vErr } = await sb
    .from("product_variants")
    .select("id")
    .eq("id", variantId)
    .maybeSingle();

  if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
  if (!variant) return NextResponse.json({ ok: false, error: "Variant not found" }, { status: 404 });

  // Upsert inventory row
  const { error: upErr } = await sb
    .from("product_variant_inventory")
    .upsert({ variant_id: variantId, qty_on_hand: qty, updated_at: new Date().toISOString() });

  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, variant_id: variantId, qty_on_hand: qty });
}
