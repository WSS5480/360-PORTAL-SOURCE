import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getInviteAppBaseUrl } from "@/lib/email/getInviteAppBaseUrl";
import { sendEmail } from "@/lib/email/sendEmail";
import { resolveInviteEmailActionLink } from "@/lib/invites/buildInviteContinueUrl";

export const dynamic = "force-dynamic";

const Schema = z.object({
  email: z.string().email(),
  role: z
    .enum(["INTERNAL_ADMIN", "IVR_STAFF", "INTERNAL_SALES_REP", "ACCOUNT_ADMIN", "ORDER_CREATOR"])
    .default("ORDER_CREATOR"),
});

async function generateInviteOrMagicLink(args: { req: Request; email: string; inviteId: string }) {
  const { req, email, inviteId } = args;

  const gen = (supabaseAdmin as any)?.auth?.admin?.generateLink;
  if (typeof gen !== "function") {
    throw new Error("Supabase admin generateLink not available in this supabase-js version.");
  }

  const base = getInviteAppBaseUrl(req);

  // Fallback redirect if someone still hits a raw Supabase verify URL
  const next = `/set-password?invite=${encodeURIComponent(inviteId)}&next=${encodeURIComponent("/portal")}`;
  const redirectTo = `${base}/auth/client-callback?next=${encodeURIComponent(next)}`;

  // Try INVITE first (works for brand-new emails)
  const inviteRes = await (supabaseAdmin as any).auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });

  const inviteLink = resolveInviteEmailActionLink({
    base,
    inviteId,
    linkData: inviteRes?.data,
    type: "invite",
    next: "/portal",
  });
  if (!inviteRes?.error && inviteLink) {
    return { mode: "invite" as const, link: inviteLink };
  }

  // Fallback: MAGIC LINK for already-registered users
  const magicRes = await (supabaseAdmin as any).auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  const magicLink = resolveInviteEmailActionLink({
    base,
    inviteId,
    linkData: magicRes?.data,
    type: "magiclink",
    next: "/portal",
  });
  if (magicRes?.error || !magicLink) {
    const msg =
      (inviteRes?.error?.message as string | undefined) ||
      (magicRes?.error?.message as string | undefined) ||
      "Failed to generate access link";
    throw new Error(msg);
  }

  return { mode: "magiclink" as const, link: magicLink };
}

export async function POST(req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  const admin = await requireAdmin();
  const actorUserId = admin.user.id;

  const { accountId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const role = parsed.data.role;

  // Prevent duplicate emails: skip if we sent an invite to this email+account in the last 2 minutes
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: recent } = await supabaseAdmin
    .from("account_invites")
    .select("id")
    .eq("account_id", accountId)
    .eq("email", email)
    .gte("created_at", twoMinutesAgo)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (recent) {
    return NextResponse.json(
      {
        ok: false,
        error: "An invite was just sent to this email. Please wait a few minutes before sending again, or use Resend on the existing invite.",
      },
      { status: 429 }
    );
  }

  // Track invite in DB
  const inviteToken = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from("account_invites")
    .insert({
      account_id: accountId,
      email,
      role,
      invited_by_user_id: actorUserId,
      invite_token: inviteToken,
      expires_at: expiresAt,
    })
    .select("id, account_id, email, role, expires_at, created_at")
    .single();

  if (inviteErr || !invite) {
    return NextResponse.json(
      { ok: false, error: inviteErr?.message || "Failed to create invite" },
      { status: 500 }
    );
  }

  let linkInfo;
  try {
    linkInfo = await generateInviteOrMagicLink({ req, email, inviteId: invite.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to generate link" }, { status: 500 });
  }

  // Email (NO PHI)
  await sendEmail({
    to: [email],
    subject: "360 Medical — Portal Invitation",
    text:
      `You’ve been invited to the secure 360 Medical portal.\n\n` +
      `Use this link to access the portal:\n` +
      `${linkInfo.link}\n\n` +
      `This email does not include patient information.`,
  });

  return NextResponse.json({ ok: true, invite, inviteUrl: linkInfo.link, linkMode: linkInfo.mode });
}
