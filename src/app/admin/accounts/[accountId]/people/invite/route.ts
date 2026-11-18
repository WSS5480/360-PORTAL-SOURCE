import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/sendEmail";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

function normEmail(v: unknown) {
  return safeStr(v).trim().toLowerCase();
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function makeToken() {
  // 48 hex chars
  return crypto.randomBytes(24).toString("hex");
}

/**
 * IMPORTANT:
 * Your schema uses enum public.account_user_role.
 * I cannot see the exact enum values in your DB.
 *
 * This default "MEMBER" is a guess. If your enum uses "USER" or "CUSTOMER", change DEFAULT_ROLE below.
 */
const DEFAULT_ROLE = "MEMBER";
const DEFAULT_EXPIRES_DAYS = 7;

// Adjust this if your app's invite accept route is different
function buildInviteLink(baseUrl: string, token: string) {
  // Common patterns:
  //  - /invite?token=...
  //  - /portal/invite?token=...
  //  - /accept-invite?token=...
  //
  // Pick one and make it match your existing accept page.
  return `${baseUrl}/invite?token=${encodeURIComponent(token)}`;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ accountId: string }> | { accountId: string } }
) {
  const admin = await requireAdmin();
  const actorUserId = (admin as any)?.user?.id || (admin as any)?.userId || "";

  const { accountId } = await Promise.resolve(ctx.params);
  if (!UUID_RE.test(accountId)) {
    return NextResponse.redirect(urlFromRequest(req, `/admin/accounts/${accountId}/people?err=Invalid%20account`), 303);
  }

  const form = await req.formData();
  const contactId = safeStr(form.get("contact_id")).trim();
  const role = (safeStr(form.get("role")).trim().toUpperCase() || DEFAULT_ROLE) as any;

  if (!UUID_RE.test(contactId)) {
    return NextResponse.redirect(
      urlFromRequest(req, `/admin/accounts/${accountId}/people?err=Invalid%20contact`),
      303
    );
  }

  const sb: any = createSupabaseAdminClient();

  // Load contact (scoped)
  const { data: contact, error: cErr } = await sb
    .from("account_contacts")
    .select("id,account_id,full_name,email")
    .eq("id", contactId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (cErr || !contact) {
    return NextResponse.redirect(
      urlFromRequest(req, `/admin/accounts/${accountId}/people?err=Contact%20not%20found`),
      303
    );
  }

  const email = normEmail(contact.email);
  if (!email) {
    return NextResponse.redirect(
      urlFromRequest(req, `/admin/accounts/${accountId}/people?err=Contact%20missing%20email`),
      303
    );
  }

  // Revoke any existing pending invites for this email+account (keeps history)
  await sb
    .from("account_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null);

  const token = makeToken();
  const expiresAt = addDays(new Date(), DEFAULT_EXPIRES_DAYS).toISOString();

  // Create invite row
  const { data: inv, error: invErr } = await sb
    .from("account_invites")
    .insert({
      account_id: accountId,
      email,
      role, // must match enum
      invited_by_user_id: actorUserId || null,
      expires_at: expiresAt,
      invite_token: token,
    })
    .select("id,invite_token,expires_at,email,role")
    .single();

  if (invErr || !inv) {
    const msg = encodeURIComponent(invErr?.message || "Failed to create invite");
    return NextResponse.redirect(urlFromRequest(req, `/admin/accounts/${accountId}/people?err=${msg}`), 303);
  }

  // Build link
  const baseUrl =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    req.url.split("/admin/")[0];

  const inviteLink = buildInviteLink(baseUrl, token);

  // Email (NO PHI)
  const displayName = safeStr(contact.full_name).trim();
  const hello = displayName ? `Hi ${displayName},` : "Hi,";

  await sendEmail({
    to: [email],
    subject: "360 Medical — Portal Invitation",
    text:
      `${hello}\n\n` +
      `You have been invited to access the 360 Medical portal.\n\n` +
      `Accept your invite using this secure link:\n` +
      `${inviteLink}\n\n` +
      `This invite expires on: ${new Date(inv.expires_at).toLocaleString()}\n\n` +
      `If you were not expecting this invitation, you can ignore this email.\n`,
  });

  return NextResponse.redirect(
    urlFromRequest(req, `/admin/accounts/${accountId}/people?flash=${encodeURIComponent(`Invite sent to ${email}`)}`),
    303
  );
}
