import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const Schema = z.object({
  is_admin: z.union([z.literal("on"), z.literal("true"), z.literal("false")]).optional(),
  is_staff: z.union([z.literal("on"), z.literal("true"), z.literal("false")]).optional(),
  is_internal_sales_rep: z.union([z.literal("on"), z.literal("true"), z.literal("false")]).optional(),
});

function toBool(v: unknown): boolean {
  return v === "on" || v === "true" || v === true;
}

export async function POST(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  const admin = await requireAdmin();
  const actorUserId = (admin as any)?.user?.id || null;

  const { userId } = await ctx.params;

  const contentType = req.headers.get("content-type") || "";
  let raw: any = {};

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    raw = Object.fromEntries(fd.entries());
  } else {
    raw = await req.json().catch(() => ({}));
  }

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const wantAdmin = toBool(parsed.data.is_admin);
  const wantStaff = toBool(parsed.data.is_staff);
  const wantSalesRep = toBool(parsed.data.is_internal_sales_rep);

  // Load the target user's email so user_profiles upsert can't violate NOT NULL constraints
  const { data: userRes, error: userErr } = await (supabaseAdmin as any).auth.admin.getUserById(userId);

  if (userErr || !userRes?.user) {
    return NextResponse.json(
      { ok: false, error: userErr?.message || "Failed to load user" },
      { status: 404 }
    );
  }

  const targetEmail = (userRes.user.email || "").toLowerCase().trim();
  if (!targetEmail) {
    return NextResponse.json(
      { ok: false, error: "Target user has no email; cannot update user_profiles" },
      { status: 400 }
    );
  }

  // 1) Internal admin toggle (internal_users)
  if (wantAdmin) {
    const { error } = await supabaseAdmin
      .from("internal_users")
      .upsert({ user_id: userId, role: "ADMIN" }, { onConflict: "user_id" });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin.from("internal_users").delete().eq("user_id", userId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // 2) Staff + internal sales rep (user_profiles)
  // IMPORTANT: include email to satisfy your NOT NULL constraint
  const { error: profileErr } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        email: targetEmail,
        is_staff: wantStaff,
        is_internal_sales_rep: wantSalesRep,
      },
      { onConflict: "user_id" }
    );

  if (profileErr) {
    return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });
  }

  // 3) Best-effort audit
  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: actorUserId,
      action: "USER_ROLES_UPDATED",
      metadata: {
        target_user_id: userId,
        is_admin: wantAdmin,
        is_staff: wantStaff,
        is_internal_sales_rep: wantSalesRep,
      },
    });
  } catch {
    // ignore
  }

  return NextResponse.redirect(urlFromRequest(req, `/admin/users/${userId}`), { status: 303 });
}
