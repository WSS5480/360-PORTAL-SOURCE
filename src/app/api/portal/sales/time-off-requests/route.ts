import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import {
  enrichTimeOffRequests,
  notifyAdminsOfTimeOffRequest,
  TIME_OFF_REQUEST_TYPES,
  type TimeOffRequestRow,
} from "@/lib/sales/timeOffRequests";

export const dynamic = "force-dynamic";

const PostSchema = z.object({
  request_type: z.enum([TIME_OFF_REQUEST_TYPES.PTO, TIME_OFF_REQUEST_TYPES.SICK, TIME_OFF_REQUEST_TYPES.PERSONAL]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("sales_rep_time_off_requests")
    .select(
      "id, requester_user_id, request_type, start_date, end_date, notes, status, reviewed_by, reviewed_at, review_comment, created_at, updated_at",
    )
    .eq("requester_user_id", uid)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const requests = await enrichTimeOffRequests((data || []) as TimeOffRequestRow[]);
  return NextResponse.json({ ok: true, requests });
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { request_type, start_date, end_date, notes } = parsed.data;
  if (end_date < start_date) {
    return NextResponse.json({ ok: false, error: "End date must be on or after start date." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: inserted, error } = await supabaseAdmin
    .from("sales_rep_time_off_requests")
    .insert({
      requester_user_id: uid,
      request_type,
      start_date,
      end_date,
      notes: notes?.trim() || null,
      status: "pending",
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const requestId = String((inserted as { id: string }).id);
  try {
    await notifyAdminsOfTimeOffRequest({
      requestId,
      requesterUserId: uid,
      requestType: request_type,
      startDate: start_date,
      endDate: end_date,
      notes,
    });
  } catch (e) {
    console.error("[time-off] admin notification failed", e);
  }

  return NextResponse.json({ ok: true, id: requestId });
}
