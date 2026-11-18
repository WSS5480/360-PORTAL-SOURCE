import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const rep = await userIsInternalSalesRep(auth.user.id);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const productId = (url.searchParams.get("product_id") || "").trim();
  if (!UUID_RE.test(productId)) {
    return NextResponse.json({ ok: false, error: "Invalid or missing product_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("surgical_sales_product_skus")
    .select("id, product_id, sku, description, unit_of_measure, active")
    .eq("product_id", productId)
    .order("sku", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, skus: data ?? [] });
}
