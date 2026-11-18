import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BROCHURE_BUCKET = "product-assets";

function safeName(v: unknown) {
  return String(v ?? "").replace(/[^\w.\-()+ ]/g, "_");
}

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

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

  const configuredAccountId = (process.env.PRODUCT_FILES_ACCOUNT_ID ?? "").trim();
  let accountIdForFiles: string | null = UUID_RE.test(configuredAccountId) ? configuredAccountId : null;

  if (accountIdForFiles) {
    const { data: acct } = await sb.from("accounts").select("id").eq("id", accountIdForFiles).maybeSingle();
    if (!acct) accountIdForFiles = null;
  }
  if (!accountIdForFiles) {
    const { data: first } = await sb.from("accounts").select("id").limit(1).maybeSingle();
    accountIdForFiles = first?.id ? String(first.id) : null;
  }
  if (!accountIdForFiles) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No valid account for product files. Create an account first, or set PRODUCT_FILES_ACCOUNT_ID in .env.local to an existing account UUID.",
      },
      { status: 500 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  const mime = String(file.type || "").toLowerCase();
  const filename = safeName(file.name || "brochure.pdf");

  if (!mime.includes("pdf") && !filename.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ ok: false, error: "Only PDF files are allowed" }, { status: 400 });
  }

  // Ensure product exists
  const { data: product, error: prodErr } = await sb
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (prodErr) return NextResponse.json({ ok: false, error: prodErr.message }, { status: 500 });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

  const now = Date.now();
  const objectPath = `products/${productId}/brochure/${now}_${filename}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const up = await sb.storage.from(BROCHURE_BUCKET).upload(objectPath, bytes, {
    contentType: mime || "application/pdf",
    upsert: false,
  });

  if (up?.error) {
    return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });
  }

  const { data: fileRow, error: fileErr } = await sb
    .from("files")
    .insert({
      account_id: accountIdForFiles,
      owner_type: "product",
      owner_id: productId,
      classification: "NON_PHI",
      storage_bucket: BROCHURE_BUCKET,
      storage_path: objectPath,
      original_filename: filename,
      mime_type: mime || "application/pdf",
      byte_size: (file as any).size ?? null,
      uploaded_by_user_id: null,
    })
    .select("id")
    .single();

  if (fileErr) return NextResponse.json({ ok: false, error: fileErr.message }, { status: 500 });

  const { error: updErr } = await sb
    .from("products")
    .update({ brochure_file_id: fileRow.id, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, productId, brochure_file_id: fileRow.id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  await requireOrdersStaffOrAdmin();

  const sb: any = createSupabaseAdminClient();
  const { productId: rawProductId } = await Promise.resolve(params as any);
  const productId = String(rawProductId ?? "").trim();

  if (!UUID_RE.test(productId)) {
    return NextResponse.json({ ok: false, error: "Invalid productId" }, { status: 400 });
  }

  // Clear the link only (we keep the files row + storage object for now)
  const { error } = await sb
    .from("products")
    .update({ brochure_file_id: null, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
