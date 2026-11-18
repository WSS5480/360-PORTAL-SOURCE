import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { enrichTimeOffRequests, type TimeOffRequestRow } from "@/lib/sales/timeOffRequests";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "all";
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));

  let q = supabaseAdmin
    .from("sales_rep_time_off_requests")
    .select(
      "id, requester_user_id, request_type, start_date, end_date, notes, status, reviewed_by, reviewed_at, review_comment, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    q = q.eq("status", status);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const requests = await enrichTimeOffRequests((data || []) as TimeOffRequestRow[]);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return NextResponse.json({ ok: true, requests, pending_count: pendingCount });
}
