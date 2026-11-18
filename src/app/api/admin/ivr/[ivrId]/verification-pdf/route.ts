import { NextResponse } from "next/server";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ivrId: string }> }
) {
  await requireIvrTeamOrAdmin();

  const { ivrId } = await Promise.resolve(ctx.params);
  if (!ivrId || !UUID_RE.test(ivrId)) {
    return NextResponse.json({ error: "Invalid IVR id" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: v, error: vErr } = await (supabase as any)
    .from("ivr_insurance_verifications")
    .select("pdf_bucket, pdf_object_path, created_at")
    .eq("ivr_request_id", ivrId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vErr) return NextResponse.json({ error: "Request failed" }, { status: 500 });

  const bucket =
    safeStr(v?.pdf_bucket) ||
    safeStr(process.env.IVR_PRIVATE_BUCKET) ||
    "ivr-private";

  const objectPath = safeStr(v?.pdf_object_path);
  if (!objectPath) {
    return NextResponse.json({ error: "No verification PDF available yet" }, { status: 404 });
  }

  const { data: signed, error: signErr } = await (supabase as any).storage
    .from(bucket)
    .createSignedUrl(objectPath, 60);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "Failed to create signed URL" }, { status: 500 });
  }

  const res = NextResponse.redirect(signed.signedUrl, 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
