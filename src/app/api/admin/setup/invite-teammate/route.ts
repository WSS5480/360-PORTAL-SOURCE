import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getInviteAppBaseUrl } from "@/lib/email/getInviteAppBaseUrl";
import { buildPortalInviteEmail, INVITE_EMAIL_SUBJECT } from "@/lib/email/portalInviteEmail";
import { sendEmail } from "@/lib/email/sendEmail";
import { resolveInviteEmailActionLink } from "@/lib/invites/buildInviteContinueUrl";
import {
  ensureInternalTeamMembership,
  INTERNAL_TEAM_ACCOUNT_NAME,
} from "@/lib/admin/ensureInternalTeamMembership";

export const dynamic = "force-dynamic";

const TEAMMATE_ROLES = ["INTERNAL_SALES_REP", "INTERNAL_ADMIN", "IVR_STAFF"] as const;
type TeammateRole = (typeof TEAMMATE_ROLES)[number];

const Schema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  role: z.enum(TEAMMATE_ROLES),
});

const NEXT_BY_ROLE: Record<TeammateRole, string> = {
  INTERNAL_SALES_REP: "/portal/sales",
  INTERNAL_ADMIN: "/admin",
  IVR_STAFF: "/admin/ivr",
};

async function findUserIdByEmail(email: string): Promise<string | null> {
  const target = email.toLowerCase().trim();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await (supabaseAdmin as any).auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const users = data?.users ?? [];
    const match = users.find((u: any) => (u.email || "").toLowerCase().trim() === target);
    if (match) return match.id as string;
    if (users.length < 200) break;
  }
  return null;
}

async function applyRole(
  userId: string,
  email: string,
  fullName: string,
  role: TeammateRole,
): Promise<string | null> {
  if (role === "INTERNAL_ADMIN") {
    const { error } = await supabaseAdmin
      .from("internal_users")
      .upsert({ user_id: userId, role: "ADMIN" }, { onConflict: "user_id" });
    if (error) return error.message;
  }

  const { data: existingProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("is_staff, is_internal_sales_rep, is_territory_manager")
    .eq("user_id", userId)
    .maybeSingle();

  const profilePatch: Record<string, unknown> = {
    user_id: userId,
    email,
    full_name: fullName,
  };

  if (role === "INTERNAL_SALES_REP") {
    profilePatch.is_internal_sales_rep = true;
  } else if (role === "IVR_STAFF") {
    profilePatch.is_staff = true;
  } else {
    // INTERNAL_ADMIN: keep existing sales-rep / staff flags; only ensure profile + name
    profilePatch.is_staff = existingProfile?.is_staff === true;
    profilePatch.is_internal_sales_rep = existingProfile?.is_internal_sales_rep === true;
    profilePatch.is_territory_manager = existingProfile?.is_territory_manager === true;
  }

  const { error: profileErr } = await supabaseAdmin
    .from("user_profiles")
    .upsert(profilePatch, { onConflict: "user_id" });
  if (profileErr) return profileErr.message;

  // Sales Command teammates (reps + admins) belong on the shared internal account.
  if (role === "INTERNAL_SALES_REP" || role === "INTERNAL_ADMIN") {
    const membership = await ensureInternalTeamMembership(
      userId,
      role === "INTERNAL_ADMIN" ? "ACCOUNT_ADMIN" : "ORDER_CREATOR",
    );
    if (!membership.ok) return membership.error;
  }

  return null;
}

type InviteEmailResult = { sent: true } | { sent: false; reason: string };

async function sendTeammateInviteEmail(args: {
  email: string;
  fullName: string;
  role: TeammateRole;
  existed: boolean;
  inviteActionLink?: string;
  request: Request;
}): Promise<InviteEmailResult> {
  const base = getInviteAppBaseUrl(args.request);
  const nextDest = NEXT_BY_ROLE[args.role];
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (args.existed) {
    const actionLink = `${base}/login?next=${encodeURIComponent(nextDest)}`;
    const { text, html } = buildPortalInviteEmail({
      fullName: args.fullName,
      accountName: INTERNAL_TEAM_ACCOUNT_NAME,
      actionLink,
      baseUrl: base,
      expiresAtIso: expiresAt,
      mode: "sign_in_accept",
    });

    try {
      await sendEmail({
        to: [args.email],
        subject: INVITE_EMAIL_SUBJECT,
        text,
        html,
      });
      return { sent: true };
    } catch (e) {
      return { sent: false, reason: e instanceof Error ? e.message : "Failed to send email" };
    }
  }

  const actionLink = args.inviteActionLink?.trim();
  if (!actionLink) {
    return { sent: false, reason: "No invite link could be generated" };
  }

  const { text, html } = buildPortalInviteEmail({
    fullName: args.fullName,
    accountName: INTERNAL_TEAM_ACCOUNT_NAME,
    actionLink,
    baseUrl: base,
    expiresAtIso: expiresAt,
    mode: "set_password",
  });

  try {
    await sendEmail({
      to: [args.email],
      subject: INVITE_EMAIL_SUBJECT,
      text,
      html,
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "Failed to send email" };
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const fullName = parsed.data.fullName.trim();
  const role = parsed.data.role;

  const base = getInviteAppBaseUrl(req);
  const nextDest = NEXT_BY_ROLE[role];
  const setPasswordNext = `/set-password?next=${encodeURIComponent(nextDest)}`;
  const redirectTo = `${base}/auth/client-callback?next=${encodeURIComponent(setPasswordNext)}`;

  // 1) Resolve / create the auth user
  let userId = await findUserIdByEmail(email);
  let existed = userId !== null;
  let inviteActionLink: string | undefined;

  if (!userId) {
    const gen = (supabaseAdmin as any)?.auth?.admin?.generateLink;
    if (typeof gen !== "function") {
      return NextResponse.json({ ok: false, error: "Auth admin generateLink is unavailable" }, { status: 500 });
    }
    const { data: linkData, error: linkErr } = await (supabaseAdmin as any).auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });
    if (linkErr || !linkData?.user?.id) {
      // Possible race: user created between lookup and now
      userId = await findUserIdByEmail(email);
      existed = true;
      if (!userId) {
        return NextResponse.json(
          { ok: false, error: linkErr?.message || "Could not provision the teammate's account" },
          { status: 500 },
        );
      }
    } else {
      userId = linkData.user.id as string;
      inviteActionLink =
        resolveInviteEmailActionLink({
          base,
          linkData,
          type: "invite",
          next: nextDest,
        }) || undefined;
    }
  }

  // 2) Grant role, save name, and attach to Internal Team when applicable
  const roleErr = await applyRole(userId, email, fullName, role);
  if (roleErr) {
    return NextResponse.json({ ok: false, error: roleErr }, { status: 500 });
  }

  // 3) Email the branded portal invite (new users set password; existing users sign in)
  const inviteEmail = await sendTeammateInviteEmail({
    email,
    fullName,
    role,
    existed,
    inviteActionLink,
    request: req,
  });

  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: auth.ctx.userId,
      action: "USER_ROLES_UPDATED",
      metadata: {
        target_user_id: userId,
        role,
        full_name: fullName,
        source: "admin_setup_invite_teammate",
        existed,
        internal_team_account: INTERNAL_TEAM_ACCOUNT_NAME,
      },
    });
  } catch {
    // best-effort audit
  }

  return NextResponse.json({
    ok: true,
    userId,
    existed,
    emailSent: inviteEmail.sent,
    emailReason: inviteEmail.sent ? null : inviteEmail.reason,
  });
}
