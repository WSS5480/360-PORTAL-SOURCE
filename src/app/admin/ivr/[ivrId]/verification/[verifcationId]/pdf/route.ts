import { NextResponse } from "next/server";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  req: Request,
  ctx: {
    params:
      | Promise<{ ivrId: string; verifcationId: string }>
      | { ivrId: string; verifcationId: string };
  }
) {
  await requireIvrTeamOrAdmin();

  const { ivrId, verifcationId } = await Promise.resolve(ctx.params);

  if (!UUID_RE.test(ivrId) || !UUID_RE.test(verifcationId)) {
    return NextResponse.json({ ok: false, error: "Invalid id(s)" }, { status: 400 });
  }

  const supabase: any = createSupabaseAdminClient();

  const { data: v, error: vErr } = await supabase
    .from("ivr_insurance_verifications")
    .select("id,ivr_request_id,pdf_bucket,pdf_object_path")
    .eq("id", verifcationId)
    .maybeSingle();

  if (vErr) {
    return NextResponse.json({ ok: false, error: vErr.message }, { status: 500 });
  }

  if (!v) {
    return NextResponse.json({ ok: false, error: "Verification not found" }, { status: 404 });
  }

  if (v.ivr_request_id !== ivrId) {
    return NextResponse.json(
      { ok: false, error: "Verification does not belong to this IVR" },
      { status: 400 }
    );
  }

  const bucket = String(v.pdf_bucket || "").trim();
  const objectPath = String(v.pdf_object_path || "").trim();

  if (!bucket || !objectPath) {
    return NextResponse.json(
      { ok: false, error: "No PDF stored for this verification yet." },
      { status: 404 }
    );
  }

  // Short-lived signed URL (browser-safe)
  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, 60); // 60 seconds

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: signErr?.message || "Failed to sign PDF URL" },
      { status: 500 }
    );
  }

  // Redirect browser to the signed URL so it opens/downloads naturally
  return NextResponse.redirect(signed.signedUrl, 302);
}
