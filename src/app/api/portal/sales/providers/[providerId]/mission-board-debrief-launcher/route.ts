import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import {
  loadMissionBoardDebriefLauncherView,
  runMissionBoardDebriefLauncherAction,
} from "@/lib/surgical-sales/missionBoardDebriefLauncherService";
import { applyMissionBoardDebriefDictation } from "@/lib/surgical-sales/missionBoardDebriefDictationService";
import { completeMissionBoardProviderDebrief, logMissionBoardDebriefPathwayOutcome } from "@/lib/surgical-sales/missionBoardDebriefCompleteService";
import { advancePathwayFromCompletedDebrief } from "@/lib/surgical-sales/engagements/advancePathwayFromCompletedDebrief";
import {
  MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_IDS,
  MISSION_BOARD_DEBRIEF_OPPORTUNITY_RESULTS,
  isMissionBoardDebriefCompleteEvaluationPath,
} from "@/lib/surgical-sales/missionBoardDebriefComplete";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LaunchActionSchema = z
  .object({
    action: z.enum(["start", "prepare"]),
  })
  .strict();

const CompleteActionSchema = z
  .object({
    action: z.literal("complete"),
    engagement_id: z.string().uuid(),
    outcome_id: z.enum(MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_IDS),
    opportunity_result: z.enum(MISSION_BOARD_DEBRIEF_OPPORTUNITY_RESULTS),
    evaluation_path: z.string().optional(),
    dictation: z.string().max(8000),
    next_step: z.string().max(500).optional(),
  })
  .strict();

const DictationActionSchema = z
  .object({
    action: z.literal("dictation"),
    engagement_id: z.string().uuid(),
    narrative: z.string().min(8).max(8000),
  })
  .strict();

const LogPathwayOutcomeSchema = z
  .object({
    action: z.literal("log_pathway_outcome"),
    outcome_id: z.enum(MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_IDS),
    opportunity_result: z.enum(MISSION_BOARD_DEBRIEF_OPPORTUNITY_RESULTS),
    evaluation_path: z.string().optional(),
    dictation: z.string().max(8000),
    next_step: z.string().max(500).optional(),
  })
  .strict();

const AdvancePathwaySchema = z
  .object({
    action: z.literal("advance_pathway"),
    evaluation_path: z.string().optional(),
    notes: z.string().max(8000).optional(),
  })
  .strict();

const PostBodySchema = z.union([
  LaunchActionSchema,
  CompleteActionSchema,
  DictationActionSchema,
  LogPathwayOutcomeSchema,
  AdvancePathwaySchema,
]);

export async function GET(_req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const result = await loadMissionBoardDebriefLauncherView({ providerId, userId: uid });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true, view: result.view });
}

export async function POST(req: Request, ctx: { params: Promise<{ providerId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { providerId } = await ctx.params;
  if (!UUID_RE.test(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  let body: z.infer<typeof PostBodySchema>;
  try {
    const parsed = PostBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "dictation") {
    const result = await applyMissionBoardDebriefDictation({
      providerId,
      userId: uid,
      engagementId: body.engagement_id,
      narrative: body.narrative,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      engagementId: result.engagementId,
      report: result.report,
      mappingSource: result.mappingSource,
      fieldsApplied: result.fieldsApplied,
    });
  }

  if (body.action === "advance_pathway") {
    const evaluationPathRaw = String(body.evaluation_path ?? "").trim();
    const evaluationPath =
      evaluationPathRaw && isMissionBoardDebriefCompleteEvaluationPath(evaluationPathRaw)
        ? evaluationPathRaw
        : null;

    const result = await advancePathwayFromCompletedDebrief({
      providerId,
      userId: uid,
      evaluationPath,
      notes: body.notes ?? null,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      advancedToEvaluation: result.advancedToEvaluation,
      evaluationPath: result.evaluationPath,
    });
  }

  if (body.action === "log_pathway_outcome") {
    const evaluationPathRaw = String(body.evaluation_path ?? "").trim();
    const evaluationPath =
      evaluationPathRaw && isMissionBoardDebriefCompleteEvaluationPath(evaluationPathRaw)
        ? evaluationPathRaw
        : null;

    const result = await logMissionBoardDebriefPathwayOutcome({
      providerId,
      userId: uid,
      outcomeId: body.outcome_id,
      opportunityResult: body.opportunity_result,
      evaluationPath,
      dictation: body.dictation,
      nextStep: body.next_step ?? null,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      engagementId: result.engagementId,
      advancedToEvaluation: result.advancedToEvaluation,
    });
  }

  if (body.action === "complete") {
    const evaluationPathRaw = String(body.evaluation_path ?? "").trim();
    const evaluationPath =
      evaluationPathRaw && isMissionBoardDebriefCompleteEvaluationPath(evaluationPathRaw)
        ? evaluationPathRaw
        : null;

    const result = await completeMissionBoardProviderDebrief({
      providerId,
      userId: uid,
      engagementId: body.engagement_id,
      outcomeId: body.outcome_id,
      opportunityResult: body.opportunity_result,
      evaluationPath,
      dictation: body.dictation,
      nextStep: body.next_step ?? null,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      engagementId: result.engagementId,
      advancedToEvaluation: result.advancedToEvaluation,
    });
  }

  const result = await runMissionBoardDebriefLauncherAction({
    providerId,
    userId: uid,
    action: body.action,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    engagementId: result.engagementId,
    href: result.href,
    created: result.created,
  });
}
