import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { canViewSalesCommandDocumentFolder } from "@/lib/sales-command/salesCommandDocumentAccess";
import type { SalesCommandDocumentAccessLevel } from "@/lib/sales-command/salesCommandDocumentTypes";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, ctx: { params: Promise<{ fileId: string }> }) {
  const user = await requireUser();
  const isRep = await userIsInternalSalesRep(user.id);
  if (!isRep) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { fileId } = await ctx.params;
  if (!fileId || !UUID_RE.test(fileId)) {
    return NextResponse.json({ ok: false, error: "Invalid file id" }, { status: 400 });
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("user_profiles")
    .select("is_internal_sales_rep, is_territory_manager")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileErr) return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });

  const viewer = {
    isInternalSalesRep: profile?.is_internal_sales_rep === true,
    isTerritoryManager: profile?.is_territory_manager === true,
  };

  const { data: fileRow, error: fileErr } = await supabaseAdmin
    .from("sales_command_document_files")
    .select("id, folder_id, storage_bucket, storage_path, external_url, title, filename")
    .eq("id", fileId)
    .maybeSingle();

  if (fileErr) return NextResponse.json({ ok: false, error: fileErr.message }, { status: 500 });
  if (!fileRow) return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });

  const { data: folder, error: folderErr } = await supabaseAdmin
    .from("sales_command_document_folders")
    .select("id, access_level")
    .eq("id", fileRow.folder_id)
    .maybeSingle();

  if (folderErr) return NextResponse.json({ ok: false, error: folderErr.message }, { status: 500 });
  if (!folder) return NextResponse.json({ ok: false, error: "Folder not found" }, { status: 404 });

  const accessLevel = folder.access_level as SalesCommandDocumentAccessLevel;
  if (!canViewSalesCommandDocumentFolder(accessLevel, viewer)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const externalUrl = String(fileRow.external_url ?? "").trim();
  if (externalUrl && (externalUrl.startsWith("http://") || externalUrl.startsWith("https://"))) {
    return NextResponse.redirect(externalUrl, 302);
  }

  const bucket = String(fileRow.storage_bucket ?? "").trim();
  const objectPath = String(fileRow.storage_path ?? "").trim();
  if (!bucket || !objectPath) {
    return NextResponse.json({ ok: false, error: "File missing storage metadata" }, { status: 404 });
  }

  const { data: signed, error: signErr } = await supabaseAdmin.storage.from(bucket).createSignedUrl(objectPath, 60 * 10);
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ ok: false, error: "Failed to create download link" }, { status: 500 });
  }

  return NextResponse.redirect(String(signed.signedUrl), 302);
}
