import { NextResponse } from "next/server";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/sendEmail";
import { buildIvrIdentifier } from "@/lib/ivr/ivrIdentifier";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function envStr(key: string): string | null {
  const v = process.env[key];
  return typeof v === "string" ? v : null;
}

function getPrivateBucket(): string {
  return (envStr("SUPABASE_PRIVATE_BUCKET") || "ivr-private").trim() || "ivr-private";
}

function sanitizeFilename(name: string): string {
  return (name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function baseUrl(): string {
  return (
    (envStr("NEXT_PUBLIC_APP_URL") || envStr("APP_BASE_URL") || "http://localhost:3000").trim() ||
    "http://localhost:3000"
  );
}

async function uploadToStorage(args: { bucket: string; objectPath: string; file: File; supabase: any }) {
  const { bucket, objectPath, file, supabase } = args;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(bucket).upload(objectPath, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) throw new Error("Upload failed");
}

function escapeHtml(s: string): string {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isRealUpload(x: unknown): x is File {
  if (!(x instanceof File)) return false;
  const name = String(x.name || "").trim();
  return Boolean(name) && x.size > 0;
}

export async function POST(req: Request, ctx: { params: Promise<{ ivrId: string }> }) {
  const auth = await requireIvrTeamOrAdmin();
  const actorUserId = (auth as any)?.user?.id || "";

  const { ivrId } = await Promise.resolve(ctx.params);
  if (!ivrId || !UUID_RE.test(String(ivrId))) {
    return NextResponse.json({ ok: false, error: "Invalid ivrId" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, error: "Expected multipart/form-data" }, { status: 400 });
  }

  const supabase: any = createSupabaseAdminClient();
  const form = await req.formData();

  const messageRaw = form.get("message");
  const message = typeof messageRaw === "string" ? messageRaw.trim() : "";
  if (!message) {
    return NextResponse.json({ ok: false, error: "Message is required" }, { status: 400 });
  }

  const { data: ivr, error: ivrErr } = await supabase
    .from("ivr_requests")
    .select(
      "id,account_id,submitted_by_user_id,distributor_email,patient_first_name,patient_last_name,patient_dob,ivr_identifier"
    )
    .eq("id", ivrId)
    .maybeSingle();

  if (ivrErr || !ivr) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  // Resolve recipient email (submitter preferred)
  const submitterUserId = String(ivr.submitted_by_user_id || "").trim();
  let recipientEmail = "";
  let recipientName = "";

  if (submitterUserId) {
    const { data: p1 } = await supabase
      .from("user_profiles")
      .select("user_id,email,full_name")
      .eq("user_id", submitterUserId)
      .maybeSingle();

    if (p1?.email) {
      recipientEmail = String(p1.email || "").trim();
      recipientName = String(p1.full_name || "").trim();
    } else {
      const { data: p2 } = await supabase
        .from("user_profiles")
        .select("id,email,full_name")
        .eq("id", submitterUserId)
        .maybeSingle();

      if (p2?.email) {
        recipientEmail = String(p2.email || "").trim();
        recipientName = String(p2.full_name || "").trim();
      }
    }
  }

  if (!recipientEmail) {
    const fallback = String(ivr.distributor_email || "").trim();
    if (fallback) recipientEmail = fallback;
  }

  if (!recipientEmail) {
    return NextResponse.json({ ok: false, error: "Recipient email not found" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();

  // Update IVR additional info fields. Clear submitted_at and response so the new request
  // shows on the portal and the customer can respond again.
  const { error: upErr } = await supabase
    .from("ivr_requests")
    .update({
      additional_info_requested_at: nowIso,
      additional_info_requested_by: actorUserId || null,
      additional_info_message: message,
      additional_info_submitted_at: null,
      additional_info_response: null,
      updated_at: nowIso,
    })
    .eq("id", ivrId);

  if (upErr) {
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }

  // Audit log
  try {
    await supabase.from("ivr_audit_log").insert({
      ivr_request_id: ivrId,
      actor_user_id: actorUserId || null,
      action: "ADDITIONAL_INFO_REQUESTED",
      meta: {
        message,
        to: recipientEmail,
      },
    });
  } catch {}

  // Optional files
  const rawFiles = form.getAll("files");
  const files = rawFiles.filter(isRealUpload);

  if (files.length) {
    const bucket = getPrivateBucket();
    const basePrefix = `ivr/${ivr.account_id}/${ivr.id}/ADDITIONAL_INFO`;

    for (const f of files) {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const safeName = sanitizeFilename(f.name || "file.bin");
      const objectPath = `${basePrefix}/${ts}-${safeName}`;

      await uploadToStorage({ bucket, objectPath, file: f, supabase });

      const { error: insErr } = await supabase.from("ivr_files").insert({
        ivr_request_id: ivrId,
        bucket,
        object_path: objectPath,
        file_type: "ADDITIONAL_INFO",
        uploaded_by_user_id: actorUserId || null,
      });

      if (insErr) {
        return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
      }
    }
  }

  // ✅ Build identifier (prefer DB, compute if missing)
  const existingIdent = String(ivr.ivr_identifier || "").trim();
  const canCompute =
    String(ivr.patient_first_name || "").trim() &&
    String(ivr.patient_last_name || "").trim() &&
    String(ivr.patient_dob || "").trim();

  const computedIdent = canCompute
    ? (buildIvrIdentifier({
        patient_first_name: String(ivr.patient_first_name || ""),
        patient_last_name: String(ivr.patient_last_name || ""),
        patient_dob: String(ivr.patient_dob || ""),
      }) ?? "")
    : "";

  const identifier = existingIdent || computedIdent || `IVR-${String(ivr.id).slice(0, 8).toUpperCase()}`;

  const portalLink = `${baseUrl()}/portal/ivr/${encodeURIComponent(ivr.id)}`;

  // ✅ Subject + HTML no longer includes patient name or UUID lines
  const subject = `Additional information requested (${identifier})`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.45;">
      <h2 style="margin: 0 0 8px 0;">Additional information needed</h2>
      <p style="margin: 0 0 10px 0;">
        360 Medical requested additional information to continue processing your insurance verification request.
      </p>

      <div style="padding: 12px; border: 1px solid #eee; border-radius: 10px; background: #fafafa;">
        <div style="font-size: 12px; color: #555; font-weight: 700;">Request</div>
        <div style="margin-top: 8px; white-space: pre-wrap;">${escapeHtml(message)}</div>
      </div>

      <p style="margin: 12px 0 0 0;"><b>IVR Identifier:</b> ${escapeHtml(identifier)}</p>

      <p style="margin: 14px 0 0 0;">
        <a href="${portalLink}" style="display:inline-block; padding: 10px 12px; border-radius: 10px; background: #111; color: white; text-decoration: none; font-weight: 700;">
          Open request in portal →
        </a>
      </p>

      <p style="margin-top: 14px; font-size: 12px; color: #666;">
        PHI Notice: This email may contain protected health information. Authorized recipients only.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: recipientEmail,
      subject,
      html,
      replyTo: envStr("EMAIL_REPLY_TO") ?? undefined,
      emailType: "ivr",
    });
  } catch (e: any) {
    const redir = `${baseUrl()}/admin/ivr/${encodeURIComponent(ivrId)}?err=email_failed`;
    return NextResponse.redirect(redir, { status: 303 });
  }

  const success = `Additional info requested. Email sent to ${recipientName ? `${recipientName} • ` : ""}${recipientEmail}`;
  const redirectTo = `${baseUrl()}/admin/ivr/${encodeURIComponent(ivrId)}?flash=${encodeURIComponent(success)}`;
  return NextResponse.redirect(redirectTo, { status: 303 });
}
