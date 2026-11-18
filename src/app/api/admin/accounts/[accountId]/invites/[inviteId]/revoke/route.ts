import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/admin/requireAdminOrStaff";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ accountId: string; inviteId: string }> }
) {
  const authCtx = await requireAdminOrStaff();
  const actorUserId = authCtx.user.id;

  const { accountId, inviteId } = await ctx.params;

  // Load existing invite (must belong to account)
  const { data: inv, error: invErr } = await supabaseAdmin
    .from("account_invites")
    .select("id, account_id, email, role, accepted_at, revoked_at")
    .eq("id", inviteId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!inv) return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });

  // If already accepted, revoking the invite token doesn't remove access.
  if (inv.accepted_at) {
    return NextResponse.json(
      { ok: false, error: "Invite already accepted. Use 'Remove user' to remove access." },
      { status: 400 }
    );
  }

  // Revoke (idempotent)
  const { error: upErr } = await supabaseAdmin
    .from("account_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inv.id);

  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  // Best-effort audit (only if table exists)
  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: actorUserId,
      action: "INVITE_REVOKED",
      metadata: { account_id: accountId, invite_id: inviteId, email: inv.email },
    });
  } catch {}

  return NextResponse.json({ ok: true });
}
