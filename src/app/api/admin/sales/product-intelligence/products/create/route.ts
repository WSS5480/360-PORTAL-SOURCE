import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const active = form.get("active") === "on";

  if (!name) {
    return NextResponse.json({ ok: false, error: "Product name is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("surgical_sales_products")
    .insert({
      name,
      category,
      description: description || null,
      active,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Product create failed" }, { status: 500 });
  }

  return NextResponse.redirect(
    urlFromRequest(req, `/admin/sales/product-intelligence/${encodeURIComponent(String(data.id))}?saved=1`),
    303,
  );
}
