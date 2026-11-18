// src/app/api/admin/ivr/[ivrId]/route.ts
import { NextResponse } from "next/server";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set(["NEW", "IN_REVIEW", "SUBMITTED", "COMPLETED", "DENIED"]);

type PatchBody = { status?: string; notes?: string | null };

function ms(s?: string | null): number {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

function isoOrNull(s?: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function GET(_req: Request, ctx: { params: Promise<{ ivrId: string }> }) {
  const { ivrId } = await ctx.params;

  if (!ivrId || ivrId === "undefined") {
    return NextResponse.json({ ok: false, error: "Missing ivrId" }, { status: 400 });
  }

  const auth = await requireIvrTeamOrAdmin();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const supabaseAdmin: any = createSupabaseAdminClient();

  const { data: ivr, error: ivrErr } = await supabaseAdmin
    .from("ivr_requests")
    .select("*")
    .eq("id", ivrId)
    .maybeSingle();

  if (ivrErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  if (!ivr) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { data: files, error: filesErr } = await supabaseAdmin
    .from("ivr_files")
    .select("*")
    .eq("ivr_request_id", ivrId)
    .order("created_at", { ascending: false });

  if (filesErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });

  // Pull a bit more audit so we can compute viewed/unread robustly
  const { data: audit, error: auditErr } = await supabaseAdmin
    .from("ivr_audit_log")
    .select("*")
    .eq("ivr_request_id", ivrId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (auditErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });

  // ----- Additional-info derived state
  const requestedAt = isoOrNull(ivr.additional_info_requested_at ?? null);
  const submittedAt = isoOrNull(ivr.additional_info_submitted_at ?? null);

  const reqMs = ms(requestedAt);
  const subMs = ms(submittedAt);

  const needsAdditionalInfo = Boolean(reqMs) && (!subMs || subMs < reqMs);
  const customerResponded = Boolean(reqMs && subMs && subMs >= reqMs);

  // Latest "viewed" time (from audit)
  const latestViewedRow = (audit ?? []).find((a: any) => a.action === "ADDITIONAL_INFO_VIEWED") || null;
  const latestViewedAt = isoOrNull(latestViewedRow?.created_at ?? null);
  const viewMs = ms(latestViewedAt);

  // Response is "unread" if customer responded after the last time the team viewed it.
  const responseUnread = Boolean(customerResponded && subMs && (!viewMs || viewMs < subMs));

  return NextResponse.json({
    ok: true,
    ivr,
    files: files ?? [],
    audit: audit ?? [],
    additional_info: {
      latest_info_requested_at: requestedAt,
      latest_info_provided_at: submittedAt,
      latest_viewed_at: latestViewedAt,
      needs_additional_info: needsAdditionalInfo,
      customer_responded: customerResponded,
      response_unread: responseUnread,
    },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ ivrId: string }> }) {
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

  const body = (await req.json().catch(() => null)) as PatchBody | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const next: Record<string, any> = {};
  const changes: any[] = [];

  if (typeof body.status === "string") {
    const s = body.status.trim().toUpperCase();
    if (!ALLOWED_STATUSES.has(s)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }
    next.status = s;
  }

  if (body.notes === null || typeof body.notes === "string") {
    next.notes = body.notes === null ? null : body.notes.slice(0, 5000);
  }

  if (Object.keys(next).length === 0) {
    return NextResponse.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
  }

  const { data: current, error: curErr } = await supabaseAdmin
    .from("ivr_requests")
    .select("id,status,notes")
    .eq("id", ivrId)
    .maybeSingle();

  if (curErr) return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  if (!current) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (next.status && next.status !== current.status) {
    changes.push({ field: "status", from: current.status, to: next.status });
  }
  if ("notes" in next && next.notes !== current.notes) {
    changes.push({
      field: "notes",
      from_len: (current.notes ?? "").length,
      to_len: (next.notes ?? "").length,
    });
  }

  const { data: updated, error: upErr } = await supabaseAdmin
    .from("ivr_requests")
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq("id", ivrId)
    .select("*")
    .maybeSingle();

  if (upErr) return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const userAgent = req.headers.get("user-agent");

  await supabaseAdmin.from("ivr_audit_log").insert({
    ivr_request_id: ivrId,
    actor_user_id: actorUserId,
    action:
      next.status && "notes" in next
        ? "STATUS_AND_NOTES_UPDATE"
        : next.status
          ? "STATUS_CHANGE"
          : "NOTES_UPDATE",
    meta: { changes },
    ip,
    user_agent: userAgent,
  });

  return NextResponse.json({ ok: true, ivr: updated });
}
