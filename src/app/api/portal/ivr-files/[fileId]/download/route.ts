import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isPortalIvrRowViewable } from "@/lib/portal/portalRowScope";

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
  const { fileId } = await Promise.resolve(ctx.params);

  const accountId = portal.currentAccountId;
  if (!accountId) {
    return NextResponse.json({ error: "No account selected" }, { status: 401 });
  }
  if (!fileId || !UUID_RE.test(fileId)) {
    return NextResponse.json({ error: "Invalid fileId" }, { status: 400 });
  }

  const supabase: any = createSupabaseAdminClient();

  // Load file row
  const { data: fileRow, error: fileErr } = await supabase
    .from("ivr_files")
    .select("id, ivr_request_id, bucket, object_path, file_type, created_at")
    .eq("id", fileId)
    .maybeSingle();

  if (fileErr) {
    return NextResponse.json({ error: "Failed to load ivr_files", detail: fileErr.message }, { status: 500 });
  }
  if (!fileRow) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const bucket = String((fileRow as any).bucket || "").trim();
  const objectPath = String((fileRow as any).object_path || "").trim();
  const ivrRequestId = String((fileRow as any).ivr_request_id || "").trim();

  if (!bucket || !objectPath || !ivrRequestId) {
    return NextResponse.json(
      { error: "File is missing bucket/object_path/ivr_request_id" },
      { status: 404 }
    );
  }

  // Ensure the IVR belongs to this portal account
  const { data: ivr, error: ivrErr } = await supabase
    .from("ivr_requests")
    .select("id, account_id, submitted_by_user_id, created_by_user_id")
    .eq("id", ivrRequestId)
    .maybeSingle();

  if (ivrErr) {
    return NextResponse.json({ error: "Failed to load IVR", detail: ivrErr.message }, { status: 500 });
  }
  if (!ivr) {
    return NextResponse.json({ error: "IVR not found for this file" }, { status: 404 });
  }
  if (String((ivr as any).account_id) !== accountId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const viewerUserId = String((portal.user as any)?.id ?? "");
  if (!isPortalIvrRowViewable(portal.currentRole, viewerUserId, ivr as any, accountId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Create signed URL
  const expiresInSeconds = 60 * 10;
  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresInSeconds);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      {
        error: "Failed to create signed URL (object may not exist in storage)",
        detail: signErr?.message || "unknown",
        bucket,
        object_path: objectPath,
      },
      { status: 404 }
    );
  }

  return NextResponse.redirect(String(signed.signedUrl), 302);
}
