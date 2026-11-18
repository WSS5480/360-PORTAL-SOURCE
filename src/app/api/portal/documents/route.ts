import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function GET() {
  const portal = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(portal);
  if (unauthorized) return unauthorized;
  const accountId = portal.currentAccountId;
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected" }, { status: 401 });
  }

  const supabase: any = createSupabaseAdminClient();

  const { data: allFolders, error } = await supabase
    .from("documents_folders")
    .select(
      `
      id,
      name,
      description,
      sort_order,
      parent_id,
      account_id,
      share_mode,
      created_at,
      documents_files (
        id,
        folder_id,
        title,
        filename,
        content_type,
        size_bytes,
        external_url,
        created_at
      )
    `
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .order("created_at", { ascending: false, foreignTable: "documents_files" });

  if (error) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });

  const { data: folderAccountRows } = await supabase
    .from("documents_folder_accounts")
    .select("folder_id")
    .eq("account_id", accountId);

  const allowedFolderIds = new Set((folderAccountRows ?? []).map((r: { folder_id: string }) => r.folder_id));

  const rows = (Array.isArray(allFolders) ? allFolders : []).filter((folder: any) => {
    if (folder?.share_mode === "all") return true;
    if (folder?.share_mode !== "selected") return false;
    if (folder?.account_id === accountId) return true;
    if (allowedFolderIds.has(folder?.id)) return true;
    return false;
  });

  const sanitized = rows.map((folder: any) => ({
    ...folder,
    name: safeStr(folder?.name),
    description: safeStr(folder?.description || ""),
  }));

  return NextResponse.json({ ok: true, folders: sanitized });
}
