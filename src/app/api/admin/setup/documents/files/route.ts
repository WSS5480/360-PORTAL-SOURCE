import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "documents-private";
/** Soft guard so users get a clear message before storage/proxy rejects the body. */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeFilename(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "document";
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function storageErrorMessage(err: { message?: string; statusCode?: string | number; error?: string } | null): string {
  const raw = [err?.message, err?.error].filter(Boolean).join(" — ").trim();
  const lower = raw.toLowerCase();
  if (!raw) return "Storage upload failed";
  if (lower.includes("maximum allowed size") || lower.includes("entity too large") || lower.includes("payload too large")) {
    return `File is too large (max ${formatBytes(MAX_UPLOAD_BYTES)})`;
  }
  if (lower.includes("mime type") || lower.includes("not supported")) {
    return `This file type is not allowed (${raw})`;
  }
  if (lower.includes("bucket not found")) {
    return "Document storage bucket is missing. Contact an admin.";
  }
  if (lower.includes("row-level security") || lower.includes("unauthorized") || lower.includes("permission")) {
    return "Storage permission denied. Contact an admin.";
  }
  return raw;
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not read upload body";
    const lower = msg.toLowerCase();
    if (lower.includes("large") || lower.includes("size") || lower.includes("413")) {
      return NextResponse.json(
        { ok: false, error: `Upload body is too large (max ${formatBytes(MAX_UPLOAD_BYTES)} per file)` },
        { status: 413 },
      );
    }
    return NextResponse.json({ ok: false, error: `Could not read upload: ${msg}` }, { status: 400 });
  }

  const folderId = safeStr(form.get("folderId"));
  const title = safeStr(form.get("title"));
  const file = form.get("file");
  const externalUrl = safeStr(form.get("externalUrl"));

  if (!folderId || !UUID_RE.test(folderId)) {
    return NextResponse.json({ ok: false, error: "Invalid folder" }, { status: 400 });
  }
  if (!title) return NextResponse.json({ ok: false, error: "Document title is required" }, { status: 400 });

  const { data: folder, error: folderErr } = await supabaseAdmin
    .from("sales_command_document_folders")
    .select("id")
    .eq("id", folderId)
    .maybeSingle();
  if (folderErr) return NextResponse.json({ ok: false, error: folderErr.message }, { status: 500 });
  if (!folder) return NextResponse.json({ ok: false, error: "Folder not found" }, { status: 404 });

  if (externalUrl) {
    if (!isValidUrl(externalUrl)) {
      return NextResponse.json({ ok: false, error: "Enter a valid URL (https://...)" }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from("sales_command_document_files")
      .insert({
        folder_id: folderId,
        title,
        filename: null,
        storage_bucket: BUCKET,
        storage_path: null,
        content_type: "text/uri-list",
        size_bytes: null,
        external_url: externalUrl,
      })
      .select(
        "id, folder_id, title, filename, storage_bucket, storage_path, content_type, size_bytes, external_url, sort_order, created_at",
      )
      .maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, file: data });
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Choose a file or add a link" }, { status: 400 });
  }

  if (typeof file.size === "number" && file.size <= 0) {
    return NextResponse.json({ ok: false, error: `“${file.name || title}” is empty` }, { status: 400 });
  }
  if (typeof file.size === "number" && file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: `“${file.name || title}” is ${formatBytes(file.size)} — max is ${formatBytes(MAX_UPLOAD_BYTES)}`,
      },
      { status: 413 },
    );
  }

  const safeName = safeFilename(file.name || "document");
  const storagePath = `sales-command/${folderId}/${Date.now()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadErr } = await supabaseAdmin.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadErr) {
    console.error("[admin/setup/documents/files] storage upload failed", {
      filename: file.name,
      size: file.size,
      contentType: file.type,
      storagePath,
      uploadErr,
    });
    return NextResponse.json({ ok: false, error: storageErrorMessage(uploadErr) }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("sales_command_document_files")
    .insert({
      folder_id: folderId,
      title,
      filename: file.name || safeName,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      content_type: file.type || null,
      size_bytes: file.size,
      external_url: null,
    })
    .select(
      "id, folder_id, title, filename, storage_bucket, storage_path, content_type, size_bytes, external_url, sort_order, created_at",
    )
    .maybeSingle();

  if (error) {
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, file: data });
}
