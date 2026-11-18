import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import {
  insertProductKnowledgeCandidates,
  runProductDocumentAnalysis,
} from "@/lib/surgical-sales/productIntelligence";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DocumentAnalysisRow = {
  id: string;
  product_id: string;
  title: string | null;
  extracted_text: string | null;
  product?: { name?: string | null } | null;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ productId: string; documentId: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { productId, documentId } = await ctx.params;
  const pid = String(productId ?? "").trim();
  const did = String(documentId ?? "").trim();
  if (!UUID_RE.test(pid) || !UUID_RE.test(did)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const { data: doc, error: docErr } = await supabaseAdmin
    .from("surgical_sales_product_intelligence_documents")
    .select("id, product_id, title, extracted_text, product:surgical_sales_products!inner(name)")
    .eq("id", did)
    .eq("product_id", pid)
    .maybeSingle();

  if (docErr) return NextResponse.json({ ok: false, error: docErr.message }, { status: 500 });
  if (!doc) return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
  const docRow = doc as DocumentAnalysisRow;

  const extractedText = String(docRow.extracted_text ?? "").trim();
  if (!extractedText) {
    return NextResponse.json(
      { ok: false, error: "No extracted text is available for this document." },
      { status: 400 },
    );
  }

  const productName = String(docRow.product?.name ?? "Product").trim();
  const { data: run, error: runErr } = await supabaseAdmin
    .from("surgical_sales_product_intelligence_runs")
    .insert({
      product_id: pid,
      document_id: did,
      run_type: "document_analysis",
      status: "running",
      model: process.env.OPENAI_NOTE_CAPTURE_MODEL || "gpt-4o-mini",
      prompt_summary: `Document analysis for ${productName}`,
      created_by_user_id: auth.ctx.userId,
    })
    .select("id")
    .single();

  if (runErr || !run?.id) {
    return NextResponse.json({ ok: false, error: runErr?.message ?? "Run create failed" }, { status: 500 });
  }

  try {
    await supabaseAdmin
      .from("surgical_sales_product_intelligence_documents")
      .update({ extraction_status: "analysis_pending", updated_at: new Date().toISOString() })
      .eq("id", did);

    const candidates = await runProductDocumentAnalysis({
      productName,
      documentTitle: String(docRow.title ?? "Product document"),
      extractedText,
    });

    await insertProductKnowledgeCandidates({
      productId: pid,
      documentId: did,
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

    await supabaseAdmin
      .from("surgical_sales_product_intelligence_documents")
      .update({ extraction_status: "analysis_complete", updated_at: new Date().toISOString() })
      .eq("id", did);

    return NextResponse.redirect(
      urlFromRequest(req, `/admin/sales/product-intelligence/${encodeURIComponent(pid)}?analyzed=1`),
      303,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    await supabaseAdmin
      .from("surgical_sales_product_intelligence_runs")
      .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
      .eq("id", run.id);
    await supabaseAdmin
      .from("surgical_sales_product_intelligence_documents")
      .update({ extraction_status: "analysis_failed", updated_at: new Date().toISOString() })
      .eq("id", did);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
