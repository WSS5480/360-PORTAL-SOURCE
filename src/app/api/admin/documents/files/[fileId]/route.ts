import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/admin/requireAdminOrStaff";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ fileId: string }> }
) {
  const admin = await requireAdminOrStaff();
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { fileId } = await Promise.resolve(ctx.params);
  if (!fileId || !UUID_RE.test(fileId)) {
    return NextResponse.json({ ok: false, error: "Invalid fileId" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const folderId = safeStr((raw as { folder_id?: unknown } | null)?.folder_id);
  if (!folderId || !UUID_RE.test(folderId)) {
    return NextResponse.json({ ok: false, error: "Invalid folder_id" }, { status: 400 });
  }

  const supabase: any = createSupabaseAdminClient();

  const { data: targetFolder, error: folderErr } = await supabase
    .from("documents_folders")
    .select("id")
    .eq("id", folderId)
    .maybeSingle();
  if (folderErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  if (!targetFolder) return NextResponse.json({ ok: false, error: "Folder not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("documents_files")
    .update({ folder_id: folderId })
    .eq("id", fileId)
    .select("id, folder_id, title, filename, storage_bucket, storage_path, content_type, size_bytes, external_url, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });

  return NextResponse.json({ ok: true, file: data });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ fileId: string }> }
) {
  const admin = await requireAdminOrStaff();
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { fileId } = await Promise.resolve(ctx.params);
  if (!fileId || !UUID_RE.test(fileId)) {
    return NextResponse.json({ ok: false, error: "Invalid fileId" }, { status: 400 });
  }

  const supabase: any = createSupabaseAdminClient();

  const { data: fileRow, error: fileErr } = await supabase
    .from("documents_files")
    .select("id, storage_bucket, storage_path")
    .eq("id", fileId)
    .maybeSingle();

  if (fileErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  if (!fileRow) return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });

  const bucket = String((fileRow as any).storage_bucket || "").trim();
  const path = String((fileRow as any).storage_path || "").trim();
  if (bucket && path) {
    const { error: removeErr } = await supabase.storage.from(bucket).remove([path]);
    if (removeErr) {
      return NextResponse.json(
        { ok: false, error: "Failed to remove file from storage" },
        { status: 500 }
      );
    }
  }

  const { error: delErr } = await supabase.from("documents_files").delete().eq("id", fileId);
  if (delErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
