import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { requireUser } from "@/lib/auth/requireUser";
import { sendEmail } from "@/lib/email/sendEmail";
import { isPortalIvrRowViewable } from "@/lib/portal/portalRowScope";

export const dynamic = "force-dynamic";

const Schema = z.object({
  response: z.string().min(1, "Response is required."),
});

function getBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || req.url.split("/api/")[0];
}

function getIvrTeamEmails(): string[] {
  const raw = process.env.IVR_TEAM_EMAILS || "";
  return raw
    .split(/[,\n]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasAnyRole(role: string | null, allowed: string[]) {
  return !!role && allowed.includes(role);
}

const ROLE_CAN_SUBMIT = ["ORDER_CREATOR", "IVR_SUBMITTER", "ACCOUNT_ADMIN"];

// ---- Identifier helpers (same as your verification/email route) ----
function normalizeLetters3(raw: string): string {
  const letters = (raw || "").toUpperCase().replace(/[^A-Z]/g, "");
  const first3 = letters.slice(0, 3);
  return (first3 + "XXX").slice(0, 3);
}

function ivrIdSuffix4(ivrId: string): string {
  const s = (ivrId || "").replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (s.length >= 4) return s.slice(0, 4);
  return (s + "0000").slice(0, 4);
}

function ymdDigits(ymd: string): string {
  return String(ymd || "").replace(/[^0-9]/g, "").slice(0, 8); // YYYYMMDD
}

function buildIvrIdentifier(patientFirst: string, patientLast: string, patientDobIso: string, ivrId: string): string {
  const f3 = normalizeLetters3(patientFirst);
  const l3 = normalizeLetters3(patientLast);
  const dob = ymdDigits(patientDobIso);
  const suffix = `-${ivrIdSuffix4(ivrId)}`;
  return `${f3}${l3}-${dob}${suffix}`;
}

export async function POST(req: Request, ctx: { params: Promise<{ ivrId: string }> }) {
  const { ivrId } = await ctx.params;

  // Must be signed in
  await requireUser();

  // Must be in a portal account context
  const portal = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(portal);
  if (unauthorized) return unauthorized;
  const accountId = portal.currentAccountId;

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected" }, { status: 401 });
  }

  // Must be allowed to take action
  if (!hasAnyRole(portal.currentRole, ROLE_CAN_SUBMIT)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  // Load request (now includes identifier + patient fields)
  const { data: ivr, error: ivrErr } = await supabaseAdmin
    .from("ivr_requests")
    .select(
      "id, account_id, ivr_identifier, patient_first_name, patient_last_name, patient_dob, additional_info_requested_at, additional_info_message, distributor_email, created_at, submitted_by_user_id, created_by_user_id"
    )
    .eq("id", ivrId)
    .maybeSingle();

  if (ivrErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  if (!ivr) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Ensure the IVR belongs to the currently selected portal account
  if (String(ivr.account_id) !== String(accountId)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const viewerUserId = String((portal.user as any)?.id ?? "");
  if (!isPortalIvrRowViewable(portal.currentRole, viewerUserId, ivr as any, accountId)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (!ivr.additional_info_requested_at) {
    return NextResponse.json({ ok: false, error: "No additional info was requested for this IVR." }, { status: 400 });
  }

  // Update record with response
  const response = parsed.data.response.trim();

  const { error: updErr } = await supabaseAdmin
    .from("ivr_requests")
    .update({
      additional_info_submitted_at: new Date().toISOString(),
      additional_info_response: response,
    })
    .eq("id", ivrId);

  if (updErr) return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });

  // ✅ Prefer stored identifier; compute if missing (no DB write here)
  const existingIdent = String((ivr as any).ivr_identifier || "").trim();
  const canCompute =
    String((ivr as any).patient_first_name || "").trim() &&
    String((ivr as any).patient_last_name || "").trim() &&
    String((ivr as any).patient_dob || "").trim();

  const computedIdent = canCompute
    ? buildIvrIdentifier(
        String((ivr as any).patient_first_name || ""),
        String((ivr as any).patient_last_name || ""),
        String((ivr as any).patient_dob || ""),
        String((ivr as any).id || "")
      )
    : "";

  const identifier = existingIdent || computedIdent || `IVR-${String(ivrId).slice(0, 8).toUpperCase()}`;

  // Notify IVR team via email (no patient name, no UUID line)
  const team = getIvrTeamEmails();
  if (team.length) {
    const base = getBaseUrl(req);
    const adminLink = `${base}/admin/ivr/${encodeURIComponent(ivrId)}`;

    await sendEmail({
      to: team,
      subject: `360 Medical — Customer provided additional info (${identifier})`,
      emailType: "ivr",
      text:
        `A customer submitted additional information for an IVR request.\n\n` +
        `IVR Identifier: ${identifier}\n\n` +
        `Original request:\n${(ivr as any).additional_info_message || "—"}\n\n` +
        `Customer response:\n${response}\n\n` +
        `Open in Admin:\n${adminLink}\n\n` +
        `PHI NOTICE: This email may contain protected health information. Authorized recipients only. Do not forward.`,
    });
  }

  return NextResponse.json({ ok: true });
}
