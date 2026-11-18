import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function PATCH(req: Request, ctx: { params: Promise<{ fileId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { fileId } = await ctx.params;
  if (!fileId || !UUID_RE.test(fileId)) {
    return NextResponse.json({ ok: false, error: "Invalid file id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (body?.title !== undefined) {
    const title = safeStr(body.title);
    if (!title) return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
    patch.title = title;
  }
  if (body?.sort_order !== undefined) {
    const sortOrder = Number(body.sort_order);
    if (!Number.isFinite(sortOrder)) {
      return NextResponse.json({ ok: false, error: "Invalid sort order" }, { status: 400 });
    }
    patch.sort_order = Math.round(sortOrder);
  }
  if (body?.folder_id !== undefined) {
    const folderId = safeStr(body.folder_id);
    if (!folderId || !UUID_RE.test(folderId)) {
      return NextResponse.json({ ok: false, error: "Invalid folder" }, { status: 400 });
    }
    const { data: folder, error: folderErr } = await supabaseAdmin
      .from("sales_command_document_folders")
      .select("id")
      .eq("id", folderId)
      .maybeSingle();
    if (folderErr) return NextResponse.json({ ok: false, error: folderErr.message }, { status: 500 });
    if (!folder) return NextResponse.json({ ok: false, error: "Folder not found" }, { status: 404 });
    patch.folder_id = folderId;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: false, error: "No changes provided" }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("sales_command_document_files")
    .update(patch)
    .eq("id", fileId)
    .select(
      "id, folder_id, title, filename, storage_bucket, storage_path, content_type, size_bytes, external_url, sort_order, created_at",
    )
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });

  return NextResponse.json({ ok: true, file: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ fileId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { fileId } = await ctx.params;
  if (!fileId || !UUID_RE.test(fileId)) {
    return NextResponse.json({ ok: false, error: "Invalid file id" }, { status: 400 });
  }

  const { data: fileRow, error: fileErr } = await supabaseAdmin
    .from("sales_command_document_files")
    .select("id, storage_bucket, storage_path")
    .eq("id", fileId)
    .maybeSingle();

  if (fileErr) return NextResponse.json({ ok: false, error: fileErr.message }, { status: 500 });
  if (!fileRow) return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });

  const bucket = String(fileRow.storage_bucket ?? "").trim();
  const path = String(fileRow.storage_path ?? "").trim();
  if (bucket && path) {
    const { error: removeErr } = await supabaseAdmin.storage.from(bucket).remove([path]);
    if (removeErr) {
      return NextResponse.json({ ok: false, error: "Failed to remove file from storage" }, { status: 500 });
    }
  }

  const { error: delErr } = await supabaseAdmin.from("sales_command_document_files").delete().eq("id", fileId);
  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
