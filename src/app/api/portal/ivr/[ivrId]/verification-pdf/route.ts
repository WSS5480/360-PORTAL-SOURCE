import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPortalIvrRowViewable } from "@/lib/portal/portalRowScope";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ivrId: string }> }
) {
  const portal = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(portal);
  if (unauthorized) return unauthorized;
  const { ivrId } = await Promise.resolve(ctx.params);

  if (!portal.currentAccountId) {
    return NextResponse.json({ error: "No account selected" }, { status: 401 });
  }
  if (!ivrId || !UUID_RE.test(ivrId)) {
    return NextResponse.json({ error: "Invalid ivrId" }, { status: 400 });
  }

  const { data: ivr, error: ivrErr } = await supabaseAdmin
    .from("ivr_requests")
    .select("id, account_id, submitted_by_user_id, created_by_user_id")
    .eq("id", ivrId)
    .maybeSingle();

  if (ivrErr) {
    return NextResponse.json({ error: "Failed to load request" }, { status: 500 });
  }
  if (!ivr) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (ivr.account_id !== portal.currentAccountId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const viewerUserId = String((portal.user as any)?.id ?? "");
  if (!isPortalIvrRowViewable(portal.currentRole, viewerUserId, ivr as any, String(portal.currentAccountId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: ver, error: vErr } = await supabaseAdmin
    .from("ivr_insurance_verifications")
    .select("id, pdf_bucket, pdf_object_path, created_at")
    .eq("ivr_request_id", ivrId)
    .not("pdf_object_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vErr) {
    return NextResponse.json(
      { error: "Failed to load verification" },
      { status: 500 }
    );
  }

  if (!ver?.pdf_bucket || !ver?.pdf_object_path) {
    return NextResponse.json(
      { error: "Verification PDF not available" },
      { status: 404 }
    );
  }

  const expiresInSeconds = 60 * 10;
  const { data: signed, error: sErr } = await (supabaseAdmin as any).storage
    .from(String(ver.pdf_bucket))
    .createSignedUrl(String(ver.pdf_object_path), expiresInSeconds);

  if (sErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "Failed to create download link" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl, 302);
}
