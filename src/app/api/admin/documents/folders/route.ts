import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/admin/requireAdminOrStaff";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  const admin = await requireAdminOrStaff();
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const supabase: any = createSupabaseAdminClient();
  const url = new URL(req.url);
  const q = safeStr(url.searchParams.get("q") || "").toLowerCase();
  const accountIdFilter = safeStr(url.searchParams.get("accountId") || "");

  // Fetch folders (avoid embedded select which can fail with some Supabase/PostgREST setups)
  const { data: foldersData, error: foldersErr } = await supabase
    .from("documents_folders")
    .select("id, name, description, sort_order, parent_id, account_id, share_mode, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (foldersErr) {
    const errMsg = String(foldersErr?.message ?? foldersErr?.error_description ?? JSON.stringify(foldersErr));
    console.error("[admin/documents/folders] Supabase error:", foldersErr);
    return NextResponse.json(
      { ok: false, error: "Request failed", detail: errMsg },
      { status: 500 }
    );
  }

  const folderRows = Array.isArray(foldersData) ? foldersData : [];
  const folderIds = folderRows.map((f: { id: string }) => f.id);

  // Fetch files for all folders
  let filesByFolder: Record<string, any[]> = {};
  if (folderIds.length > 0) {
    const { data: filesData, error: filesErr } = await supabase
      .from("documents_files")
      .select("id, folder_id, title, filename, storage_bucket, storage_path, content_type, size_bytes, external_url, created_at")
      .in("folder_id", folderIds)
      .order("created_at", { ascending: false });

    if (filesErr) {
      console.error("[admin/documents/folders] Files error:", filesErr);
    } else if (Array.isArray(filesData)) {
      for (const f of filesData) {
        const fid = f?.folder_id;
        if (fid) {
          if (!filesByFolder[fid]) filesByFolder[fid] = [];
          filesByFolder[fid].push(f);
        }
      }
    }
  }

  // Fetch folder_accounts for all folders
  let accountsByFolder: Record<string, { account_id: string }[]> = {};
  if (folderIds.length > 0) {
    const { data: faData, error: faErr } = await supabase
      .from("documents_folder_accounts")
      .select("folder_id, account_id")
      .in("folder_id", folderIds);

    if (faErr) {
      console.error("[admin/documents/folders] Folder accounts error:", faErr);
    } else if (Array.isArray(faData)) {
      for (const r of faData) {
        const fid = r?.folder_id;
        if (fid) {
          if (!accountsByFolder[fid]) accountsByFolder[fid] = [];
          accountsByFolder[fid].push({ account_id: r.account_id });
        }
      }
    }
  }

  const fullRows = folderRows.map((f: any) => ({
    ...f,
    documents_files: filesByFolder[f.id] ?? [],
    documents_folder_accounts: accountsByFolder[f.id] ?? [],
  }));

  /** Portal-visible folders per account (share all, or selected + linked to account). */
  function folderVisibleToAccount(f: any, accountId: string): boolean {
    if (f?.share_mode === "all") return true;
    if (f?.share_mode !== "selected") return false;
    if (f?.account_id === accountId) return true;
    const links: { account_id: string }[] = Array.isArray(f?.documents_folder_accounts) ? f.documents_folder_accounts : [];
    return links.some((r) => r?.account_id === accountId);
  }

  const { data: accountsList } = await supabase.from("accounts").select("id, name").order("name", { ascending: true }).limit(500);

  const accountSummaries: { account_id: string; name: string; file_count: number; folder_count: number }[] = [];
  for (const acc of Array.isArray(accountsList) ? accountsList : []) {
    const aid = String((acc as { id?: string })?.id || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(aid)) continue;
    let fileCount = 0;
    let folderCount = 0;
    for (const f of fullRows) {
      if (!folderVisibleToAccount(f, aid)) continue;
      folderCount += 1;
      fileCount += (Array.isArray(f.documents_files) ? f.documents_files : []).length;
    }
    accountSummaries.push({
      account_id: aid,
      name: String((acc as { name?: string })?.name || "Unnamed"),
      file_count: fileCount,
      folder_count: folderCount,
    });
  }

  let rows = fullRows;

  if (accountIdFilter === "__admin_only__") {
    rows = rows.filter((f: any) => f?.share_mode === "admin_only");
  } else if (accountIdFilter === "__all_accounts__") {
    rows = rows.filter((f: any) => f?.share_mode === "all");
  } else if (accountIdFilter && /^[0-9a-f-]{36}$/i.test(accountIdFilter)) {
    const { data: faRows } = await supabase
      .from("documents_folder_accounts")
      .select("folder_id")
      .eq("account_id", accountIdFilter);
    const folderIds = new Set((faRows ?? []).map((r: { folder_id: string }) => r.folder_id));
    rows = rows.filter(
      (f: any) =>
        f?.share_mode === "all" ||
        f?.account_id === accountIdFilter ||
        folderIds.has(f?.id)
    );
  }
  if (q) {
    rows = rows.filter((folder: any) => {
      const name = safeStr(folder?.name).toLowerCase();
      const desc = safeStr(folder?.description).toLowerCase();
      const files = Array.isArray(folder?.documents_files) ? folder.documents_files : [];
      const fileMatch = files.some((f: any) => {
        const t = safeStr(f?.title).toLowerCase();
        const fn = safeStr(f?.filename).toLowerCase();
        const url = safeStr(f?.external_url).toLowerCase();
        return t.includes(q) || fn.includes(q) || url.includes(q);
      });
      return name.includes(q) || desc.includes(q) || fileMatch;
    });
  }

  return NextResponse.json({ ok: true, folders: rows, accountSummaries });
}

