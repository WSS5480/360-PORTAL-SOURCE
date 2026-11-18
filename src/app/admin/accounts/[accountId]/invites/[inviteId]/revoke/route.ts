import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ accountId: string; inviteId: string }> }
) {
  const admin = await requireAdmin();
  const actorUserId = admin.user.id;

  const { accountId, inviteId } = await ctx.params;

  const { data: inv, error: invErr } = await supabaseAdmin
    .from("account_invites")
    .select("id, account_id, email, role, accepted_at, revoked_at")
    .eq("id", inviteId)
    .eq("account_id", accountId)
    .single();

  if (invErr || !inv) {
    return NextResponse.json(
      { ok: false, error: invErr?.message || "Invite not found" },
      { status: 404 }
    );
  }

  const email = String(inv.email || "").toLowerCase().trim();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Invite email missing" }, { status: 500 });
  }

  // Revoke invite (idempotent)
  await supabaseAdmin
    .from("account_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inv.id);

  let removedMembership = false;

  // If they already accepted, "revoke" means remove them from this account
  if (inv.accepted_at) {
    // Find user_id by email via user_profiles (your schema has email not-null)
    const { data: prof } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    const userId = prof?.user_id as string | undefined;

    if (userId) {
      const { error: delErr } = await supabaseAdmin
        .from("account_users")
        .delete()
        .eq("account_id", accountId)
        .eq("user_id", userId);

      if (!delErr) removedMembership = true;
    }
  }

  // Best-effort audit (won't crash if table doesn't exist)
  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: actorUserId,
      action: inv.accepted_at ? "ACCOUNT_USER_REMOVED_VIA_REVOKE" : "ACCOUNT_INVITE_REVOKED",
      metadata: { account_id: accountId, invite_id: inv.id, email, removedMembership },
    });
  } catch {}

  return NextResponse.json({ ok: true, removedMembership });
}
