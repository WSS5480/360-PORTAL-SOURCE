import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getInviteAppBaseUrl } from "@/lib/email/getInviteAppBaseUrl";
import { buildPortalInviteEmail, INVITE_EMAIL_SUBJECT } from "@/lib/email/portalInviteEmail";
import { sendEmail } from "@/lib/email/sendEmail";
import { resolveInviteEmailActionLink } from "@/lib/invites/buildInviteContinueUrl";
import { normalizeBulkRules } from "@/lib/bulkRules";

export const dynamic = "force-dynamic";

const DEFAULT_CUSTOMER_ROLE = "ORDER_CREATOR" as const;
const ROLE_VALUES = ["INTERNAL_ADMIN", "IVR_STAFF", "INTERNAL_SALES_REP", "ORDER_CREATOR", "ACCOUNT_ADMIN"] as const;

const bulkRuleSchema = z.object({
  min_sqcm: z.number(),
  price_per_sqcm: z.number().positive(),
  product_id: z.string().uuid().nullable().optional(),
});

const Schema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1, "Full name is required").max(120, "Full name is too long"),
  mode: z.enum(["existing", "new"]),
  accountId: z.string().uuid().optional(),
  accountName: z.string().min(1).optional(),
  fromPeople: z.boolean().optional(),
  discount_percent: z.number().min(0).max(100).optional(),
  payment_terms_days: z.number().min(0).max(365).optional(),
  payment_terms_label: z.string().min(1).max(120).optional(),
  bulk_enabled: z.boolean().optional(),
  bulk_rules: z.array(bulkRuleSchema).optional(),
  virtual_warehouse_enabled: z.boolean().optional(),
  role: z.enum(ROLE_VALUES).optional().default(DEFAULT_CUSTOMER_ROLE),
});

export async function POST(req: Request) {
  // ✅ IMPORTANT: do auth enforcement outside try/catch (don’t swallow redirects / auth behavior)
  const adminUser = await requireAdmin();
  const actorUserId = (adminUser as any)?.id || (adminUser as any)?.user?.id || null;

  try {
    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const fullName = parsed.data.fullName.trim();
    const role = parsed.data.role ?? DEFAULT_CUSTOMER_ROLE;

    let accountId = parsed.data.accountId;

    if (parsed.data.mode === "new") {
      const name = (parsed.data.accountName ?? "").trim();
      if (!name) {
        return NextResponse.json({ ok: false, error: "Account name is required." }, { status: 400 });
      }

      const bulk_enabled = parsed.data.bulk_enabled === true;
      const bulk_rulesRaw = Array.isArray(parsed.data.bulk_rules) ? parsed.data.bulk_rules : [];
      const bulk_rules = normalizeBulkRules(bulk_rulesRaw);

      if (bulk_enabled && bulk_rules.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Bulk purchasing is enabled: add at least one rule (min sq cm and base $/sq cm)." },
          { status: 400 }
        );
      }

      const discount_percent =
        typeof parsed.data.discount_percent === "number" ? parsed.data.discount_percent : 40;
      const payment_terms_days =
        typeof parsed.data.payment_terms_days === "number" ? parsed.data.payment_terms_days : 30;
      const payment_terms_label =
        typeof parsed.data.payment_terms_label === "string" && parsed.data.payment_terms_label.trim()
          ? parsed.data.payment_terms_label.trim()
          : `Net ${payment_terms_days} (after delivery)`;

      const { data: created, error: createErr } = await supabaseAdmin
        .from("accounts")
        .insert({
          name,
          discount_percent,
        })
        .select("id")
        .single();

      if (createErr || !created?.id) {
        return NextResponse.json(
          { ok: false, error: createErr?.message || "Failed to create account" },
          { status: 500 }
        );
      }

      accountId = created.id;

      const virtual_warehouse_enabled = parsed.data.virtual_warehouse_enabled === true;

      await supabaseAdmin.from("account_pricing").insert({
        account_id: accountId,
        discount_percent,
        payment_terms_label,
        payment_terms_days,
        bulk_enabled,
        bulk_rules: bulk_enabled ? bulk_rules : [],
        virtual_warehouse_enabled,
      });
    }

    if (!accountId) {
      return NextResponse.json({ ok: false, error: "Account is required." }, { status: 400 });
    }

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

    let accountNameForEmail = "your account";
    const { data: acct } = await supabaseAdmin.from("accounts").select("name").eq("id", accountId).single();
    if (acct?.name) accountNameForEmail = acct.name;

    const inviteToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // ✅ Default new invites to ORDER_CREATOR (legacy IVR_SUBMITTER is no longer used here)
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from("account_invites")
      .insert({
        account_id: accountId,
        email,
        full_name: fullName,
        role,
        invited_by_user_id: actorUserId,
        invite_token: inviteToken,
        expires_at: expiresAt,
      })
      .select("id, account_id, email, full_name, role, expires_at, created_at")
      .single();

    if (inviteErr || !invite?.id) {
      return NextResponse.json(
        { ok: false, error: inviteErr?.message || "Failed to create invite" },
        { status: 500 }
      );
    }

    const gen = (supabaseAdmin as any)?.auth?.admin?.generateLink;
    if (typeof gen !== "function") {
      return NextResponse.json(
        { ok: false, error: "Supabase admin generateLink not available in this supabase-js version." },
        { status: 500 }
      );
    }

    const base = getInviteAppBaseUrl(req);
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

    return NextResponse.json({
      ok: true,
      invite,
      inviteUrl: actionLink,
      accountId,
      _debug: process.env.NODE_ENV === "development" ? { base, redirectTo } : undefined,
    });
  } catch (e: any) {
    console.error("[api/admin/invite] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ? String(e.message) : "Unknown server error" },
      { status: 500 }
    );
  }
}
