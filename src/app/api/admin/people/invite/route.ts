import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/sendEmail";

export const dynamic = "force-dynamic";

const Schema = z.object({
  contact_id: z.string().uuid(),
  account_id: z.string().uuid(),
});

function norm(s: string) {
  return String(s || "").trim().toLowerCase();
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  const actorUserId = (admin as any)?.user?.id || (admin as any)?.userId || "";
  if (!actorUserId) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  const supabase: any = createSupabaseAdminClient();

  // Load contact
  const { data: contact, error: cErr } = await supabase
    .from("account_contacts")
    .select("id,account_id,full_name,email,user_id")
    .eq("id", parsed.data.contact_id)
    .eq("account_id", parsed.data.account_id)
    .single();

  if (cErr) return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
  if (!contact) return NextResponse.json({ ok: false, error: "Contact not found" }, { status: 404 });

  if (contact.user_id) {
    return NextResponse.json({ ok: false, error: "This contact is already linked to a portal user." }, { status: 400 });
  }

  const email = norm(contact.email);
  if (!email) return NextResponse.json({ ok: false, error: "Contact missing email" }, { status: 400 });

  // Prevent duplicates: if there is a pending invite for this email+account, block
  const { data: existing } = await supabase
    .from("account_invites")
    .select("id,accepted_at,revoked_at")
    .eq("account_id", parsed.data.account_id)
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({ ok: false, error: "An invite is already pending for this person." }, { status: 400 });
  }

  // NOTE: adjust role to match your enum values if needed.
  // Common: "MEMBER" / "ADMIN"
  const role = "MEMBER";

  const inviteToken = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  const { data: inv, error: invErr } = await supabase
    .from("account_invites")
    .insert({
      account_id: parsed.data.account_id,
      email,
      role,
      invited_by_user_id: actorUserId,
      expires_at: expiresAt.toISOString(),
      invite_token: inviteToken,
    })
    .select("id")
    .single();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

  // Email the invite
  const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const inviteLink = baseUrl ? `${baseUrl}/portal/accept-invite?token=${inviteToken}` : `/portal/accept-invite?token=${inviteToken}`;

  await sendEmail({
    to: [email],
    subject: "360 Medical — Portal Invitation",
    text:
      `You’ve been invited to the 360 Medical portal.\n\n` +
      `Accept your invitation here:\n${inviteLink}\n\n` +
      `This link expires in 7 days.`,
  });

  return NextResponse.json({ ok: true, invite_id: inv?.id });
}
