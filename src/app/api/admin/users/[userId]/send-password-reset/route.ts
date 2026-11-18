import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPasswordRecoveryEmail } from "@/lib/auth/sendPasswordRecoveryEmail";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const adminCtx = await requireAdmin();
  const actorUserId = (adminCtx as { user?: { id?: string } })?.user?.id ?? null;

  const { userId } = await ctx.params;
  if (!userId || !UUID_RE.test(userId)) {
    return NextResponse.json({ ok: false, error: "Invalid user id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const next = typeof body?.next === "string" && body.next.startsWith("/") ? body.next : "/portal";

  const { data: userRes, error: userErr } = await (supabaseAdmin as any).auth.admin.getUserById(userId);
  if (userErr || !userRes?.user) {
    return NextResponse.json({ ok: false, error: userErr?.message || "User not found" }, { status: 404 });
  }

  const email = String(userRes.user.email ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: "This user has no email address on file." }, { status: 400 });
  }

  const result = await sendPasswordRecoveryEmail({ email, next, request: req });
  if (!result.sent) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: actorUserId,
      action: "ADMIN_USER_PASSWORD_RESET_EMAIL",
      metadata: { target_user_id: userId, email },
    });
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true });
}
