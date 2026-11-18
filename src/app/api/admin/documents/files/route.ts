import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/admin/requireAdminOrStaff";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "documents-private";
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

export async function GET(req: Request) {
  const admin = await requireAdminOrStaff();
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const supabase: any = createSupabaseAdminClient();
  const url = new URL(req.url);
  const folderId = safeStr(url.searchParams.get("folderId") || "");

  let query = supabase
    .from("documents_files")
    .select("id, folder_id, title, filename, storage_bucket, storage_path, content_type, size_bytes, external_url, created_at")
    .order("created_at", { ascending: false });

  if (folderId && UUID_RE.test(folderId)) query = query.eq("folder_id", folderId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });

  return NextResponse.json({ ok: true, files: data ?? [] });
}

function isValidUrl(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const admin = await requireAdminOrStaff();
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const supabase: any = createSupabaseAdminClient();
  const form = await req.formData();

  const folderId = safeStr(form.get("folderId"));
  const title = safeStr(form.get("title"));
  const file = form.get("file");
  const externalUrl = safeStr(form.get("externalUrl"));

  if (!folderId || !UUID_RE.test(folderId)) {
    return NextResponse.json({ ok: false, error: "Invalid folderId" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ ok: false, error: "Document title is required" }, { status: 400 });
  }

  const { data: folder, error: folderErr } = await supabase
    .from("documents_folders")
    .select("id")
    .eq("id", folderId)
    .maybeSingle();
  if (folderErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  if (!folder) return NextResponse.json({ ok: false, error: "Folder not found" }, { status: 404 });

  // Link entry (YouTube, etc.) — no file upload
  if (externalUrl) {
    if (!isValidUrl(externalUrl)) {
      return NextResponse.json({ ok: false, error: "Valid URL is required (e.g. https://www.youtube.com/watch?v=...)" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("documents_files")
      .insert({
        folder_id: folderId,
        title,
        filename: null,
        storage_bucket: BUCKET,
        storage_path: null,
        content_type: "video/youtube",
        size_bytes: null,
        external_url: externalUrl,
      })
      .select("id, folder_id, title, filename, storage_bucket, storage_path, content_type, size_bytes, external_url, created_at")
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
    return NextResponse.json({ ok: true, file: data });
  }

  // File upload
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Select a file to upload, or add a link (title + URL)" }, { status: 400 });
  }

  const safeName = safeFilename(file.name || "document");
  const storagePath = `documents/${folderId}/${Date.now()}-${safeName}`;

  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (uploadErr) {
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("documents_files")
    .insert({
      folder_id: folderId,
      title,
      filename: file.name || safeName,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      content_type: file.type || null,
      size_bytes: typeof file.size === "number" ? file.size : null,
    })
    .select("id, folder_id, title, filename, storage_bucket, storage_path, content_type, size_bytes, external_url, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });

  return NextResponse.json({ ok: true, file: data });
}
