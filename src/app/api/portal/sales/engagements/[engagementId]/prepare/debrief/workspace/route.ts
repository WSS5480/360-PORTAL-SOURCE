import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { resolveDebriefPrepareWorkspaceForEngagement } from "@/lib/surgical-sales/engagements/resolveDebriefPrepareWorkspace";
import {
  DEBRIEF_PREPARE_DESIRED_OUTCOMES,
  mergeDebriefPrepareWorkspaceSnapshot,
  type DebriefPrepareDesiredOutcome,
  type DebriefPrepareLearnItem,
  type DebriefPrepareQuestionCard,
} from "@/lib/surgical-sales/engagements/debriefPrepareWorkspace";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DESIRED_OUTCOME_VALUES = DEBRIEF_PREPARE_DESIRED_OUTCOMES.map((item) => item.id) as [
  DebriefPrepareDesiredOutcome,
  ...DebriefPrepareDesiredOutcome[],
];

const LearnItemSchema = z
  .object({
    id: z.string().min(1).max(80),
    text: z.string().min(1).max(400),
    checked: z.boolean(),
  })
  .strict();

const QuestionCardSchema = z
  .object({
    id: z.string().min(1).max(80),
    text: z.string().min(1).max(600),
    used: z.boolean(),
  })
  .strict();

const PutBodySchema = z
  .object({
    meetingObjective: z.string().max(600).optional(),
    hypothesis: z.string().max(4000).optional(),
    learnItems: z.array(LearnItemSchema).max(12).optional(),
    questionCards: z.array(QuestionCardSchema).max(12).optional(),
    desiredOutcome: z.enum(DESIRED_OUTCOME_VALUES).nullable().optional(),
    desiredOutcomeOther: z.string().max(400).optional(),
    meetingNotes: z.string().max(8000).optional(),
  })
  .strict();

export async function GET(_req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
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

  const engagement = await loadEngagementForPortalActor(engagementId, uid, { includeArchived: true });
  if (!engagement) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  try {
    const result = await resolveDebriefPrepareWorkspaceForEngagement({
      engagement,
      engagementId,
      userId: uid,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      workspace: result.workspace,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[debrief/workspace] GET failed", error);
    return NextResponse.json({ ok: false, error: "Failed to load prepare workspace" }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
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

  let body: z.infer<typeof PutBodySchema>;
  try {
    const raw = await req.json();
    const parsed = PutBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const engagement = await loadEngagementForPortalActor(engagementId, uid, { includeArchived: true });
  if (!engagement) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const learnItems: DebriefPrepareLearnItem[] | undefined = body.learnItems?.map((item) => ({
    id: item.id.trim(),
    text: item.text.trim(),
    checked: item.checked,
  }));

  const questionCards: DebriefPrepareQuestionCard[] | undefined = body.questionCards?.map((item) => ({
    id: item.id.trim(),
    text: item.text.trim(),
    used: item.used,
  }));

  const snapshot = mergeDebriefPrepareWorkspaceSnapshot(engagement.debrief_intelligence_snapshot, {
    ...(body.meetingObjective !== undefined
      ? { meetingObjective: body.meetingObjective.trim() }
      : {}),
    ...(body.hypothesis !== undefined ? { hypothesis: body.hypothesis.trim() } : {}),
    ...(learnItems !== undefined ? { learnItems } : {}),
    ...(questionCards !== undefined ? { questionCards } : {}),
    ...(body.desiredOutcome !== undefined ? { desiredOutcome: body.desiredOutcome } : {}),
    ...(body.desiredOutcomeOther !== undefined
      ? { desiredOutcomeOther: body.desiredOutcomeOther.trim() }
      : {}),
    ...(body.meetingNotes !== undefined ? { meetingNotes: body.meetingNotes.trim() } : {}),
    updatedAt: new Date().toISOString(),
  });

  const { error: upErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({ debrief_intelligence_snapshot: snapshot })
    .eq("id", engagementId);

  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  const refreshed = await loadEngagementForPortalActor(engagementId, uid, { includeArchived: true });
  if (!refreshed) {
    return NextResponse.json({ ok: true, saved: true });
  }

  const result = await resolveDebriefPrepareWorkspaceForEngagement({
    engagement: refreshed,
    engagementId,
    userId: uid,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: true, saved: true });
  }

  return NextResponse.json({
    ok: true,
    saved: true,
    workspace: result.workspace,
  });
}
