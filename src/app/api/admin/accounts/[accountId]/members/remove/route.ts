import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/requireStaff";

const Schema = z.object({
  userId: z.string().uuid(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ accountId: string }> }
) {
  const staffUser = await requireStaff();
  const actorUserId = staffUser.id;

  const { accountId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const userId = parsed.data.userId;

  // Delete membership
  const { error: delErr } = await supabaseAdmin
    .from("account_users")
    .delete()
    .eq("account_id", accountId)
    .eq("user_id", userId);

  if (delErr) {
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
  }

  // Best-effort audit (won’t break if table doesn’t exist yet)
  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: actorUserId,
      action: "ACCOUNT_USER_REMOVED",
      metadata: { account_id: accountId, removed_user_id: userId },
    });
  } catch {
    // ignore: create the table later (recommended below)
  }

  return NextResponse.json({ ok: true });
}
