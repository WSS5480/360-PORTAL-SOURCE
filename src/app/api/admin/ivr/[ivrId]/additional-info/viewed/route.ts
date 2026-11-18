// src/app/api/admin/ivr/[ivrId]/additional-info/viewed/route.ts
import { NextResponse } from "next/server";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ ivrId: string }> }) {
  const { ivrId } = await ctx.params;

  if (!ivrId || ivrId === "undefined") {
    return NextResponse.json({ ok: false, error: "Missing ivrId" }, { status: 400 });
  }

  const auth = await requireIvrTeamOrAdmin();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const actorUserId = (auth as any)?.user?.id || (auth as any)?.id || "";
  if (!actorUserId) {
    return NextResponse.json({ ok: false, error: "Missing actor user id" }, { status: 401 });
  }

  const supabaseAdmin: any = createSupabaseAdminClient();

  // Optional: accept a reason or source if you ever want it later
  const body = (await req.json().catch(() => null)) as { source?: string } | null;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const userAgent = req.headers.get("user-agent");

  const { error: insErr } = await supabaseAdmin.from("ivr_audit_log").insert({
    ivr_request_id: ivrId,
    actor_user_id: actorUserId,
    action: "ADDITIONAL_INFO_VIEWED",
    meta: { source: body?.source || "admin_detail" },
    ip,
    user_agent: userAgent,
  });

  if (insErr) {
    return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
