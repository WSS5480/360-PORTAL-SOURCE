import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/requireStaff";

const Schema = z.object({
  userId: z.string().uuid(),
});

export async function POST(req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  const staffUser = await requireStaff();
  const actorUserId = staffUser.id;

  const { accountId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const { userId } = parsed.data;

  const { error } = await supabaseAdmin
    .from("account_users")
    .update({ disabled_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: actorUserId,
      action: "ACCOUNT_USER_DISABLED",
      metadata: { account_id: accountId, user_id: userId },
    });
  } catch {}

  return NextResponse.json({ ok: true });
}
