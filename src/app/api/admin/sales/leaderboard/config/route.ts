import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import {
  fetchAdminLeaderboardConfigPayload,
  saveAdminLeaderboardConfig,
  validateLeaderboardConfigUpdate,
} from "@/lib/surgical-sales/leaderboardConfigDb";
import type { LeaderboardCatalogMetricKey } from "@/lib/surgical-sales/leaderboardMetricCatalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const payload = await fetchAdminLeaderboardConfigPayload();
    return NextResponse.json({ ok: true, ...payload });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load leaderboard config" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const raw = await req.json().catch(() => null);
  const validated = validateLeaderboardConfigUpdate(raw);
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
  }

  try {
    const payload = await saveAdminLeaderboardConfig({
      adminUserId: auth.ctx.userId,
      enabledMetrics: validated.value.enabledMetrics as LeaderboardCatalogMetricKey[],
      metricPoints: validated.value.metricPoints,
      categoryWeights: validated.value.categoryWeights,
    });
    return NextResponse.json({ ok: true, ...payload });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to save leaderboard config" },
      { status: 500 },
    );
  }
}
