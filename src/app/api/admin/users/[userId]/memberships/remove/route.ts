import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

const Schema = z.object({
  accountId: z.string().uuid(),
});

export async function POST(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const admin = await requireAdmin();
  const actorUserId = admin.user.id;

  const { userId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const accountId = parsed.data.accountId;

  const { error } = await supabaseAdmin.from("account_users").delete().eq("account_id", accountId).eq("user_id", userId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: actorUserId,
      action: "ACCOUNT_USER_REMOVED",
      metadata: { account_id: accountId, removed_user_id: userId },
    });
  } catch {
    // ignore if audit table not present
  }

  return NextResponse.json({ ok: true });
}
