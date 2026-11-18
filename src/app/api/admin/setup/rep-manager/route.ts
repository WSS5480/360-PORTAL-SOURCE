import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const Schema = z.object({
  repUserId: z.string().uuid(),
  managerUserId: z.string().uuid().nullable(),
});

async function loadSalesRepProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, is_internal_sales_rep, is_territory_manager")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { repUserId, managerUserId } = parsed.data;

    if (managerUserId && repUserId === managerUserId) {
      return NextResponse.json({ ok: false, error: "A rep cannot report to themselves" }, { status: 400 });
    }

    const repProfile = await loadSalesRepProfile(repUserId);
    if (!repProfile?.is_internal_sales_rep) {
      return NextResponse.json({ ok: false, error: "Only sales reps can be assigned to a manager" }, { status: 400 });
    }
    if (repProfile.is_territory_manager) {
      return NextResponse.json(
        { ok: false, error: "Territory managers cannot be placed on a manager roster" },
        { status: 400 },
      );
    }

    if (!managerUserId) {
      const { error } = await supabaseAdmin.from("sales_rep_manager_assignments").delete().eq("rep_user_id", repUserId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    } else {
      const managerProfile = await loadSalesRepProfile(managerUserId);
      if (!managerProfile?.is_internal_sales_rep || !managerProfile.is_territory_manager) {
        return NextResponse.json(
          { ok: false, error: "Manager must be an active territory manager" },
          { status: 400 },
        );
      }

      const { error } = await supabaseAdmin.from("sales_rep_manager_assignments").upsert(
        { rep_user_id: repUserId, manager_user_id: managerUserId },
        { onConflict: "rep_user_id" },
      );
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    try {
      await supabaseAdmin.from("admin_audit_log").insert({
        actor_user_id: auth.ctx.userId,
        action: "SALES_REP_MANAGER_ASSIGNMENT_UPDATED",
        metadata: { rep_user_id: repUserId, manager_user_id: managerUserId, source: "admin_setup" },
      });
    } catch {
      // best-effort audit
    }

    return NextResponse.json({ ok: true, repUserId, managerUserId });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to update rep manager assignment" },
      { status: 500 },
    );
  }
}
