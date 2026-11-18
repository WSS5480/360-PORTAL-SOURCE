/**
 * Supabase Auth Send Email Hook
 *
 * Receives POST requests from Supabase when auth emails are triggered.
 * Replaces Supabase's built-in SMTP with our Microsoft Graph mailer.
 *
 * Payload fields (from Supabase):
 * - user: { id, email, phone, app_metadata, user_metadata, identites, ... }
 * - email_data: {
 *     token: OTP code (6 digits for some flows)
 *     token_hash: hashed token for link verification (used in verify URL)
 *     redirect_to: URL to redirect user after email action
 *     email_action_type: signup | invite | magiclink | recovery | email_change | ...
 *     site_url: app base URL
 *     token_new, token_hash_new: for email_change (secure mode)
 *     old_email, old_phone: previous values when changing credentials
 *   }
 */

import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/sendEmail";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || "";

type EmailActionType =
  | "recovery"
  | "invite"
  | "magiclink"
  | "signup"
  | "email_change"
  | "email"
  | "reauthentication"
  | "password_changed_notification"
  | "email_changed_notification"
  | "phone_changed_notification"
  | "identity_linked_notification"
  | "identity_unlinked_notification"
  | "mfa_factor_enrolled_notification"
  | "mfa_factor_unenrolled_notification";

type HookPayload = {
  user: {
    id: string;
    email?: string;
    email_new?: string;
    phone?: string;
    [key: string]: unknown;
  };
  email_data: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
    token_new?: string;
    token_hash_new?: string;
    old_email?: string;
    old_phone?: string;
    [key: string]: unknown;
  };
};

/**
 * Maps email_action_type to subject and body template.
 * Returns { subject, body } for HTML email; link is injected into body.
 */
function getEmailContent(
  actionType: string,
  opts: {
    link?: string;
    recipientEmail?: string;
    oldEmail?: string;
  }
): { subject: string; body: string } {
  const { link = "", recipientEmail = "you" } = opts;
  const appName = "360 Medical Portal";

  switch (actionType) {
    case "recovery":
      return {
        subject: `Reset your password – ${appName}`,
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;margin:0;padding:24px;background:#f8fafc;">
          <p>Hi,</p>
          <p>You requested a password reset for ${appName}.</p>
          <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#1e88e5;color:#fff;text-decoration:none;border-radius:8px;">Reset password</a></p>
          <p>Or copy this link: <a href="${link}">${link}</a></p>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, you can ignore this email.</p>
        </body></html>`,
      };

    case "invite":
      return {
        subject: `You're invited to ${appName}`,
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;margin:0;padding:24px;background:#f8fafc;">
          <p>Hi,</p>
          <p>You've been invited to join ${appName}.</p>
          <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#1e88e5;color:#fff;text-decoration:none;border-radius:8px;">Accept invitation</a></p>
          <p>Or copy this link: <a href="${link}">${link}</a></p>
        </body></html>`,
      };

    case "magiclink":
      return {
        subject: `Sign in to ${appName}`,
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;margin:0;padding:24px;background:#f8fafc;">
          <p>Hi,</p>
          <p>Use the link below to sign in to ${appName}:</p>
          <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#1e88e5;color:#fff;text-decoration:none;border-radius:8px;">Sign in</a></p>
          <p>Or copy this link: <a href="${link}">${link}</a></p>
          <p>This link expires in 1 hour.</p>
        </body></html>`,
      };

    case "signup":
      return {
        subject: `Confirm your email – ${appName}`,
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;margin:0;padding:24px;background:#f8fafc;">
          <p>Hi,</p>
          <p>Thanks for signing up. Please confirm your email address:</p>
          <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#1e88e5;color:#fff;text-decoration:none;border-radius:8px;">Confirm email</a></p>
          <p>Or copy this link: <a href="${link}">${link}</a></p>
          <p>This link expires in 24 hours.</p>
        </body></html>`,
      };

    case "email_change":
      return {
        subject: `Confirm your new email – ${appName}`,
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;margin:0;padding:24px;background:#f8fafc;">
          <p>Hi,</p>
          <p>You requested to change your email to ${recipientEmail}. Confirm this change:</p>
          <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#1e88e5;color:#fff;text-decoration:none;border-radius:8px;">Confirm email change</a></p>
          <p>Or copy this link: <a href="${link}">${link}</a></p>
        </body></html>`,
      };

    case "reauthentication":
      return {
        subject: `Re-authenticate – ${appName}`,
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;margin:0;padding:24px;background:#f8fafc;">
          <p>Hi,</p>
          <p>Please confirm your identity:</p>
          <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#1e88e5;color:#fff;text-decoration:none;border-radius:8px;">Confirm</a></p>
          <p>Or copy this link: <a href="${link}">${link}</a></p>
        </body></html>`,
      };

    case "password_changed_notification":
      return {
        subject: `Your password was changed – ${appName}`,
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;margin:0;padding:24px;background:#f8fafc;">
          <p>Hi,</p>
          <p>Your password for ${appName} was successfully changed.</p>
          <p>If you didn't make this change, please contact support immediately.</p>
        </body></html>`,
      };

    case "email_changed_notification":
      return {
        subject: `Your email was changed – ${appName}`,
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;margin:0;padding:24px;background:#f8fafc;">
          <p>Hi,</p>
          <p>Your email address for ${appName} was successfully changed.</p>
          <p>If you didn't make this change, please contact support immediately.</p>
        </body></html>`,
      };

    case "phone_changed_notification":
      return {
        subject: `Your phone was changed – ${appName}`,
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;margin:0;padding:24px;background:#f8fafc;">
          <p>Hi,</p>
          <p>Your phone number for ${appName} was successfully changed.</p>
          <p>If you didn't make this change, please contact support immediately.</p>
        </body></html>`,
      };

    default:
      return {
        subject: `${appName} – Action required`,
        body: link
          ? `<!DOCTYPE html><html><body style="font-family:sans-serif;margin:0;padding:24px;background:#f8fafc;">
          <p>Hi,</p>
          <p>Please complete the action below:</p>
          <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#1e88e5;color:#fff;text-decoration:none;border-radius:8px;">Continue</a></p>
          <p>Or copy this link: <a href="${link}">${link}</a></p>
        </body></html>`
          : `<!DOCTYPE html><html><body style="font-family:sans-serif;margin:0;padding:24px;background:#f8fafc;">
          <p>Hi,</p>
          <p>You have a notification from ${appName}.</p>
        </body></html>`,
      };
  }
}

