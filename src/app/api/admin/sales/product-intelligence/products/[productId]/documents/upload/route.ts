import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { extractProductDocumentText } from "@/lib/surgical-sales/productIntelligence";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUCKET = "product-assets";
const ALLOWED_EXT = new Set(["pdf", "txt", "csv", "doc", "docx", "ppt", "pptx"]);

function safeName(value: unknown): string {
  return String(value ?? "product-document").replace(/[^\w.\-()+ ]/g, "_");
}

function extension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase().trim() ?? "";
}

async function resolveFilesAccountId(sb: SupabaseClient): Promise<string | null> {
  const configured = String(process.env.PRODUCT_FILES_ACCOUNT_ID ?? "").trim();
  if (UUID_RE.test(configured)) {
    const { data } = await sb.from("accounts").select("id").eq("id", configured).maybeSingle();
    if (data?.id) return String(data.id);
  }
  const { data } = await sb.from("accounts").select("id").limit(1).maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function POST(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { productId } = await ctx.params;
  const id = String(productId ?? "").trim();
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid product id" }, { status: 400 });
  }

  const sb = createSupabaseAdminClient();
  const { data: product, error: productErr } = await sb
    .from("surgical_sales_products")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (productErr) return NextResponse.json({ ok: false, error: productErr.message }, { status: 500 });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  const docType = String(form.get("document_type") ?? "product_document").trim() || "product_document";
  const titleRaw = String(form.get("title") ?? "").trim();
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  const filename = safeName(file.name || "product-document.pdf");
  if (!ALLOWED_EXT.has(extension(filename))) {
    return NextResponse.json({ ok: false, error: "Upload a PDF, text, CSV, or common office document." }, { status: 400 });
  }

  const filesAccountId = await resolveFilesAccountId(sb);
  if (!filesAccountId) {
    return NextResponse.json({ ok: false, error: "No account is available for product file metadata." }, { status: 500 });
  }

  const textResult = await extractProductDocumentText(file);
  const objectPath = `sales-product-intelligence/${id}/${Date.now()}_${filename}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const upload = await sb.storage.from(BUCKET).upload(objectPath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upload?.error) {
    return NextResponse.json({ ok: false, error: upload.error.message }, { status: 500 });
  }

  const { data: fileRow, error: fileErr } = await sb
    .from("files")
    .insert({
      account_id: filesAccountId,
      owner_type: "sales_product_intelligence",
      owner_id: id,
      classification: "NON_PHI",
      storage_bucket: BUCKET,
      storage_path: objectPath,
      original_filename: filename,
      mime_type: file.type || "application/octet-stream",
      byte_size: typeof file.size === "number" ? file.size : null,
      uploaded_by_user_id: auth.ctx.userId,
    })
    .select("id")
    .single();

  if (fileErr || !fileRow?.id) {
    await sb.storage.from(BUCKET).remove([objectPath]).catch(() => undefined);
    return NextResponse.json({ ok: false, error: fileErr?.message ?? "File metadata insert failed" }, { status: 500 });
  }

  const { error: docErr } = await sb.from("surgical_sales_product_intelligence_documents").insert({
    product_id: id,
    file_id: fileRow.id,
    title: titleRaw || filename,
    document_type: docType,
    extracted_text: textResult.text || null,
    extraction_status: textResult.status,
    uploaded_by_user_id: auth.ctx.userId,
    updated_at: new Date().toISOString(),
  });

  if (docErr) return NextResponse.json({ ok: false, error: docErr.message }, { status: 500 });

  return NextResponse.redirect(
    urlFromRequest(req, `/admin/sales/product-intelligence/${encodeURIComponent(id)}?uploaded=1`),
    303,
  );
}
