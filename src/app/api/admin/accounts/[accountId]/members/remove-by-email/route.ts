import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/requireStaff";

export const dynamic = "force-dynamic";

const Schema = z.object({
  email: z.string().email(),
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

  const email = parsed.data.email.toLowerCase().trim();

  // Resolve user_id by email. We use user_profiles because it's app-owned and queryable.
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id,email")
    .eq("email", email)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 });
  }

  if (!profile?.user_id) {
    // User exists in auth but not in user_profiles, or truly doesn't exist.
    return NextResponse.json({ ok: false, error: "User not found for email" }, { status: 404 });
  }

  // Delete membership (idempotent)
  const { error: delErr, count } = await supabaseAdmin
    .from("account_users")
    .delete({ count: "exact" })
    .eq("account_id", accountId)
    .eq("user_id", profile.user_id);

  if (delErr) {
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
  }

  // Optional best-effort audit (only if table exists)
  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: actorUserId,
      action: "ACCOUNT_USER_REMOVED",
      metadata: { account_id: accountId, removed_user_id: profile.user_id, removed_email: email },
    });
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true, removedMembership: (count ?? 0) > 0 });
}
