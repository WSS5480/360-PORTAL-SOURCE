import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isPortalCustomer } from "@/lib/portal/portalRoles";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  return s.split("?")[0].split("#")[0].trim();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;

  const accountId = ctx.currentAccountId;
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected." }, { status: 401 });
  }

  // ✅ NEW: one portal role only (customer access)
  if (!isPortalCustomer(ctx.currentRole)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden", detail: `Role '${ctx.currentRole || "NONE"}' is not permitted to access brochures.` },
      { status: 403 }
    );
  }

  const resolved = await Promise.resolve(params as any);
  const productId = normalizeParam(resolved?.productId ?? "");
  if (!UUID_RE.test(productId)) {
    return NextResponse.json({ ok: false, error: "Invalid productId" }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();

  // Load product brochure_file_id
  const { data: product, error: pErr } = await sb
    .from("products")
    .select("id, brochure_file_id")
    .eq("id", productId)
    .maybeSingle();

  if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

  const brochureFileId = product.brochure_file_id ? String(product.brochure_file_id) : "";
  if (!brochureFileId || !UUID_RE.test(brochureFileId)) {
    return NextResponse.json({ ok: false, error: "No brochure available for this product." }, { status: 404 });
  }

  // Get storage info from files table
  const { data: fileRow, error: fErr } = await sb
    .from("files")
    .select("id, storage_bucket, storage_path, original_filename, classification, owner_type, owner_id")
    .eq("id", brochureFileId)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!fileRow) return NextResponse.json({ ok: false, error: "Brochure file not found." }, { status: 404 });

  // Safety: must be product-owned NON_PHI brochure
  if (String(fileRow.owner_type ?? "") !== "product" || String(fileRow.owner_id ?? "") !== String(productId)) {
    return NextResponse.json({ ok: false, error: "Invalid brochure mapping." }, { status: 404 });
  }
  if (String(fileRow.classification ?? "") !== "NON_PHI") {
    return NextResponse.json({ ok: false, error: "Brochure is not available." }, { status: 404 });
  }

  const bucket = String(fileRow.storage_bucket ?? "");
  const path = String(fileRow.storage_path ?? "");
  if (!bucket || !path) {
    return NextResponse.json({ ok: false, error: "Brochure storage path is missing." }, { status: 500 });
  }

  // Create a short-lived signed URL and redirect
  const signed = await sb.storage.from(bucket).createSignedUrl(path, 60);
  if (signed?.error) {
    return NextResponse.json({ ok: false, error: signed.error.message }, { status: 500 });
  }

  const url = signed?.data?.signedUrl ? String(signed.data.signedUrl) : "";
  if (!url) {
    return NextResponse.json({ ok: false, error: "Unable to generate brochure link." }, { status: 500 });
  }

  return NextResponse.redirect(new URL(url), { status: 302 });
}
