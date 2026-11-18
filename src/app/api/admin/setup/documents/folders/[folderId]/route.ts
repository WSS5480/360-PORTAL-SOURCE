import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { isSalesCommandDocumentAccessLevel } from "@/lib/sales-command/salesCommandDocumentTypes";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function PATCH(req: Request, ctx: { params: Promise<{ folderId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { folderId } = await ctx.params;
  if (!folderId || !UUID_RE.test(folderId)) {
    return NextResponse.json({ ok: false, error: "Invalid folder id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (body?.name !== undefined) {
    const name = safeStr(body.name);
    if (!name) return NextResponse.json({ ok: false, error: "Folder name is required" }, { status: 400 });
    patch.name = name;
  }
  if (body?.description !== undefined) patch.description = safeStr(body.description) || null;
  if (body?.access_level !== undefined) {
    const accessLevel = safeStr(body.access_level);
    if (!isSalesCommandDocumentAccessLevel(accessLevel)) {
      return NextResponse.json({ ok: false, error: "Invalid access level" }, { status: 400 });
    }
    patch.access_level = accessLevel;
  }
  if (body?.sort_order !== undefined) {
    const sortOrder = Number(body.sort_order);
    if (!Number.isFinite(sortOrder)) {
      return NextResponse.json({ ok: false, error: "Invalid sort order" }, { status: 400 });
    }
    patch.sort_order = Math.round(sortOrder);
  }
  if (body?.parent_id !== undefined) {
    const parentId = safeStr(body.parent_id) || null;
    if (parentId === folderId) {
      return NextResponse.json({ ok: false, error: "A folder cannot be its own parent" }, { status: 400 });
    }
    if (parentId && !UUID_RE.test(parentId)) {
      return NextResponse.json({ ok: false, error: "Invalid parent folder" }, { status: 400 });
    }
    if (parentId) {
      const { data: parent, error: parentErr } = await supabaseAdmin
        .from("sales_command_document_folders")
        .select("id")
        .eq("id", parentId)
        .maybeSingle();
      if (parentErr) return NextResponse.json({ ok: false, error: parentErr.message }, { status: 500 });
      if (!parent) return NextResponse.json({ ok: false, error: "Parent folder not found" }, { status: 404 });
    }
    patch.parent_id = parentId;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: false, error: "No changes provided" }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("sales_command_document_folders")
    .update(patch)
    .eq("id", folderId)
    .select("id, parent_id, name, description, access_level, sort_order, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Folder not found" }, { status: 404 });

  return NextResponse.json({ ok: true, folder: data });
}

async function collectDescendantFolderIds(rootId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("sales_command_document_folders")
    .select("id, parent_id");
  if (error) throw new Error(error.message);

  const byParent = new Map<string | null, string[]>();
  for (const row of data ?? []) {
    const parentId = row.parent_id ? String(row.parent_id) : null;
    const bucket = byParent.get(parentId) ?? [];
    bucket.push(String(row.id));
    byParent.set(parentId, bucket);
  }

  const ids: string[] = [];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    ids.push(id);
    for (const childId of byParent.get(id) ?? []) queue.push(childId);
  }
  return ids;
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ folderId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { folderId } = await ctx.params;
  if (!folderId || !UUID_RE.test(folderId)) {
    return NextResponse.json({ ok: false, error: "Invalid folder id" }, { status: 400 });
  }

  try {
    const folderIds = await collectDescendantFolderIds(folderId);
    const { data: files, error: filesErr } = await supabaseAdmin
      .from("sales_command_document_files")
      .select("id, storage_bucket, storage_path")
      .in("folder_id", folderIds);
    if (filesErr) return NextResponse.json({ ok: false, error: filesErr.message }, { status: 500 });

    const pathsByBucket = new Map<string, string[]>();
    for (const file of files ?? []) {
      const bucket = String(file.storage_bucket ?? "").trim();
      const path = String(file.storage_path ?? "").trim();
      if (!bucket || !path) continue;
      const bucketPaths = pathsByBucket.get(bucket) ?? [];
      bucketPaths.push(path);
      pathsByBucket.set(bucket, bucketPaths);
    }

    for (const [bucket, paths] of pathsByBucket) {
      if (!paths.length) continue;
      const { error: removeErr } = await supabaseAdmin.storage.from(bucket).remove(paths);
      if (removeErr) {
        return NextResponse.json({ ok: false, error: "Failed to remove files from storage" }, { status: 500 });
      }
    }

    const { error: delErr } = await supabaseAdmin
      .from("sales_command_document_folders")
      .delete()
      .eq("id", folderId);
    if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 },
    );
  }
}
