import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { runPrepareTacticalAiAssist } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssist";
import type { PrepareTacticalAiAssistActionId } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistActions";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { loadPrepareForMeetingViewForActor } from "@/lib/surgical-sales/engagements/loadPrepareForMeetingView";
import {
  reconcileTacticalAsksWithProbes,
  serializePrepareTacticalAsks,
} from "@/lib/surgical-sales/engagements/prepareTacticalAsks";
import { updateEngagementPatch } from "@/lib/surgical-sales/engagements/engagementPatchPersistence";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BodySchema = z
  .object({
    action: z.enum([
      "regenerate_goal",
      "tighten_asks",
      "add_surgical_workflow_question",
      "add_access_question",
      "simplify_intro_call",
    ]),
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

  let action: PrepareTacticalAiAssistActionId;
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
    }
    action = parsed.data.action;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const engagement = await loadEngagementForPortalActor(engagementId, uid, { includeArchived: true });
  if (!engagement) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const result = await runPrepareTacticalAiAssist({ engagementId, userId: uid, action });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
  }

  const patch: Record<string, unknown> = { ...result.patch };
  if ("pre_observation_probes" in patch) {
    const loaded = await loadPrepareForMeetingViewForActor(engagementId, uid);
    if (loaded.ok) {
      const reconciled = reconcileTacticalAsksWithProbes(
        loaded.prepare.tactical_asks,
        String(patch.pre_observation_probes ?? "") || null,
      );
      patch.prepare_tactical_asks = serializePrepareTacticalAsks(reconciled);
    }
  }

  const saved = await updateEngagementPatch(engagementId, patch);
  if (!saved.ok) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    patch: result.patch,
    label: result.label,
    summary: result.summary,
    undo: result.undo,
    addedProbeLines: result.addedProbeLines,
  });
}
