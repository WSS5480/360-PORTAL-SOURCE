import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Toggle bulk eligibility for a single variant (product must have bulk enabled for portal bulk catalog). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ variantId: string }> }
) {
  await requireOrdersStaffOrAdmin();

  const sb: any = createSupabaseAdminClient();
  const { variantId } = await Promise.resolve(params as any);
  if (!UUID_RE.test(variantId)) {
    return NextResponse.json({ ok: false, error: "Invalid variantId" }, { status: 400 });
  }

  const form = await req.formData();
  const raw = String(form.get("bulk_enabled") ?? "");
  const bulkEnabled = raw === "on" || raw === "true" || raw === "1";

  const { error } = await sb
    .from("product_variants")
    .update({ bulk_enabled: bulkEnabled, updated_at: new Date().toISOString() })
    .eq("id", variantId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const base = new URL(req.url).origin;
  const referer = req.headers.get("referer") || "";
  const back = referer || `${base}/admin/products`;
  return NextResponse.redirect(back, 303);
}
