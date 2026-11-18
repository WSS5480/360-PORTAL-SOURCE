import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import {
  parseDebriefIntelligenceSnapshot,
  type DebriefIntelligenceSnapshotV1,
} from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import { loadUniversalFactsByCaptureId } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import { isUniversalExtractionReviewPrimaryEnabled } from "@/lib/surgical-sales/universalExtractor/universalExtractorReviewFlag";

export const dynamic = "force-dynamic";

async function hydrateSnapshotUniversalFacts(
  snapshot: DebriefIntelligenceSnapshotV1,
): Promise<DebriefIntelligenceSnapshotV1> {
  if (!isUniversalExtractionReviewPrimaryEnabled()) return snapshot;

  const captureId = snapshot.universalFactCaptureId?.trim();
  if (!captureId || !snapshot.logUpdate) return snapshot;

  const run = await loadUniversalFactsByCaptureId(captureId);
  if (!run) return snapshot;

  const logUpdate = { ...snapshot.logUpdate, debriefUniversalFactsRuns: [run] };
  const analysis = snapshot.analysis?.log_update
    ? {
        ...snapshot.analysis,
        log_update: { ...snapshot.analysis.log_update, debriefUniversalFactsRuns: [run] },
      }
    : snapshot.analysis;

  return { ...snapshot, logUpdate, analysis };
}

export async function GET(_req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const rep = await userIsInternalSalesRep(auth.user.id);
  if (!rep) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { engagementId } = await ctx.params;
  const engagement = await loadEngagementForPortalActor(engagementId, auth.user.id);
  if (!engagement) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const parsed = parseDebriefIntelligenceSnapshot(engagement.debrief_intelligence_snapshot);
  const snapshot = parsed ? await hydrateSnapshotUniversalFacts(parsed) : null;

  return NextResponse.json({
    ok: true,
    snapshot,
    debrief_completed: Boolean(engagement.debrief_completed),
  });
}