/**
 * Builds the Supabase verify URL for link-based flows.
 * Uses token_hash when present (for verify endpoint), else token.
 * redirect_to: prefer email_data.redirect_to, fallback to site_url or app base.
 * For email_change: token_hash is for new email, token_hash_new for current email (see Supabase docs).
 */
function buildActionLink(
  emailData: HookPayload["email_data"],
  supabaseUrl: string,
  recipientEmail: string,
  userEmail?: string,
  userEmailNew?: string
): string {
  const type = (emailData.email_action_type || "recovery").trim();
  const redirectTo =
    emailData.redirect_to?.trim() ||
    emailData.site_url?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";

  let tokenParam: string | undefined;
  if (type === "email_change") {
    if (recipientEmail === userEmailNew) {
      tokenParam = (emailData.token_hash ?? emailData.token_new)?.trim();
    } else {
      tokenParam = (emailData.token_hash_new ?? emailData.token)?.trim();
    }
  } else {
    tokenParam = (emailData.token_hash ?? emailData.token)?.trim();
  }

  if (!tokenParam) return "";

  const params = new URLSearchParams();
  params.set("token", tokenParam);
  params.set("type", type);
  if (redirectTo) params.set("redirect_to", redirectTo);

  return `${supabaseUrl}/auth/v1/verify?${params.toString()}`;
}

export async function POST(req: Request) {
  const secret = process.env.SUPABASE_EMAIL_HOOK_SECRET?.trim();
  const headerSecret = req.headers.get("x-hook-secret")?.trim();

  if (!secret || headerSecret !== secret) {
    console.warn("[send-email-hook] Unauthorized: missing or invalid x-hook-secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: HookPayload;
  try {
    payload = (await req.json()) as HookPayload;
  } catch {
    console.warn("[send-email-hook] Invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { user, email_data } = payload;
  if (!user || !email_data) {
    console.warn("[send-email-hook] Missing user or email_data");
    return NextResponse.json({ error: "Missing user or email_data" }, { status: 400 });
  }

  const actionType = (email_data.email_action_type || "recovery") as EmailActionType;
  const toEmail = (user.email ?? user.email_new) as string | undefined;
  if (!toEmail || !toEmail.includes("@")) {
    console.warn("[send-email-hook] No valid recipient email");
    return NextResponse.json({ error: "No valid recipient email" }, { status: 400 });
  }

  if (!SUPABASE_URL) {
    console.error("[send-email-hook] NEXT_PUBLIC_SUPABASE_URL not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const link = buildActionLink(
    email_data,
    SUPABASE_URL,
    toEmail,
    user.email as string | undefined,
    user.email_new as string | undefined
  );
  const { subject, body } = getEmailContent(actionType, {
    link,
    recipientEmail: toEmail,
    oldEmail: email_data.old_email as string | undefined,
  });

  try {
    await sendEmail({
      to: toEmail,
      subject,
      html: body,
    });
    console.log("[send-email-hook] Sent", actionType, "to", toEmail);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[send-email-hook] Send failed:", msg);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
