import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { fetchExecutionLeaderboard } from "@/lib/surgical-sales/fetchExecutionLeaderboardData";
import { resolveLeaderboardPeriodKey } from "@/lib/surgical-sales/leaderboardPeriod";
import { resolveLeaderboardTeamFilter } from "@/lib/surgical-sales/leaderboardTeamFilters";
import { bestCategoryLabel } from "@/lib/surgical-sales/leaderboardPresentation";
import {
  buildLeaderboardPortalScoringPayload,
  enrichLeaderboardPortalRow,
} from "@/lib/surgical-sales/leaderboardPortalEnrichment";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const periodKey = resolveLeaderboardPeriodKey(url.searchParams.get("period"));
  const teamFilter = resolveLeaderboardTeamFilter(
    url.searchParams.get("team"),
    url.searchParams.get("team_value"),
  );

  try {
    const result = await fetchExecutionLeaderboard({
      now: new Date(),
      period: periodKey,
      customStart: url.searchParams.get("start"),
      customEnd: url.searchParams.get("end"),
      teamFilter,
      selfUserId: uid,
    });

    const fieldCommander = result.boards?.find((b) => b.id === "field_commander");
    const scoringPayload = buildLeaderboardPortalScoringPayload(result.config);

    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      period: result.period_label,
      period_key: periodKey,
      period_start: result.period_start,
      period_end: result.period_end,
      prior_period: result.prior_period_label,
      prior_period_start: result.prior_period_start,
      prior_period_end: result.prior_period_end,
      team_filter: teamFilter,
      filter_options: result.filter_options,
      ...scoringPayload,
      boards: result.boards,
      rows: result.reps.map((r) =>
        enrichLeaderboardPortalRow({
          rank: r.rank,
          user_id: r.user_id,
          name: r.display_name,
          leaderboard_score: r.leaderboard_score,
          category_scores: r.category_scores,
          metrics: r.metrics,
          best_category: bestCategoryLabel(r.category_scores),
          achievement_badges: result.achievement_badges_by_rep?.[r.user_id] ?? [],
          config: result.config,
        }),
      ),
      self_user_id: result.self_user_id,
      self_rank: fieldCommander?.self_rank ?? result.self_rank,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed to load leaderboard" }, { status: 500 });
  }
}
