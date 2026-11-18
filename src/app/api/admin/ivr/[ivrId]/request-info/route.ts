import { NextResponse } from "next/server";
import { z } from "zod";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/sendEmail";
import { buildIvrIdentifier } from "@/lib/ivr/ivrIdentifier";

export const dynamic = "force-dynamic";

const Schema = z.object({
  message: z.string().min(1, "Message is required.").max(5000),
});

function getBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || req.url.split("/api/")[0];
}

function safeStr(v: any) {
  return typeof v === "string" ? v : "";
}

/** Strict-ish YYYY-MM-DD check (matches what you store in ivr_requests.patient_dob) */
function isoDateLikeOrNull(raw: string): string | null {
  const s = (raw || "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return s;
}

function ivrIdSuffix4(ivrId: string): string {
  const s = (ivrId || "").replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (s.length >= 4) return s.slice(0, 4);
  return (s + "0000").slice(0, 4);
}

async function getAuthEmailByUserId(adminSb: any, userId: string): Promise<string | null> {
  const getUserById = adminSb?.auth?.admin?.getUserById;
  if (typeof getUserById !== "function") return null;
  try {
    const res = await getUserById(userId);
    const email = safeStr(res?.data?.user?.email).trim().toLowerCase();
    return email || null;
  } catch {
    return null;
  }
}

async function getContactEmailById(adminSb: any, contactId: string): Promise<string | null> {
  const { data, error } = await adminSb.from("account_contacts").select("email").eq("id", contactId).maybeSingle();
  if (error || !data) return null;
  const email = safeStr(data.email).trim().toLowerCase();
  return email || null;
}

export async function POST(req: Request, ctx: { params: Promise<{ ivrId: string }> }) {
  const auth = await requireIvrTeamOrAdmin();
  if (!auth) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { ivrId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const message = parsed.data.message.trim();
  const adminSb: any = createSupabaseAdminClient();

  // 1) Load the IVR + fields needed for identifier + recipient resolution
  const { data: ivr, error: ivrErr } = await adminSb
    .from("ivr_requests")
    .select(
      [
        "id",
        "account_id",
        "submitted_by_user_id",
        "contact_id",
        "status",
        "patient_first_name",
        "patient_last_name",
        "patient_dob",
        "ivr_identifier",
      ].join(",")
    )
    .eq("id", ivrId)
    .maybeSingle();

  if (ivrErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  if (!ivr) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const submittedByUserId = safeStr(ivr.submitted_by_user_id);
  const contactId = safeStr(ivr.contact_id);

  // 2) Resolve customer email:
  //    - preferred: portal member (submitted_by_user_id)
  //    - fallback: contact-based intake (contact_id)
  let customerEmail: string | null = null;

  if (submittedByUserId) {
    customerEmail = await getAuthEmailByUserId(adminSb, submittedByUserId);
  } else if (contactId) {
    customerEmail = await getContactEmailById(adminSb, contactId);
  }

  if (!customerEmail) {
    return NextResponse.json({ ok: false, error: "Recipient not found" }, { status: 400 });
  }

  // 3) Compute ivr_identifier if missing (and we have patient + dob)
  const existingIdentifier = safeStr(ivr.ivr_identifier).trim();
  const patientFirst = safeStr(ivr.patient_first_name).trim();
  const patientLast = safeStr(ivr.patient_last_name).trim();
  const patientDob = isoDateLikeOrNull(safeStr(ivr.patient_dob));

  let identifier = existingIdentifier;
  let identifierSet = false;

  if (!identifier && patientFirst && patientLast && patientDob) {
    const computed = buildIvrIdentifier({
      patient_first_name: patientFirst,
      patient_last_name: patientLast,
      patient_dob: patientDob,
    });
    identifier = computed ?? `IVR-${ivrIdSuffix4(ivrId)}`;
    identifierSet = true;

    // Persist it so all workflows see the same identifier
    const { error: idErr } = await adminSb.from("ivr_requests").update({ ivr_identifier: identifier }).eq("id", ivrId);
    // Don't hard-fail if this update fails; email + portal alert still matter.
    if (idErr) identifierSet = false;
  }

  // If still missing, fall back to short UUID suffix style to avoid blank references
  if (!identifier) {
    identifier = `IVR-${ivrIdSuffix4(ivrId)}`;
  }

  // 4) Update ivr_requests markers (drives portal alerts)
  const now = new Date().toISOString();
  const patch: any = {
    additional_info_requested_at: now,
    additional_info_submitted_at: null,
    additional_info_message: message,
    additional_info_response: null,
  };

  const { error: updErr } = await adminSb.from("ivr_requests").update(patch).eq("id", ivrId);

  if (updErr) {
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }

  // 5) Audit log
  const actorUserId = (auth as any)?.id || (auth as any)?.user?.id || null;

  const { error: auditErr } = await adminSb.from("ivr_audit_log").insert({
    ivr_request_id: ivrId,
    action: "IVR_ADDITIONAL_INFO_REQUESTED",
    actor_user_id: actorUserId,
    meta: {
      message,
      ivr_identifier: identifier,
      ivr_identifier_set: identifierSet ? "yes" : "no",
    },
  });

  if (auditErr) {
    return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  }

  // 6) Email customer: NO patient name. Use identifier only.
  const base = getBaseUrl(req);
  const portalLink = `${base}/portal/ivr/${encodeURIComponent(ivrId)}`;

  try {
    await sendEmail({
      to: [customerEmail],
      subject: `360 Medical — Additional information needed (IVR ${identifier})`,
      emailType: "ivr",
      text:
        `We need additional information for an IVR request.\n\n` +
        `IVR ID: ${identifier}\n\n` +
        `Message from 360 Medical:\n${message}\n\n` +
        `Submit updates securely in the portal:\n${portalLink}\n\n` +
        `Note: Do not include PHI in email responses.`,
    });
  } catch {
    // Don't fail the request if email fails — portal should still show the alert.
  }

  return NextResponse.json({ ok: true });
}
