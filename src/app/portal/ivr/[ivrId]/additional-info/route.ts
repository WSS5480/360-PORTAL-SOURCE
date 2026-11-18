// src/app/portal/ivr/[ivrId]/additional-info/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveEmailMode, sendEmail } from "@/lib/email/sendEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // ensure Buffer + file handling works reliably

type CtxA = { params: { ivrId: string } };
type CtxB = { params: Promise<{ ivrId: string }> };

async function getIvrIdFromCtx(ctx: unknown): Promise<string> {
  try {
    const anyCtx = ctx as { params?: unknown };
    const maybeParams = anyCtx?.params as any;
    const resolved = typeof maybeParams?.then === "function" ? await maybeParams : maybeParams;
    return String(resolved?.ivrId || "").trim();
  } catch {
    return "";
  }
}

function envStr(name: string): string {
  const v = process.env[name];
  return typeof v === "string" ? v : "";
}

function firstNonEmpty(...vals: Array<string | undefined | null>): string {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function safeText(s: string, max = 8000): string {
  const t = String(s || "");
  if (t.length <= max) return t;
  return t.slice(0, max) + "…";
}

function escapeHtml(s: string): string {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtIsoShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString([], { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export async function POST(req: Request, ctx: CtxA | CtxB) {
  const portal: any = await requireCurrentAccount();
  const accountId: string = String(portal?.currentAccountId || "").trim();
  const viewerUserId: string = String(portal?.user?.id || "").trim();

  const ivrId = await getIvrIdFromCtx(ctx);

  if (!ivrId) {
    return NextResponse.redirect(urlFromRequest(req, `/portal/ivr?err=${encodeURIComponent("Missing IVR id")}`), 303);
  }

  if (!accountId || !viewerUserId) {
    return NextResponse.redirect(
      urlFromRequest(req, `/portal/ivr/${encodeURIComponent(ivrId)}?err=${encodeURIComponent("Not signed in")}`),
      303
    );
  }

  const form = await req.formData();
  const message = String(form.get("message") || "").trim();

  const files = form.getAll("files").filter((f) => f instanceof File) as File[];
  const hasFiles = files.length > 0;

  // Require at least message OR files
  if (!message && !hasFiles) {
    return NextResponse.redirect(
      urlFromRequest(req, `/portal/ivr/${encodeURIComponent(ivrId)}?err=${encodeURIComponent("Please enter a message or upload files")}`),
      303
    );
  }

  // Ensure IVR exists and belongs to current account
  // ✅ pull ivr_identifier so email can use it
  const { data: ivr, error: ivrErr } = await supabaseAdmin
    .from("ivr_requests")
    .select("id,account_id,ivr_identifier,submitted_by_user_id,distributor_email")
    .eq("id", ivrId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (ivrErr || !ivr) {
    return NextResponse.redirect(urlFromRequest(req, `/portal/ivr?err=${encodeURIComponent("IVR not found or no access")}`), 303);
  }

  // 1) Upload attachments (optional)
  const bucket = firstNonEmpty(envStr("IVR_PRIVATE_BUCKET"), envStr("SUPABASE_PRIVATE_BUCKET"), "ivr-private");

  for (const file of files) {
    const name = String(file.name || "").trim();
    if (!name) continue;

    const path = `ivr/${ivrId}/additional-info/${Date.now()}_${name}`;
    const buf = Buffer.from(await file.arrayBuffer());

    const up = await supabaseAdmin.storage.from(bucket).upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (up.error) {
      return NextResponse.redirect(
        urlFromRequest(req, `/portal/ivr/${encodeURIComponent(ivrId)}?err=${encodeURIComponent("File upload failed: " + up.error.message)}`),
        303
      );
    }

    const ins = await supabaseAdmin.from("ivr_files").insert({
      ivr_request_id: ivrId,
      bucket,
      object_path: path,
      file_type: "ADDITIONAL_INFO",
      uploaded_by_user_id: viewerUserId,
    });

    if (ins.error) {
      return NextResponse.redirect(
        urlFromRequest(req, `/portal/ivr/${encodeURIComponent(ivrId)}?err=${encodeURIComponent("File record insert failed: " + ins.error.message)}`),
        303
      );
    }
  }

  // 2) Save response + timestamp
  const nowIso = new Date().toISOString();
  const { error: updErr } = await supabaseAdmin
    .from("ivr_requests")
    .update({
      additional_info_submitted_at: nowIso,
      additional_info_response: message || null,
      last_customer_activity_at: nowIso,
    })
    .eq("id", ivrId);

  if (updErr) {
    return NextResponse.redirect(
      urlFromRequest(req, `/portal/ivr/${encodeURIComponent(ivrId)}?err=${encodeURIComponent("Failed to save response")}`),
      303
    );
  }

  // 3) Audit trail
  await supabaseAdmin.from("ivr_audit_log").insert({
    ivr_request_id: ivrId,
    actor_user_id: viewerUserId,
    action: "ADDITIONAL_INFO_PROVIDED",
    meta: {
      message: message || null,
      files: hasFiles ? files.map((f) => f.name) : [],
    },
  });

  // 4) Notify IVR team (best-effort; do NOT block the customer flow)
  const emailMode = resolveEmailMode();
  const ivrTeamTo = firstNonEmpty(envStr("IVR_TEAM_NOTIFY_TO"), envStr("EMAIL_TEST_TO"));

  const baseUrl = firstNonEmpty(envStr("APP_BASE_URL"), envStr("NEXT_PUBLIC_APP_URL"));
  const adminLink = baseUrl
    ? `${baseUrl.replace(/\/+$/, "")}/admin/ivr/${encodeURIComponent(ivrId)}#additional-info`
    : "";

  // ✅ Identifier-only (no patient name, no full UUID)
  const short = String(ivrId).slice(0, 8).toUpperCase();
  const ident = String((ivr as any).ivr_identifier || "").trim() || `IVR-${short}`;

  let emailWarning: string | boolean | null = null;

  try {
    if (emailMode === "graph" && ivrTeamTo) {
      const subject = `IVR: Customer responded (Additional Info) — ${ident}`;
      const msgSafe = escapeHtml(safeText(message || "(no message — files uploaded)"));

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.45;">
          <h2 style="margin:0 0 8px 0;">Customer submitted additional info</h2>

          <div style="margin:0 0 10px 0; color:#333;">
            <b>IVR Identifier:</b> ${escapeHtml(ident)}<br/>
            <b>Submitted at:</b> ${escapeHtml(fmtIsoShort(nowIso))}<br/>
            <b>Attachments:</b> ${hasFiles ? String(files.length) : "0"}
          </div>

          <div style="margin: 12px 0; padding: 10px 12px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="font-weight: 700; margin-bottom: 6px;">Customer message</div>
            <div style="white-space: pre-wrap;">${msgSafe}</div>
          </div>

          ${
            adminLink
              ? `<div style="margin-top:12px;"><a href="${adminLink}">Open in Admin →</a></div>`
              : `<div style="margin-top:12px; color:#666;">Admin link unavailable (missing APP_BASE_URL).</div>`
          }

          <p style="margin-top: 14px; font-size: 12px; color: #666;">
            PHI Notice: Authorized use only.
          </p>
        </div>
      `;

      await sendEmail({
        to: ivrTeamTo,
        subject,
        html,
        replyTo: envStr("EMAIL_REPLY_TO") || undefined,
        emailType: "ivr",
      });
    }
  } catch (_e: unknown) {
    emailWarning = true;
    // Intentionally do NOT throw — use generic message for HIPAA (no internal error details)
  }

  const flashMsg = emailWarning ? "Response submitted (email may have failed to send)" : "Response submitted";

  return NextResponse.redirect(
    urlFromRequest(req, `/portal/ivr/${encodeURIComponent(ivrId)}?flash=${encodeURIComponent(flashMsg)}`),
    303
  );
}
