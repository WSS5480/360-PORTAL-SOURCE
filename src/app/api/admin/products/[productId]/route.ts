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

async function maybeRemoveObject(sb: any, objectPath: string) {
  try {
    await sb.storage.from(BROCHURE_BUCKET).remove([objectPath]);
  } catch {
    // best-effort cleanup only
  }
}

/**
 * Picks the correct account_id for the files row:
 * - Prefer products.account_id if the column exists and value is a UUID
 * - Else use PRODUCT_FILES_ACCOUNT_ID env var
 * Then validates it exists in accounts (to avoid FK violation).
 */
async function resolveFilesAccountId(sb: any, productId: string): Promise<{ ok: true; accountId: string } | { ok: false; error: string }> {
  const fallback = mustGetEnv("PRODUCT_FILES_ACCOUNT_ID").trim();

  if (!UUID_RE.test(fallback)) {
    return { ok: false, error: "PRODUCT_FILES_ACCOUNT_ID must be a UUID" };
  }

  // Attempt to read products.account_id if present. If the column doesn't exist,
  // Supabase/PostgREST will return an error; we then fall back to env.
  let chosen = fallback;

  const prodTry = await sb
    .from("products")
    .select("id, account_id")
    .eq("id", productId)
    .maybeSingle();

  if (prodTry?.error) {
    // If account_id column doesn't exist, we'll ignore and fall back.
    // But still handle "product not found" separately elsewhere.
    chosen = fallback;
  } else if (prodTry?.data) {
    const candidate = String((prodTry.data as any).account_id ?? "").trim();
    if (UUID_RE.test(candidate)) chosen = candidate;
  }

  // Validate the chosen account exists to prevent FK violation
  const acct = await sb.from("accounts").select("id").eq("id", chosen).maybeSingle();
  if (acct?.error) {
    return { ok: false, error: `Failed to validate account_id for files insert: ${acct.error.message}` };
  }
  if (!acct?.data) {
    return {
      ok: false,
      error:
        `Invalid files.account_id (${chosen}). ` +
        `Fix by setting PRODUCT_FILES_ACCOUNT_ID to a real accounts.id, ` +
        `or by ensuring products.account_id is populated with a valid accounts.id.`,
    };
  }

  return { ok: true, accountId: chosen };
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

  const form = await req.formData();
  const file = form.get("file");

  // If no file: treat as product update (e.g. Deactivate/Activate from products table)
  if (!(file instanceof File)) {
    const name = String(form.get("name") ?? "").trim();
    const code = String(form.get("code") ?? "").trim() || null;
    const qcode = String(form.get("qcode") ?? "").trim() || null;
    const baseUnitPrice = Number(form.get("base_unit_price"));
    const isActiveRaw = form.get("is_active");
    const isActive = isActiveRaw === "on" || isActiveRaw === "true" || isActiveRaw === "1";
    const settingsForm = form.get("product_settings") === "1";

    let beforeBulk = false;
    if (settingsForm) {
      const { data: existing } = await sb.from("products").select("bulk_enabled").eq("id", productId).maybeSingle();
      beforeBulk = !!(existing as any)?.bulk_enabled;
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name) updates.name = name;
    if (code !== undefined) updates.code = code;
    if (qcode !== undefined) updates.qcode = qcode;
    if (Number.isFinite(baseUnitPrice)) updates.base_unit_price = baseUnitPrice;
    if (isActiveRaw !== undefined && isActiveRaw !== null) updates.is_active = isActive;
    if (settingsForm) {
      const bulkEnabled = form.get("bulk_enabled") === "on";
      updates.bulk_enabled = bulkEnabled;
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ ok: false, error: "No updates provided" }, { status: 400 });
    }

    const { error: updErr } = await sb.from("products").update(updates).eq("id", productId);
    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

    if (settingsForm) {
      const bulkEnabled = form.get("bulk_enabled") === "on";
      if (bulkEnabled && !beforeBulk) {
        await sb.from("product_variants").update({ bulk_enabled: true }).eq("product_id", productId);
      } else if (!bulkEnabled && beforeBulk) {
        await sb.from("product_variants").update({ bulk_enabled: false }).eq("product_id", productId);
      }
    }

    // Redirect back to products list with success message (form POST, so user would see JSON otherwise)
    const base = new URL(req.url).origin;
    const referer = req.headers.get("referer") || "";
    const back = referer && referer.includes("/admin/products") ? referer : `${base}/admin/products`;
    const u = new URL(back);
    u.searchParams.set("updated", "1");
    return NextResponse.redirect(u.toString(), 303);
  }

  const mime = String(file.type || "").toLowerCase();
  const filename = safeName(file.name || "brochure.pdf");

  if (!mime.includes("pdf") && !filename.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ ok: false, error: "Only PDF files are allowed" }, { status: 400 });
  }

  // Ensure product exists (cheap check)
  const { data: product, error: prodErr } = await sb
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (prodErr) return NextResponse.json({ ok: false, error: prodErr.message }, { status: 500 });
  if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

  // Resolve and validate account_id BEFORE uploading to storage
  let filesAccountId: string;
  try {
    const resolved = await resolveFilesAccountId(sb, productId);
    if (!resolved.ok) {
      return NextResponse.json({ ok: false, error: resolved.error }, { status: 500 });
    }
    filesAccountId = resolved.accountId;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ? String(e.message) : "Failed to resolve files account_id" },
      { status: 500 }
    );
  }

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

  // Create files row (and cleanup storage if this fails)
  const { data: fileRow, error: fileErr } = await sb
    .from("files")
    .insert({
      account_id: filesAccountId,
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

  if (fileErr) {
    await maybeRemoveObject(sb, objectPath);
    // Add a more actionable hint if it looks like the FK again
    const msg = String(fileErr.message || "");
    const hint =
      msg.includes("files_account_id_fkey") || msg.toLowerCase().includes("foreign key")
        ? " (Hint: files.account_id must reference an existing accounts.id. Check PRODUCT_FILES_ACCOUNT_ID or products.account_id.)"
        : "";
    return NextResponse.json({ ok: false, error: msg + hint }, { status: 500 });
  }

  // Link brochure to product (and cleanup if this fails)
  const { error: updErr } = await sb
    .from("products")
    .update({ brochure_file_id: fileRow.id, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (updErr) {
    await maybeRemoveObject(sb, objectPath);
    // best-effort cleanup the files row too
    try {
      await sb.from("files").delete().eq("id", fileRow.id);
    } catch {}
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

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
