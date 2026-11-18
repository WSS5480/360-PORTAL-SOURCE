import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ fileId: string }> }
) {
  const portal = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(portal);
  if (unauthorized) return unauthorized;
  const accountId = portal.currentAccountId;
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected" }, { status: 401 });
  }

  const { fileId } = await Promise.resolve(ctx.params);
  if (!fileId || !UUID_RE.test(fileId)) {
    return NextResponse.json({ ok: false, error: "Invalid fileId" }, { status: 400 });
  }

  const supabase: any = createSupabaseAdminClient();

  const { data: fileRow, error: fileErr } = await supabase
    .from("documents_files")
    .select("id, folder_id, storage_bucket, storage_path, external_url")
    .eq("id", fileId)
    .maybeSingle();

  if (fileErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  if (!fileRow) return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });

  const folderId = String((fileRow as any).folder_id || "").trim();
  if (folderId) {
    const { data: folder, error: folderErr } = await supabase
      .from("documents_folders")
      .select("id, account_id")
      .eq("id", folderId)
      .maybeSingle();

    if (folderErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
    if (!folder || String((folder as any).account_id) !== accountId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }

  const externalUrl = String((fileRow as any).external_url || "").trim();
  if (externalUrl && (externalUrl.startsWith("http://") || externalUrl.startsWith("https://"))) {
    return NextResponse.redirect(externalUrl, 302);
  }

  const bucket = String((fileRow as any).storage_bucket || "").trim();
  const objectPath = String((fileRow as any).storage_path || "").trim();

  if (!bucket || !objectPath) {
    return NextResponse.json({ ok: false, error: "File missing storage metadata" }, { status: 404 });
  }

  const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 10);
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: "Failed to create download link" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(String(signed.signedUrl), 302);
}
