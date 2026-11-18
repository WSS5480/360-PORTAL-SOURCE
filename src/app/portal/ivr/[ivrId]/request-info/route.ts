import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/sendEmail";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getBaseUrl(req: Request) {
  // Prefer NEXT_PUBLIC_APP_URL / APP_BASE_URL, fallback to request origin.
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

function safeStr(v: any) {
  return (v ?? "").toString().trim();
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ ivrId: string }> | { ivrId: string } }
) {
  const auth: any = await requireIvrTeamOrAdmin();
  const actorUserId = auth?.user?.id || auth?.userId || "";

  const { ivrId } = await Promise.resolve(ctx.params);
  if (!ivrId || !UUID_RE.test(ivrId)) {
    return NextResponse.redirect(urlFromRequest(req, `/admin/ivr?err=${encodeURIComponent("Invalid IVR id")}`), 303);
  }

  const form = await req.formData();
  const message = safeStr(form.get("message"));

  if (!message) {
    return NextResponse.redirect(
      urlFromRequest(req, `/admin/ivr/${ivrId}?err=${encodeURIComponent("Message is required.")}`),
      303
    );
  }

  const supabase: any = createSupabaseAdminClient();

  const { data: ivr, error: ivrErr } = await supabase
    .from("ivr_requests")
    .select("id,account_id,submitted_by_user_id,status,patient_first_name,patient_last_name")
    .eq("id", ivrId)
    .maybeSingle();

  if (ivrErr || !ivr) {
    return NextResponse.redirect(
      urlFromRequest(req, `/admin/ivr/${ivrId}?err=${encodeURIComponent("IVR not found.")}`),
      303
    );
  }

  // Write audit event
  await supabase.from("ivr_audit_log").insert({
    ivr_request_id: ivrId,
    actor_user_id: actorUserId || null,
    action: "IVR_ADDITIONAL_INFO_REQUESTED",
    metadata: {
      message,
    },
  });

  // Email submitter (only submitter, per your requirement)
  let submitterEmail = "";
  try {
    const userRes = await supabase.auth.admin.getUserById(ivr.submitted_by_user_id);
    submitterEmail = userRes?.data?.user?.email || "";
  } catch {
    submitterEmail = "";
  }

  if (submitterEmail) {
    const base = getBaseUrl(req);
    const portalLink = `${base}/portal/ivr/${encodeURIComponent(ivrId)}`;

    const patientName = [ivr.patient_first_name, ivr.patient_last_name].filter(Boolean).join(" ").trim();

    await sendEmail({
      to: [submitterEmail],
      subject: "360 Medical — Additional information requested",
      emailType: "ivr",
      text:
        `Additional information is needed for an IVR request.\n\n` +
        `Request:\n${message}\n\n` +
        `Open securely in the portal:\n${portalLink}\n\n` +
        `This email does not include patient information.`,
    });
  }

  return NextResponse.redirect(
    urlFromRequest(req, `/admin/ivr/${ivrId}?flash=${encodeURIComponent("Additional info request sent.")}`),
    303
  );
}
