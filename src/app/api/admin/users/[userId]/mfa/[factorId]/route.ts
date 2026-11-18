import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(req: Request, ctx: { params: Promise<{ userId: string; factorId: string }> }) {
  const adminCtx = await requireAdmin();
  const actorUserId = (adminCtx as { user?: { id?: string } })?.user?.id ?? null;

  const { userId, factorId } = await ctx.params;
  if (!userId || !UUID_RE.test(userId) || !factorId || !UUID_RE.test(factorId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const mfa = (supabaseAdmin as any).auth?.admin?.mfa;
  if (!mfa?.deleteFactor) {
    return NextResponse.json({ ok: false, error: "MFA admin API not available" }, { status: 501 });
  }

  const { error } = await mfa.deleteFactor({ userId, id: factorId });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message || "Failed to remove factor" }, { status: 400 });
  }

  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: actorUserId,
      action: "ADMIN_USER_MFA_FACTOR_REMOVED",
      metadata: { target_user_id: userId, factor_id: factorId },
    });
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true });
}
