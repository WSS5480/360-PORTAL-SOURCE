import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { endEngagementCallForActor } from "@/lib/surgical-sales/engagements/endEngagementCall";
import { introCallDebriefFirstEndAllowed } from "@/lib/surgical-sales/engagements/introCallDebriefFirstCompletion";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const OUTCOME_IDS = [
  "observation_approved",
  "follow_up_needed",
  "observation_denied",
  "no_meaningful_update",
  "touch_success",
  "touch_follow_up",
  "touch_no_progress",
] as const;

const EndEngagementBodySchema = z
  .object({
    outcome_id: z.enum(OUTCOME_IDS).optional(),
    live_notes: z.string().max(4000).optional(),
  })
  .strict();

export async function POST(req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
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

  const raw = await req.json().catch(() => null);
  const parsed = EndEngagementBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid end engagement request." }, { status: 400 });
  }

  const engagement = await loadEngagementForPortalActor(engagementId, uid, { includeArchived: true });
  if (!engagement) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const engagementType = String(engagement.engagement_type ?? "");
  const outcomeId = parsed.data.outcome_id;
  if (
    !outcomeId &&
    !introCallDebriefFirstEndAllowed({ engagementType, outcomeId: null })
  ) {
    return NextResponse.json(
      { ok: false, error: "Select an outcome before ending the engagement." },
      { status: 400 },
    );
  }

  const result = await endEngagementCallForActor({
    engagementId,
    userId: uid,
    outcomeId,
    liveNotes: parsed.data.live_notes,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, debrief_href: result.debrief_href });
}
