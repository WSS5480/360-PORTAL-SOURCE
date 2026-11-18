import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { productId } = await ctx.params;
  const id = String(productId ?? "").trim();
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid product id" }, { status: 400 });
  }

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const active = form.get("active") === "on";

  if (!name) {
    return NextResponse.json({ ok: false, error: "Product name is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("surgical_sales_products")
    .update({
      name,
      category,
      description: description || null,
      active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.redirect(
    urlFromRequest(req, `/admin/sales/product-intelligence/${encodeURIComponent(id)}?saved=1`),
    303,
  );
}
