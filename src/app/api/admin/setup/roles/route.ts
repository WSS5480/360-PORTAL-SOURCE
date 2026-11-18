import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ensureInternalTeamMembership } from "@/lib/admin/ensureInternalTeamMembership";

export const dynamic = "force-dynamic";

const Schema = z.object({
  userId: z.string().uuid(),
  is_admin: z.boolean(),
  is_internal_sales_rep: z.boolean(),
  is_territory_manager: z.boolean(),
});

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { userId, is_admin, is_internal_sales_rep, is_territory_manager } = parsed.data;

  const { data: userRes, error: userErr } = await (supabaseAdmin as any).auth.admin.getUserById(userId);
  if (userErr || !userRes?.user) {
    return NextResponse.json({ ok: false, error: userErr?.message || "Failed to load user" }, { status: 404 });
  }

  const targetEmail = (userRes.user.email || "").toLowerCase().trim();
  if (!targetEmail) {
    return NextResponse.json(
      { ok: false, error: "Target user has no email; cannot update profile" },
      { status: 400 },
    );
  }

  const isTerritoryManager = is_internal_sales_rep ? is_territory_manager : false;
  if (!is_internal_sales_rep && is_territory_manager) {
    return NextResponse.json(
      { ok: false, error: "Territory manager requires Sales rep access" },
      { status: 400 },
    );
  }

  if (is_admin) {
    const { error } = await supabaseAdmin
      .from("internal_users")
      .upsert({ user_id: userId, role: "ADMIN" }, { onConflict: "user_id" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin.from("internal_users").delete().eq("user_id", userId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { data: existingProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("is_staff")
    .eq("user_id", userId)
    .maybeSingle();

  const { error: profileErr } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        email: targetEmail,
        is_internal_sales_rep,
        is_territory_manager: isTerritoryManager,
        is_staff: existingProfile?.is_staff === true,
      },
      { onConflict: "user_id" },
    );
  if (profileErr) {
    return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });
  }

  if (!is_internal_sales_rep) {
    await supabaseAdmin.from("sales_rep_manager_assignments").delete().eq("rep_user_id", userId);
  } else if (isTerritoryManager) {
    await supabaseAdmin.from("sales_rep_manager_assignments").delete().eq("rep_user_id", userId);
  }

  if (!isTerritoryManager) {
    await supabaseAdmin.from("sales_rep_manager_assignments").delete().eq("manager_user_id", userId);
  }

  // Sales Command teammates belong on the shared internal ordering account.
  if (is_admin || is_internal_sales_rep) {
    const membership = await ensureInternalTeamMembership(
      userId,
      is_admin ? "ACCOUNT_ADMIN" : "ORDER_CREATOR",
    );
    if (!membership.ok) {
      return NextResponse.json({ ok: false, error: membership.error }, { status: 500 });
    }
  }

  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: auth.ctx.userId,
      action: "USER_ROLES_UPDATED",
      metadata: {
        target_user_id: userId,
        is_admin,
        is_internal_sales_rep,
        is_territory_manager: isTerritoryManager,
        source: "admin_setup",
      },
    });
  } catch {
    // best-effort audit
  }

  return NextResponse.json({
    ok: true,
    roles: { is_admin, is_internal_sales_rep, is_territory_manager: isTerritoryManager },
  });
}
