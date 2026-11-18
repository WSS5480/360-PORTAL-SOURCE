import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import {
  loadActorDisplayName,
  recordStartMissionOutcomeForActor,
  saveStartMissionNotesForActor,
} from "@/lib/surgical-sales/engagements/recordStartMissionOutcome";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PatchLiveSchema = z
  .object({
    live_notes: z.string().max(4000).optional(),
    outcome_id: z
      .enum([
        "observation_approved",
        "follow_up_needed",
        "observation_denied",
        "no_meaningful_update",
        "touch_success",
        "touch_follow_up",
        "touch_no_progress",
      ])
      .optional(),
  })
  .strict();

export async function PATCH(req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
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
  const parsed = PatchLiveSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.outcome_id) {
    const actorName = await loadActorDisplayName(uid);
    const result = await recordStartMissionOutcomeForActor({
      engagementId,
      userId: uid,
      actorName,
      outcomeId: parsed.data.outcome_id,
      liveNotes: parsed.data.live_notes,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, live: result.live });
  }

  if (parsed.data.live_notes !== undefined) {
    const result = await saveStartMissionNotesForActor({
      engagementId,
      userId: uid,
      liveNotes: parsed.data.live_notes,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, live_notes: result.live_notes });
  }

  return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
}
