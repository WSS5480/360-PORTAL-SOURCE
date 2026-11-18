import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isJsonRequest(req: Request): boolean {
  return req.headers.get("content-type")?.toLowerCase().includes("application/json") ?? false;
}

export async function POST(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { productId } = await ctx.params;
  const id = String(productId ?? "").trim();
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid product id" }, { status: 400 });
  }

  const jsonMode = isJsonRequest(req);
  const body = jsonMode ? ((await req.json().catch(() => ({}))) as Record<string, unknown>) : null;
  const form = jsonMode ? null : await req.formData();
  const action = String((jsonMode ? body?.action : form?.get("action")) ?? "").trim();
  const adminNotes = String((jsonMode ? body?.admin_notes : form?.get("admin_notes")) ?? "").trim();
  const status = action === "approve_all" ? "approved" : action === "reject_all" ? "rejected" : "";
  if (!status) {
    return NextResponse.json({ ok: false, error: "Use approve_all or reject_all." }, { status: 400 });
  }

  const { data: product, error: productErr } = await supabaseAdmin
    .from("surgical_sales_products")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (productErr) return NextResponse.json({ ok: false, error: productErr.message }, { status: 500 });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

  const reviewedAt = new Date().toISOString();
  const { data: updated, error } = await supabaseAdmin
    .from("surgical_sales_product_intelligence_candidates")
    .update({
      status,
      admin_notes:
        adminNotes ||
        (status === "approved"
          ? "Bulk approved by admin."
          : "Bulk rejected by admin."),
      reviewed_by_user_id: auth.ctx.userId,
      reviewed_at: reviewedAt,
      updated_at: reviewedAt,
    })
    .eq("product_id", id)
    .eq("status", "pending")
    .select("id, knowledge_type, title, content, evidence, confidence, status, admin_notes, reviewed_at, created_at");

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  if (jsonMode) {
    return NextResponse.json({ ok: true, candidates: updated ?? [] });
  }

  return NextResponse.redirect(
    urlFromRequest(req, `/admin/sales/product-intelligence/${encodeURIComponent(id)}?reviewed=1`),
    303,
  );
}
