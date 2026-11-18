import { NextResponse } from "next/server";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ivrId: string }> | { ivrId: string } }
) {
  const portal = await requireCurrentAccount();

  const accountId = portal.currentAccountId;
  if (!accountId) {
    return NextResponse.json({ error: "No account selected" }, { status: 403 });
  }

  const { ivrId } = await Promise.resolve(ctx.params);
  if (!ivrId || !UUID_RE.test(ivrId)) {
    return NextResponse.json({ error: "Invalid IVR id" }, { status: 400 });
  }

  // Ensure this IVR belongs to the viewer's account
  const { data: ivr, error: ivrErr } = await supabaseAdmin
    .from("ivr_requests")
    .select("id")
    .eq("id", ivrId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (ivrErr) {
    return NextResponse.json({ error: ivrErr.message }, { status: 500 });
  }
  if (!ivr) {
    return NextResponse.json({ error: "IVR not found or access denied" }, { status: 404 });
  }

  // Fetch latest verification (most recent row). We'll require pdf_object_path.
  const { data: v, error: vErr } = await supabaseAdmin
    .from("ivr_insurance_verifications")
    .select("pdf_bucket, pdf_object_path, created_at")
    .eq("ivr_request_id", ivrId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vErr) {
    return NextResponse.json({ error: vErr.message }, { status: 500 });
  }

  const bucket =
    safeStr(v?.pdf_bucket) ||
    safeStr(process.env.IVR_PRIVATE_BUCKET) ||
    "ivr-private";

  const objectPath = safeStr(v?.pdf_object_path);
  if (!objectPath) {
    return NextResponse.json({ error: "No verification PDF available yet" }, { status: 404 });
  }

  // ✅ Create short-lived signed URL and redirect
  // 60 seconds is usually plenty for a click-through.
  const { data: signed, error: signErr } = await (supabaseAdmin as any).storage
    .from(bucket)
    .createSignedUrl(objectPath, 60);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "Failed to create signed URL for PDF" },
      { status: 500 }
    );
  }

  // Redirect so the browser loads/streams the PDF directly from storage.
  // Keep it private and non-cacheable.
  const res = NextResponse.redirect(signed.signedUrl, 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
