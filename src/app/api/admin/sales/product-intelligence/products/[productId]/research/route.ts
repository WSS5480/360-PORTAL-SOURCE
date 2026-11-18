import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { insertProductKnowledgeCandidates, runProductAiResearch } from "@/lib/surgical-sales/productIntelligence";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProductResearchRow = {
  id: string;
  name: string | null;
  category: string | null;
  description: string | null;
};

export async function POST(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { productId } = await ctx.params;
  const pid = String(productId ?? "").trim();
  if (!UUID_RE.test(pid)) {
    return NextResponse.json({ ok: false, error: "Invalid product id" }, { status: 400 });
  }

  const { data: product, error: productErr } = await supabaseAdmin
    .from("surgical_sales_products")
    .select("id, name, category, description")
    .eq("id", pid)
    .maybeSingle();
  if (productErr) return NextResponse.json({ ok: false, error: productErr.message }, { status: 500 });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
  const productRow = product as ProductResearchRow;

  const productName = String(productRow.name ?? "Product").trim();
  const { data: run, error: runErr } = await supabaseAdmin
    .from("surgical_sales_product_intelligence_runs")
    .insert({
      product_id: pid,
      run_type: "ai_research",
      status: "running",
      model: process.env.OPENAI_NOTE_CAPTURE_MODEL || "gpt-4o-mini",
      prompt_summary: `AI research for ${productName}`,
      created_by_user_id: auth.ctx.userId,
    })
    .select("id")
    .single();

  if (runErr || !run?.id) {
    return NextResponse.json({ ok: false, error: runErr?.message ?? "Run create failed" }, { status: 500 });
  }

  try {
    const candidates = await runProductAiResearch({
      productName,
      category: productRow.category,
      description: productRow.description,
    });
    await insertProductKnowledgeCandidates({
      productId: pid,
      runId: String(run.id),
      candidates,
    });

    await supabaseAdmin
      .from("surgical_sales_product_intelligence_runs")
      .update({
        status: "complete",
        raw_result: { candidate_count: candidates.length, candidates },
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return NextResponse.redirect(
      urlFromRequest(req, `/admin/sales/product-intelligence/${encodeURIComponent(pid)}?researched=1`),
      303,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Research failed";
    await supabaseAdmin
      .from("surgical_sales_product_intelligence_runs")
      .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
      .eq("id", run.id);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
