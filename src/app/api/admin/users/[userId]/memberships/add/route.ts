import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { defaultVirtualWarehouseAccessForAccountRole } from "@/lib/portal/virtualWarehouseAccessDefaultForRole";

const Schema = z.object({
  accountId: z.string().uuid(),
  role: z.string().min(1),
});

function normalizeRole(raw: string) {
  const role = String(raw || "").trim().toUpperCase();
  if (role === "IVR_SUBMITTER") return "ORDER_CREATOR";
  return role || "ORDER_CREATOR";
}

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
  const role = normalizeRole(parsed.data.role);

  const { data: existingMem } = await supabaseAdmin
    .from("account_users")
    .select("user_id")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingMem) {
    const { error } = await supabaseAdmin.from("account_users").insert({
      account_id: accountId,
      user_id: userId,
      role,
      virtual_warehouse_access: defaultVirtualWarehouseAccessForAccountRole(role),
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabaseAdmin
      .from("account_users")
      .update({ role })
      .eq("account_id", accountId)
      .eq("user_id", userId);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: actorUserId,
      action: "ACCOUNT_USER_ADDED",
      metadata: { account_id: accountId, added_user_id: userId, role },
    });
  } catch {
    // ignore if audit table not present
  }

  return NextResponse.json({ ok: true });
}
