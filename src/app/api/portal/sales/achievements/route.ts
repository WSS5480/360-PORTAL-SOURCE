import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { fetchRepAchievementSummary } from "@/lib/surgical-sales/fetchExecutionLeaderboardData";
import { resolveLeaderboardPeriodKey } from "@/lib/surgical-sales/leaderboardPeriod";

export const dynamic = "force-dynamic";

/** Signed-in rep achievement badges for profile summaries (dashboard, sidebar). */
export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const periodKey = resolveLeaderboardPeriodKey(url.searchParams.get("period"));

  try {
    const summary = await fetchRepAchievementSummary({ userId: uid, period: periodKey });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed to load achievements" }, { status: 500 });
  }
}
