import { NextResponse } from "next/server";
import crypto from "crypto";
import { getInviteAppBaseUrl } from "@/lib/email/getInviteAppBaseUrl";
import { buildPortalInviteEmail, INVITE_EMAIL_SUBJECT } from "@/lib/email/portalInviteEmail";
import { sendEmail } from "@/lib/email/sendEmail";
import { resolveInviteEmailActionLink } from "@/lib/invites/buildInviteContinueUrl";
import { supabaseAdmin } from "@/lib/supabase/admin";

function buildLoginAcceptUrl(base: string, inviteId: string) {
  const next = `/invite/accept?invite=${encodeURIComponent(inviteId)}`;
  return `${base}/login?next=${encodeURIComponent(next)}`;
}

function looksLikeExistingUserError(message: string) {
  const m = (message || "").toLowerCase();
  return (
    m.includes("already been registered") ||
    m.includes("already registered") ||
    m.includes("already exists") ||
    m.includes("user already exists") ||
    m.includes("email address has already been registered") ||
    (m.includes("registered") && m.includes("already"))
  );
}

function displayNameFromEmail(email: string) {
  const local = email.split("@")[0] || "";
  if (!local) return "there";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function emailErrMessage(e: unknown) {
  return e instanceof Error ? e.message : "Failed to send email (check Azure Graph / EMAIL_* env vars).";
}

/**
 * Shared resend implementation for POST /api/admin/accounts/.../invites/.../resend
 * and the legacy /admin/accounts/.../invites/.../resend route.
 */
export async function executeAccountInviteResend(opts: {
  req: Request;
  accountId: string;
  inviteId: string;
  actorUserId: string;
}) {
  const { req, accountId, inviteId, actorUserId } = opts;

  const { data: old, error: oldErr } = await supabaseAdmin
    .from("account_invites")
    .select("id, account_id, email, role, accepted_at, revoked_at, full_name")
    .eq("id", inviteId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (oldErr) return NextResponse.json({ ok: false, error: oldErr.message }, { status: 500 });
  if (!old) return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });

  if (old.accepted_at) {
    return NextResponse.json(
      { ok: false, error: "Invite already accepted. Use Members → Remove to remove access." },
      { status: 400 }
    );
  }

  const email = String(old.email || "").toLowerCase().trim();
  if (!email) return NextResponse.json({ ok: false, error: "Invite has no email" }, { status: 500 });

  let accountName = "your account";
  const { data: acct } = await supabaseAdmin.from("accounts").select("name").eq("id", accountId).maybeSingle();
  if (acct?.name) accountName = String(acct.name);

  const fullName =
    String((old as { full_name?: string | null }).full_name || "").trim() || displayNameFromEmail(email);

  await supabaseAdmin.from("account_invites").update({ revoked_at: new Date().toISOString() }).eq("id", old.id);

  const newToken = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const insertRow: Record<string, unknown> = {
    account_id: accountId,
    email,
    role: old.role,
    invited_by_user_id: actorUserId,
    invite_token: newToken,
    expires_at: expiresAt,
  };
  const fn = (old as { full_name?: string | null }).full_name;
  if (fn != null && String(fn).trim()) insertRow.full_name = String(fn).trim();

  const { data: created, error: createErr } = await supabaseAdmin
    .from("account_invites")
    .insert(insertRow)
    .select("id, account_id, email, role, expires_at, created_at, full_name")
    .single();

  if (createErr || !created) {
    return NextResponse.json(
      { ok: false, error: createErr?.message || "Failed to create new invite" },
      { status: 500 }
    );
  }

  const base = getInviteAppBaseUrl(req);
  const sentTo = String(created.email || "").trim();

  const gen = (supabaseAdmin as any)?.auth?.admin?.generateLink;

  const sendLoginInvite = async (detail: string) => {
    const loginUrl = buildLoginAcceptUrl(base, created.id);
    const { text, html } = buildPortalInviteEmail({
      fullName,
      accountName,
      actionLink: loginUrl,
      baseUrl: base,
      expiresAtIso: expiresAt,
      mode: "sign_in_accept",
    });
    await sendEmail({
      to: [created.email],
      subject: INVITE_EMAIL_SUBJECT,
      text,
      html,
    });
    return NextResponse.json({
      ok: true,
      invite: created,
      method: "login_link",
      sentTo,
      detail,
    });
  };

  if (typeof gen !== "function") {
    try {
      return await sendLoginInvite("Login / accept link emailed (generateLink unavailable).");
    } catch (e) {
      return NextResponse.json({ ok: false, error: emailErrMessage(e) }, { status: 500 });
    }
  }

  const next = `/set-password?invite=${encodeURIComponent(created.id)}&next=${encodeURIComponent("/portal")}`;
  const redirectTo = `${base}/auth/client-callback?next=${encodeURIComponent(next)}`;

  const { data: linkData, error: linkErr } = await (supabaseAdmin as any).auth.admin.generateLink({
    type: "invite",
    email: created.email,
    options: { redirectTo },
  });

  const actionLink = resolveInviteEmailActionLink({
    base,
    inviteId: created.id,
    linkData,
    type: "invite",
    next: "/portal",
  });

  if (linkErr || !actionLink) {
    const msg = linkErr?.message || "Failed to generate invite link";

    if (looksLikeExistingUserError(msg)) {
      try {
        return await sendLoginInvite("Existing user: sign-in link emailed to accept account access.");
      } catch (e) {
        return NextResponse.json({ ok: false, error: emailErrMessage(e) }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  try {
    const { text, html } = buildPortalInviteEmail({
      fullName,
      accountName,
      actionLink,
      baseUrl: base,
      expiresAtIso: expiresAt,
      mode: "set_password",
    });

    await sendEmail({
      to: [created.email],
      subject: INVITE_EMAIL_SUBJECT,
      text,
      html,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: emailErrMessage(e) }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    invite: created,
    method: "supabase_invite",
    sentTo,
    detail: "Invitation email sent with set-password link.",
  });
}
