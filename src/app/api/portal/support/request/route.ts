import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/sendEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function supportRequestRecipient(): string {
  return (
    process.env.SUPPORT_REQUEST_EMAIL?.trim() ||
    process.env.ORDER_NOTIFY_TO?.trim() ||
    process.env.IVR_STAFF_NOTIFY_TO?.trim() ||
    ""
  );
}

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  const message = safeStr(form.get("message"));
  const page = safeStr(form.get("page"));
  const screenshot = form.get("screenshot");

  if (!message || message.length < 10 || message.length > 4000) {
    return NextResponse.json({ ok: false, error: "Message must be 10-4000 characters" }, { status: 400 });
  }

  let attachment:
    | {
        filename: string;
        contentType: string;
        contentBytesBase64: string;
      }
    | undefined;
  if (screenshot instanceof File && screenshot.size > 0) {
    if (!String(screenshot.type || "").startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "Screenshot must be an image file" }, { status: 400 });
    }
    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      return NextResponse.json({ ok: false, error: "Screenshot must be 5 MB or smaller" }, { status: 400 });
    }
    const bytes = Buffer.from(await screenshot.arrayBuffer());
    attachment = {
      filename: safeStr(screenshot.name) || "screenshot.png",
      contentType: screenshot.type || "image/png",
      contentBytesBase64: bytes.toString("base64"),
    };
  }

  const user = data.user;
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const userEmail = safeStr(user.email);
  const userName = safeStr(profile?.full_name) || safeStr((user.user_metadata as { full_name?: string })?.full_name) || "Unknown";
  const whenIso = new Date().toISOString();
  const { data: created, error: createErr } = await supabaseAdmin
    .from("portal_support_requests")
    .insert({
      user_id: user.id,
      user_email: userEmail || null,
      user_name: userName || null,
      page: page || null,
      message,
    })
    .select("id")
    .single();
  if (createErr || !created?.id) {
    return NextResponse.json({ ok: false, error: "Failed to create support request" }, { status: 500 });
  }
  const requestId = String(created.id);

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.45;color:#111">
      <h2 style="margin:0 0 12px">Portal support request #${escapeHtml(requestId)}</h2>
      <p><strong>From:</strong> ${escapeHtml(userName)}${userEmail ? ` &lt;${escapeHtml(userEmail)}&gt;` : ""}</p>
      <p><strong>User ID:</strong> ${escapeHtml(user.id)}</p>
      <p><strong>Submitted:</strong> ${escapeHtml(whenIso)}</p>
      <p><strong>Page:</strong> ${escapeHtml(page || "—")}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:14px 0" />
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
    </div>
  `;

  const supportTo = supportRequestRecipient();
  if (!supportTo) {
    return NextResponse.json({
      ok: true,
      requestId,
      emailed: false,
      warning: "Support request saved. Set SUPPORT_REQUEST_EMAIL to notify the team.",
    });
  }

  await sendEmail({
    to: supportTo,
    subject: `[Portal Support #${requestId}]`,
    html,
    text: `Portal support request #${requestId}\nFrom: ${userName}${userEmail ? ` <${userEmail}>` : ""}\nUser ID: ${user.id}\nSubmitted: ${whenIso}\nPage: ${page || "—"}\n\n${message}`,
    replyTo: userEmail || undefined,
    emailType: "default",
    attachments: attachment ? [attachment] : undefined,
  });

  await supabaseAdmin
    .from("portal_support_requests")
    .update({ emailed_at: new Date().toISOString() })
    .eq("id", created.id);

  return NextResponse.json({ ok: true, requestId });
}

