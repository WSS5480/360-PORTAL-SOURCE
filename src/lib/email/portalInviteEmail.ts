export type PortalInviteEmailMode = "set_password" | "sign_in_accept";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtExpires(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "7 days";
  return d.toLocaleString();
}

/**
 * HTML + plain text for portal invites — matches /api/admin/invite styling.
 * - set_password: Supabase invite / magic link for new users (same as main invite route).
 * - sign_in_accept: login?next=… for users who already have an account.
 */
export function buildPortalInviteEmail(args: {
  fullName: string;
  accountName: string;
  actionLink: string;
  baseUrl: string;
  expiresAtIso: string;
  mode: PortalInviteEmailMode;
}): { text: string; html: string } {
  const { fullName, accountName, actionLink, baseUrl, expiresAtIso, mode } = args;

  const safeName = fullName.trim() || "there";
  const safeAccount = accountName.trim() || "your account";
  const expiresHuman = fmtExpires(expiresAtIso);

  const headerSub =
    mode === "set_password" ? "Secure access invitation" : "Sign in to accept access";

  const ctaLabel = mode === "set_password" ? "Open invite & continue" : "Sign in & accept invitation";

  let text: string;
  let introHtml: string;

  if (mode === "set_password") {
    text =
      `Hi ${safeName},\n\n` +
      `You’ve been invited to access the 360 Medical Portal for ${safeAccount}.\n\n` +
      `The portal is designed to streamline:\n` +
      `• Insurance verification requests\n` +
      `• Product orders\n` +
      `• Secure document access\n\n` +
      `Open the link below, then click Continue to set your password:\n` +
      `${actionLink}\n\n` +
      `This invitation expires: ${expiresHuman}\n\n` +
      `Tip: Use the newest invite email only. Don’t use “Forgot password” until after you’ve set a password from this invite.\n\n` +
      `Sign-in page (after setup): ${baseUrl}/login\n\n` +
      `This email does not include patient information.\n`;

    introHtml = `<p style="margin:0 0 14px 0;">
            You’ve been invited to access the <strong>360 Medical Portal</strong> for
            <strong>${escapeHtml(safeAccount)}</strong>.
          </p>

          <p style="margin:0 0 10px 0;">
            The portal helps streamline your workflow by providing a secure way to:
          </p>

          <ul style="margin:0 0 18px 18px;padding:0;">
            <li>Submit and track insurance verification requests</li>
            <li>Place and manage product orders</li>
            <li>Access supporting documents and updates</li>
          </ul>

          <p style="margin:0 0 18px 0;font-size:13px;opacity:0.85;">
            You’ll confirm on a secure page first (this stops email scanners from using your link), then set your password.
          </p>`;
  } else {
    text =
      `Hi ${safeName},\n\n` +
      `You already have a 360 Medical Portal login. Use the link below to sign in and accept access to ${safeAccount}.\n\n` +
      `${actionLink}\n\n` +
      `This invitation expires: ${expiresHuman}\n\n` +
      `If you forgot your password, use “Forgot password” on the login page.\n\n` +
      `Sign-in page: ${baseUrl}/login\n\n` +
      `This email does not include patient information.\n`;

    introHtml = `<p style="margin:0 0 14px 0;">
            You already have a <strong>360 Medical Portal</strong> login. Use the button below to sign in and
            accept access to <strong>${escapeHtml(safeAccount)}</strong>.
          </p>

          <p style="margin:0 0 18px 0;font-size:13px;opacity:0.85;">
            If you don’t know your password, use <strong>Forgot password</strong> on the login page.
          </p>`;
  }

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f7fa;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:20px;background:#0f172a;color:#ffffff;">
          <div style="font-size:20px;font-weight:900;letter-spacing:0.3px;">360 Medical Portal</div>
          <div style="font-size:12px;opacity:0.8;margin-top:4px;">${escapeHtml(headerSub)}</div>
        </div>

        <div style="padding:24px;font-size:14px;line-height:1.6;">
          <p style="margin:0 0 10px 0;font-weight:800;">Hi ${escapeHtml(safeName)},</p>

          ${introHtml}

          <div style="margin:20px 0 14px 0;">
            <a href="${escapeHtml(actionLink)}"
               style="display:inline-block;background:#0ea5a4;color:#ffffff;text-decoration:none;
                      padding:14px 18px;border-radius:12px;font-weight:900;font-size:14px;">
              ${escapeHtml(ctaLabel)}
            </a>
          </div>

          <p style="margin:0 0 10px 0;font-size:12px;opacity:0.75;">
            This invitation expires: <strong>${escapeHtml(expiresHuman)}</strong>
          </p>

          <p style="margin:0;font-size:12px;opacity:0.75;">
            If the button doesn’t work, copy and paste this link into your browser:
            <br />
            <span style="word-break:break-all;">${escapeHtml(actionLink)}</span>
          </p>
        </div>

        <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid rgba(0,0,0,0.06);
                    font-size:11px;color:#475569;">
          <div>
            Sign in anytime at
            <a href="${escapeHtml(baseUrl)}/login" style="color:#0ea5a4;font-weight:800;text-decoration:none;">
              ${escapeHtml(baseUrl)}/login
            </a>
          </div>
          <div style="margin-top:6px;">This email does not include patient information.</div>
        </div>
      </div>
    </div>
  </body>
</html>`;

  return { text, html };
}

export const INVITE_EMAIL_SUBJECT = "You’re invited to the 360 Medical Portal";
