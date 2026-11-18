import { NextResponse } from "next/server";
import { runSurgicalCaseStuckWorkflowNotifications, runSurgicalCaseUpcomingNotifications } from "@/lib/surgical-sales/caseNotifications";

export const dynamic = "force-dynamic";

/**
 * Schedule via hosting cron (e.g. hourly). Set SURGICAL_CASE_NOTIFICATIONS_CRON_SECRET and send:
 *   Authorization: Bearer <secret>
 */
export async function GET(req: Request) {
  const secret = process.env.SURGICAL_CASE_NOTIFICATIONS_CRON_SECRET?.trim();
  const auth = req.headers.get("authorization")?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const upcoming = await runSurgicalCaseUpcomingNotifications();
  const stuck = await runSurgicalCaseStuckWorkflowNotifications();

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    upcoming_created: upcoming,
    stuck_created: stuck,
  });
}
