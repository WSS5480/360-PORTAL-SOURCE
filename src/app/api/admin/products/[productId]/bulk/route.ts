import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Quick toggle from products list: enable or disable bulk for a product.
 * Enable → product.bulk_enabled true + all variants bulk_enabled true.
 * Disable → both false.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  await requireOrdersStaffOrAdmin();

  const sb: any = createSupabaseAdminClient();
  const { productId: rawProductId } = await Promise.resolve(params as any);
  const productId = String(rawProductId ?? "").trim();

  if (!UUID_RE.test(productId)) {
    return NextResponse.json({ ok: false, error: "Invalid productId" }, { status: 400 });
  }

  const form = await req.formData();
  const enabled = form.get("bulk_enabled") === "on" || form.get("bulk_enabled") === "true" || form.get("bulk_enabled") === "1";

  const { error: pErr } = await sb
    .from("products")
    .update({ bulk_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });

  const { error: vErr } = await sb
    .from("product_variants")
    .update({ bulk_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("product_id", productId);

  if (vErr) return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });

  const base = new URL(req.url).origin;
  const referer = req.headers.get("referer") || "";
  const back = referer && referer.includes("/admin/products") ? referer : `${base}/admin/products`;
  const u = new URL(back);
  u.searchParams.set("updated", "1");
  return NextResponse.redirect(u.toString(), 303);
}
