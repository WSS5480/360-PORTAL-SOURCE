import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { fetchAdminTeamDashboardData } from "@/lib/surgical-sales/admin/fetchAdminTeamDashboardData";
import { resolveAdminTeamDashboardPeriodKey } from "@/lib/surgical-sales/admin/adminTeamDashboardPeriod";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const period = resolveAdminTeamDashboardPeriodKey(url.searchParams.get("period"));

  try {
    const dashboard = await fetchAdminTeamDashboardData({ period });
    return NextResponse.json({ ok: true, dashboard });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load team dashboard";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
