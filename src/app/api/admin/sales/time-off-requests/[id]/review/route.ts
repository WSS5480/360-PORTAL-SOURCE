import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { TIME_OFF_STATUS_LABELS, TIME_OFF_TYPE_LABELS, type TimeOffRequestType } from "@/lib/sales/timeOffRequests";

export const dynamic = "force-dynamic";

const ReviewSchema = z.object({
  decision: z.enum(["approved", "denied"]),
  review_comment: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { decision, review_comment } = parsed.data;

  const { data: row, error: loadErr } = await supabaseAdmin
    .from("sales_rep_time_off_requests")
    .select("id, requester_user_id, request_type, start_date, end_date, status")
    .eq("id", id)
    .maybeSingle();

  if (loadErr) {
    return NextResponse.json({ ok: false, error: loadErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const currentStatus = String((row as { status: string }).status);
  if (currentStatus !== "pending") {
    return NextResponse.json({ ok: false, error: "This request has already been reviewed." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("sales_rep_time_off_requests")
    .update({
      status: decision,
      reviewed_by: auth.ctx.userId,
      reviewed_at: now,
      review_comment: review_comment?.trim() || null,
      updated_at: now,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await supabaseAdmin
    .from("admin_internal_notifications")
    .update({ read_at: now })
    .eq("dedupe_key", `time_off_request:${id}`)
    .is("read_at", null);

  const requestType = String((row as { request_type: string }).request_type) as TimeOffRequestType;
  const start = String((row as { start_date: string }).start_date).slice(0, 10);
  const end = String((row as { end_date: string }).end_date).slice(0, 10);
  const range = start === end ? start : `${start} – ${end}`;
  const decisionLabel = TIME_OFF_STATUS_LABELS[decision];
  const typeLabel = TIME_OFF_TYPE_LABELS[requestType];

  await supabaseAdmin.from("admin_internal_notifications").insert({
    notification_type: "time_off_decision",
    title: `Time off ${decisionLabel.toLowerCase()}`,
    body: `${typeLabel} · ${range}${review_comment?.trim() ? `\n${review_comment.trim()}` : ""}`,
    metadata_json: { request_id: id, decision },
    dedupe_key: `time_off_decision:${id}:${decision}`,
    read_at: now,
  });

  return NextResponse.json({ ok: true, status: decision });
}
