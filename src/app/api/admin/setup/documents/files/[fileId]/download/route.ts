import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, ctx: { params: Promise<{ fileId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { fileId } = await ctx.params;
  if (!fileId || !UUID_RE.test(fileId)) {
    return NextResponse.json({ ok: false, error: "Invalid file id" }, { status: 400 });
  }

  const { data: fileRow, error: fileErr } = await supabaseAdmin
    .from("sales_command_document_files")
    .select("id, storage_bucket, storage_path, external_url, title, filename")
    .eq("id", fileId)
    .maybeSingle();

  if (fileErr) return NextResponse.json({ ok: false, error: fileErr.message }, { status: 500 });
  if (!fileRow) return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });

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
