import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { loadAiDebriefStrategyBuilderContext } from "@/lib/surgical-sales/engagements/loadAiDebriefStrategyBuilderContext";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ engagementId: string }> },
) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { engagementId } = await ctx.params;
  if (!UUID_RE.test(engagementId)) {
    return NextResponse.json({ ok: false, error: "Invalid engagement id" }, { status: 400 });
  }

  const engagement = await loadEngagementForPortalActor(engagementId, uid, {
    includeArchived: true,
  });
  if (!engagement) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  try {
    const loaded = await loadAiDebriefStrategyBuilderContext({
      supabase,
      engagement,
      engagementId,
      userId: uid,
    });

    if (!loaded.ok) {
      return NextResponse.json({ ok: false, error: loaded.message }, { status: loaded.status });
    }

    const { intelligenceAggregator, intelligenceAudit } = loaded.context;

    return NextResponse.json({
      ok: true,
      engagement_id: engagementId,
      provider_id: loaded.context.plan.context.providerId,
      aggregator: intelligenceAggregator,
      audit: intelligenceAudit,
      strategy_engine_exposure: intelligenceAudit.strategyEngineExposure,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[debrief/intelligence-audit] failed", error);
    return NextResponse.json(
      { ok: false, error: "Failed to build debrief intelligence audit" },
      { status: 500 },
    );
  }
}
