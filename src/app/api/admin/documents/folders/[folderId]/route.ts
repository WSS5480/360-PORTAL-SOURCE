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

function safeNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ folderId: string }> }
) {
  const admin = await requireAdminOrStaff();
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { folderId } = await Promise.resolve(ctx.params);
  if (!folderId || !UUID_RE.test(folderId)) {
    return NextResponse.json({ ok: false, error: "Invalid folderId" }, { status: 400 });
  }

  const supabase: any = createSupabaseAdminClient();
  const body = await req.json().catch(() => ({}));

  const name = safeStr(body?.name);
  const description = safeStr(body?.description || "");
  const sortOrderRaw = safeNum(body?.sort_order);
  const parentId = body?.parent_id === null || body?.parent_id === "" ? null : (typeof body?.parent_id === "string" ? body.parent_id.trim() : undefined);
  const shareMode = ["all", "admin_only", "selected"].includes(body?.share_mode) ? body.share_mode : undefined;
  const accountIds = Array.isArray(body?.account_ids) ? body.account_ids : undefined;
  const accountId = body?.account_id === null || body?.account_id === "" ? null : (typeof body?.account_id === "string" ? body.account_id.trim() : undefined);

  const updates: Record<string, any> = {};
  if (name) updates.name = name;
  if (body?.description !== undefined) updates.description = description || null;
  if (sortOrderRaw != null) updates.sort_order = sortOrderRaw;
  if (parentId !== undefined) updates.parent_id = parentId || null;
  if (shareMode !== undefined) updates.share_mode = shareMode;
  if (accountId !== undefined) updates.account_id = accountId && /^[0-9a-f-]{36}$/i.test(accountId) ? accountId : null;

  if (!Object.keys(updates).length && accountIds === undefined) {
    return NextResponse.json({ ok: false, error: "No updates provided" }, { status: 400 });
  }

  if (Object.keys(updates).length > 0) {
    const { data: updData, error: updErr } = await supabase
      .from("documents_folders")
      .update(updates)
      .eq("id", folderId)
      .select("id, name, description, sort_order, parent_id, account_id, share_mode, created_at")
      .maybeSingle();

    if (updErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
    if (!updData) return NextResponse.json({ ok: false, error: "Folder not found" }, { status: 404 });
  }

  if (accountIds !== undefined) {
    await supabase.from("documents_folder_accounts").delete().eq("folder_id", folderId);
    const ids = accountIds.filter((id: unknown) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id));
    if (ids.length > 0) {
      await supabase.from("documents_folder_accounts").insert(
        ids.map((aid: string) => ({ folder_id: folderId, account_id: aid }))
      );
    }
  }

  const { data, error } = await supabase
    .from("documents_folders")
    .select("id, name, description, sort_order, parent_id, account_id, share_mode, created_at")
    .eq("id", folderId)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Folder not found" }, { status: 404 });

  return NextResponse.json({ ok: true, folder: data });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ folderId: string }> }
) {
  const admin = await requireAdminOrStaff();
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { folderId } = await Promise.resolve(ctx.params);
  if (!folderId || !UUID_RE.test(folderId)) {
    return NextResponse.json({ ok: false, error: "Invalid folderId" }, { status: 400 });
  }

  const supabase: any = createSupabaseAdminClient();

  const { data: files, error: filesErr } = await supabase
    .from("documents_files")
    .select("id, storage_bucket, storage_path")
    .eq("folder_id", folderId);

  if (filesErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });

  const byBucket: Record<string, string[]> = {};
  (files || []).forEach((f: any) => {
    const bucket = String(f?.storage_bucket || "").trim();
    const path = String(f?.storage_path || "").trim();
    if (!bucket || !path) return;
    if (!byBucket[bucket]) byBucket[bucket] = [];
    byBucket[bucket].push(path);
  });

  for (const [bucket, paths] of Object.entries(byBucket)) {
    if (!paths.length) continue;
    const { error: removeErr } = await supabase.storage.from(bucket).remove(paths);
    if (removeErr) {
      return NextResponse.json(
        { ok: false, error: "Failed to remove files from storage" },
        { status: 500 }
      );
    }
  }

  const { error } = await supabase.from("documents_folders").delete().eq("id", folderId);
  if (error) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
