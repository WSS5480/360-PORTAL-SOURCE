/**
 * Sends the same password-recovery email as the public "Forgot password" flow
 * (generateLink recovery + verify-recovery URL + Microsoft Graph mailer).
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/sendEmail";

export function getBaseUrlForAuthEmails(req?: Request | null): string {
  const override = process.env.APP_URL_FOR_INVITES?.trim();
  if (override) return override.replace(/\/$/, "");

  if (req) {
    const url = new URL(req.url);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return url.origin.replace(/\/$/, "");
    }
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    (req ? new URL(req.url).origin.replace(/\/$/, "") : "") ||
    ""
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildResetEmail(actionLink: string, baseUrl: string) {
  const text =
    `Hi,\n\n` +
    `You requested a password reset for the 360 Medical Portal.\n\n` +
    `Use the link below to set a new password:\n` +
    `${actionLink}\n\n` +
    `This link expires in 1 hour.\n\n` +
    `If you didn't request this, you can ignore this email.\n\n` +
    `Sign in: ${baseUrl}/login\n`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f7fa;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:20px;background:#0f172a;color:#ffffff;">
          <div style="font-size:20px;font-weight:900;letter-spacing:0.3px;">360 Medical Portal</div>
          <div style="font-size:12px;opacity:0.8;margin-top:4px;">Password reset</div>
        </div>

        <div style="padding:24px;font-size:14px;line-height:1.6;">
          <p style="margin:0 0 14px 0;">You requested a password reset.</p>

          <p style="margin:0 0 14px 0;">Use the link below to set a new password:</p>

          <div style="margin:20px 0 14px 0;">
            <a href="${escapeHtml(actionLink)}"
               style="display:inline-block;background:#1e88e5;color:#ffffff;text-decoration:none;
                      padding:14px 18px;border-radius:12px;font-weight:900;font-size:14px;">
              Reset password
            </a>
          </div>

          <p style="margin:0 0 10px 0;font-size:12px;opacity:0.75;">
            This link expires in 1 hour.
          </p>

          <p style="margin:0 0 10px 0;font-size:12px;opacity:0.75;">
            If you didn't request this, you can ignore this email.
          </p>

          <p style="margin:0;font-size:12px;opacity:0.75;">
            If the button doesn't work, copy and paste this link:
            <br />
            <span style="word-break:break-all;">${escapeHtml(actionLink)}</span>
          </p>
        </div>

        <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid rgba(0,0,0,0.06);
                    font-size:11px;color:#475569;">
          <a href="${escapeHtml(baseUrl)}/login" style="color:#1e88e5;font-weight:800;text-decoration:none;">
            Sign in
          </a>
        </div>
      </div>
    </div>
  </body>
</html>`;

  return { text, html };
}

export type SendPasswordRecoveryResult = { sent: true } | { sent: false; reason: string };

/**
 * Sends recovery email. Used by public forgot-password (may ignore failures) and admin user tools.
 */
export async function sendPasswordRecoveryEmail(args: {
  email: string;
  next?: string;
  request?: Request | null;
}): Promise<SendPasswordRecoveryResult> {
  const email = String(args.email ?? "")
    .trim()
    .toLowerCase();
  const nextRaw = typeof args.next === "string" ? args.next.trim() : "/portal";
  const safeNext = nextRaw.startsWith("/") ? nextRaw : `/${nextRaw}`;

  if (!email || !email.includes("@")) {
    return { sent: false, reason: "Invalid email" };
  }

  const base = getBaseUrlForAuthEmails(args.request ?? null);
  if (!base) {
    return { sent: false, reason: "Server base URL is not configured (APP_URL_FOR_INVITES / NEXT_PUBLIC_APP_URL)." };
  }

  const redirectTo = `${base}/reset-password?next=${encodeURIComponent(safeNext)}`;

  const gen = (supabaseAdmin as any)?.auth?.admin?.generateLink;
  if (typeof gen !== "function") {
    return { sent: false, reason: "Auth admin generateLink is not available" };
  }

  const { data: linkData, error: linkErr } = await (supabaseAdmin as any).auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (linkErr) {
    return { sent: false, reason: linkErr.message || "Failed to generate recovery link" };
  }

  const actionLink = linkData?.properties?.action_link as string | undefined;
  const hashedToken = linkData?.properties?.hashed_token as string | undefined;

  const token =
    hashedToken ||
    (actionLink ? new URL(actionLink).searchParams.get("token") : null) ||
    (actionLink ? new URL(actionLink).searchParams.get("token_hash") : null);

  const actionLinkToUse =
    token && base
      ? `${base}/api/auth/verify-recovery?token=${encodeURIComponent(token)}&type=recovery&next=${encodeURIComponent(safeNext)}`
      : actionLink;

  if (!actionLinkToUse) {
    return { sent: false, reason: "No recovery link could be generated" };
  }

  const { text, html } = buildResetEmail(actionLinkToUse, base);

  try {
    await sendEmail({
      to: email,
      subject: "Reset your 360 Medical Portal password",
      text,
      html,
    });
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "Failed to send email" };
  }

  return { sent: true };
}
