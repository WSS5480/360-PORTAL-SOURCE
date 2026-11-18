import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BodySchema = z.object({
  external_sku: z.string().trim().min(1).max(80),
  product_variant_id: z.string().uuid(),
  partner_product_name: z.string().trim().max(200).nullable().optional(),
  status: z.enum(["pending", "verified", "disabled"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ partnerId: string; mapId: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { partnerId, mapId } = await params;
  if (!UUID_RE.test(partnerId) || !UUID_RE.test(mapId)) {
    return NextResponse.json({ ok: false, error: "Product mapping not found." }, { status: 404 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Product mapping is invalid." }, { status: 422 });

  const sb = createSupabaseAdminClient();
  const [{ data: existing }, { data: variant }] = await Promise.all([
    sb
      .from("integration_partner_product_maps")
      .select("id, partner_id")
      .eq("id", mapId)
      .eq("partner_id", partnerId)
      .maybeSingle(),
    sb.from("product_variants").select("id, is_active").eq("id", parsed.data.product_variant_id).maybeSingle(),
  ]);
  if (!existing) return NextResponse.json({ ok: false, error: "Product mapping not found." }, { status: 404 });
  if (!variant || (parsed.data.status === "verified" && variant.is_active !== true)) {
    return NextResponse.json({ ok: false, error: "Choose an active 360 product variant." }, { status: 422 });
  }

  const now = new Date().toISOString();
  const { error } = await sb
    .from("integration_partner_product_maps")
    .update({
      external_sku: parsed.data.external_sku,
      product_variant_id: parsed.data.product_variant_id,
      partner_product_name: parsed.data.partner_product_name || null,
      status: parsed.data.status,
      verified_at: parsed.data.status === "verified" ? now : null,
      verified_by_user_id: parsed.data.status === "verified" ? auth.ctx.userId : null,
      updated_at: now,
    })
    .eq("id", mapId)
    .eq("partner_id", partnerId);

  if (error) {
    const duplicate = /duplicate|unique/i.test(error.message);
    return NextResponse.json(
      { ok: false, error: duplicate ? "That external SKU is already mapped for this partner." : "The product mapping could not be saved." },
      { status: duplicate ? 409 : 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
