import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { US_STATE_CODES } from "@/lib/admin/usStateTiles";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ALLOWED_STATE_CODES = new Set(US_STATE_CODES);

const Schema = z.object({
  userId: z.string().uuid(),
  stateCodes: z.array(z.string().trim().toUpperCase()).max(60),
});

export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { userId } = parsed.data;
  const stateCodes = [...new Set(parsed.data.stateCodes)].filter((code) => ALLOWED_STATE_CODES.has(code)).sort();

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, is_internal_sales_rep")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });
  }
  if (!profile?.is_internal_sales_rep) {
    return NextResponse.json({ ok: false, error: "State coverage can only be assigned to sales reps" }, { status: 400 });
  }

  const { error: deleteErr } = await supabaseAdmin.from("sales_rep_state_coverage").delete().eq("user_id", userId);
  if (deleteErr) {
    return NextResponse.json({ ok: false, error: deleteErr.message }, { status: 500 });
  }

  if (stateCodes.length) {
    const { error: insertErr } = await supabaseAdmin.from("sales_rep_state_coverage").insert(
      stateCodes.map((state_code) => ({ user_id: userId, state_code })),
    );
    if (insertErr) {
      return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
    }
  }

  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: auth.ctx.userId,
      action: "SALES_REP_STATE_COVERAGE_UPDATED",
      metadata: { target_user_id: userId, state_codes: stateCodes, source: "admin_setup" },
    });
  } catch {
    // best-effort audit
  }

  return NextResponse.json({ ok: true, stateCodes });
}