export async function POST(req: Request) {
  const admin = await requireAdminOrStaff();
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const supabase: any = createSupabaseAdminClient();
  const body = await req.json().catch(() => ({}));

  const name = safeStr(body?.name);
  const description = safeStr(body?.description || "");
  const sortOrderRaw = safeNum(body?.sort_order);
  const parentId = typeof body?.parent_id === "string" && body.parent_id.trim() ? body.parent_id.trim() : null;
  const shareMode = ["all", "admin_only", "selected"].includes(body?.share_mode) ? body.share_mode : "admin_only";
  const accountIds = Array.isArray(body?.account_ids) ? body.account_ids : [];
  const accountId = typeof body?.account_id === "string" && body.account_id.trim() ? body.account_id.trim() : null;

  if (!name) return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
  if (shareMode === "selected" && !accountId && accountIds.length === 0) {
    return NextResponse.json({ ok: false, error: "Select at least one account when share mode is 'selected'" }, { status: 400 });
  }

  const ids = accountIds.filter((id: unknown) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id));
  if (accountId && !ids.includes(accountId)) ids.unshift(accountId);

  const insertPayload: Record<string, unknown> = {
    name,
    description: description || null,
    sort_order: sortOrderRaw ?? 0,
    share_mode: shareMode,
    account_id: shareMode === "selected" && ids[0] ? ids[0] : null,
  };
  if (parentId) insertPayload.parent_id = parentId;

  const { data, error } = await supabase
    .from("documents_folders")
    .insert(insertPayload)
    .select("id, name, description, sort_order, parent_id, account_id, share_mode, created_at")
    .maybeSingle();

  if (error) {
    console.error("[admin/documents/folders POST] Supabase error:", error);
    return NextResponse.json(
      { ok: false, error: process.env.NODE_ENV === "development" ? error.message : "Request failed" },
      { status: 500 }
    );
  }

  if (data?.id && shareMode === "selected" && ids.length > 0) {
    await supabase.from("documents_folder_accounts").insert(
      ids.map((aid: string) => ({ folder_id: data.id, account_id: aid }))
    );
  }

  return NextResponse.json({ ok: true, folder: data });
}
