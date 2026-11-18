// src/app/api/admin/ivr-files/[fileId]/download/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await ctx.params;

  if (!fileId || fileId === "undefined") {
    return NextResponse.json({ ok: false, error: "Missing fileId" }, { status: 400 });
  }

  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: file, error: fileErr } = await supabaseAdmin
    .from("ivr_files")
    .select("id, ivr_request_id, bucket, object_path, file_type")
    .eq("id", fileId)
    .maybeSingle();

  if (fileErr) {
    return NextResponse.json({ ok: false, error: fileErr.message }, { status: 500 });
  }
  if (!file) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const expiresInSeconds = 60;
  const safeType = (file.file_type || "FILE").toString().replace(/[^A-Z0-9_]/gi, "_");
  const downloadName = `${safeType}_${file.id}`;

  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from(file.bucket)
    .createSignedUrl(file.object_path, expiresInSeconds, { download: downloadName });

  if (signErr) {
    return NextResponse.json({ ok: false, error: signErr.message }, { status: 500 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const userAgent = req.headers.get("user-agent");

  await supabaseAdmin.from("ivr_audit_log").insert({
    ivr_request_id: file.ivr_request_id,
    actor_user_id: admin.user.id,
    action: "FILE_DOWNLOAD",
    meta: {
      file_id: file.id,
      file_type: file.file_type,
      bucket: file.bucket,
      expires_in_seconds: expiresInSeconds,
    },
    ip,
    user_agent: userAgent,
  });

  return NextResponse.json({ ok: true, url: signed?.signedUrl, expires_in_seconds: expiresInSeconds });
}
