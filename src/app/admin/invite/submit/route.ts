import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/sendEmail";
import { resolveInviteEmailActionLink } from "@/lib/invites/buildInviteContinueUrl";
import { buildPortalInviteEmail, INVITE_EMAIL_SUBJECT } from "@/lib/email/portalInviteEmail";

// Customer users: default to order-capable customer role.
const CUSTOMER_ROLE = "ORDER_CREATOR" as const;

const Schema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1, "Name is required").max(120, "Name is too long"),
  mode: z.enum(["existing", "new"]),
  accountId: z.string().uuid().optional(),
  accountName: z.string().min(1).optional(),

  // New: discount percent (0–100, optional; default 0 if missing)
  discountPercent: z
    .number()
    .min(0, "Discount must be >= 0")
    .max(100, "Discount must be <= 100")
    .optional(),
  payment_terms_days: z.number().min(0, "Terms days must be >= 0").max(365, "Terms days too large").optional(),
  payment_terms_label: z.string().min(1).max(120).optional(),
});

function getBaseUrl(req: Request) {
  const override = process.env.APP_URL_FOR_INVITES?.trim();
  if (override) return override.replace(/\/$/, "");

  const url = new URL(req.url);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return url.origin.replace(/\/$/, "");
  }
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || url.origin.replace(/\/$/, "");
}

export async function POST(req: Request) {
  // Step 1: Admin-only
  const adminUser = await requireAdmin();
  const actorUserId = (adminUser as any)?.id;

  // Step 2: Validate input
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const fullName = parsed.data.fullName.trim();

  let accountId = parsed.data.accountId;

  // Step 3: Create account if requested
  if (parsed.data.mode === "new") {
    const name = (parsed.data.accountName ?? "").trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "Account name is required." }, { status: 400 });
    }

    const discount_percent =
      typeof parsed.data.discountPercent === "number" ? parsed.data.discountPercent : 40;
    const payment_terms_days =
      typeof parsed.data.payment_terms_days === "number" ? parsed.data.payment_terms_days : 30;
    const payment_terms_label =
      typeof parsed.data.payment_terms_label === "string" && parsed.data.payment_terms_label.trim()
        ? parsed.data.payment_terms_label.trim()
        : `Net ${payment_terms_days} (after delivery)`;

    const { data: created, error: createErr } = await supabaseAdmin
      .from("accounts")
      .insert({ name, discount_percent })
      .select("id")
      .single();

    if (createErr || !created?.id) {
      return NextResponse.json(
        { ok: false, error: createErr?.message || "Failed to create account" },
        { status: 500 }
      );
    }

    accountId = created.id;

    await supabaseAdmin.from("account_pricing").insert({
      account_id: accountId,
      discount_percent,
      payment_terms_label,
      payment_terms_days,
    });
  }

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "Account is required." }, { status: 400 });
  }

  // Step 4: Create invite row
  const inviteToken = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from("account_invites")
    .insert({
      account_id: accountId,
      email,
      full_name: fullName,
      role: CUSTOMER_ROLE,
      invited_by_user_id: actorUserId,
      invite_token: inviteToken,
      expires_at: expiresAt,
    })
    .select("id, account_id, email, full_name, role, expires_at, created_at")
    .single();

  if (inviteErr || !invite) {
    return NextResponse.json(
      { ok: false, error: inviteErr?.message || "Failed to create invite" },
      { status: 500 }
    );
  }

  // Step 5: Generate Supabase invite link
  const gen = (supabaseAdmin as any)?.auth?.admin?.generateLink;
  if (typeof gen !== "function") {
    return NextResponse.json(
      { ok: false, error: "Supabase admin generateLink not available in this supabase-js version." },
      { status: 500 }
    );
  }

  const base = getBaseUrl(req);

  // Fallback if a raw Supabase verify URL is still hit somehow
  const next = `/set-password?invite=${encodeURIComponent(invite.id)}&next=${encodeURIComponent("/portal")}`;
  const redirectTo = `${base}/auth/client-callback?next=${encodeURIComponent(next)}`;

  const { data: linkData, error: linkErr } = await (supabaseAdmin as any).auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });

  const actionLink = resolveInviteEmailActionLink({
    base,
    inviteId: invite.id,
    linkData,
    type: "invite",
    next: "/portal",
  });

  if (linkErr || !actionLink) {
    return NextResponse.json(
      { ok: false, error: linkErr?.message || "Failed to generate invite link" },
      { status: 500 }
    );
  }

  let accountNameForEmail = (parsed.data.accountName ?? "").trim() || "your account";
  if (!parsed.data.accountName) {
    const { data: acct } = await supabaseAdmin.from("accounts").select("name").eq("id", accountId).maybeSingle();
    if (acct?.name) accountNameForEmail = String(acct.name);
  }

  const { text, html } = buildPortalInviteEmail({
    fullName,
    accountName: accountNameForEmail,
    actionLink,
    baseUrl: base,
    expiresAtIso: expiresAt,
    mode: "set_password",
  });

  await sendEmail({
    to: [email],
    subject: INVITE_EMAIL_SUBJECT,
    text,
    html,
  });

  return NextResponse.json({ ok: true, invite, inviteUrl: actionLink, accountId });
}
