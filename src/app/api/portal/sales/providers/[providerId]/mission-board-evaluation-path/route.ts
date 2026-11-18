import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { SALES_PATHWAY_EVALUATION_ACTIVITIES } from "@/lib/surgical-sales/salesPathwayCanonical";
import { loadMissionBoardEvaluationPathView } from "@/lib/surgical-sales/missionBoardEvaluationPathService";
import { saveMissionBoardEvaluationPath } from "@/lib/surgical-sales/missionBoardEvaluationPathSave";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PostBodySchema = z
  .object({
    evaluation_path: z.enum(SALES_PATHWAY_EVALUATION_ACTIVITIES),
    target_date: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional(),
    ),
    notes: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      z.union([z.string().max(2000), z.null()]).optional(),
    ),
  })
  .strict();

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

  try {
    const result = await loadMissionBoardEvaluationPathView({ providerId, userId: uid });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
    }

    return NextResponse.json({ ok: true, view: result.data });
  } catch (e) {
    console.error("[mission-board-evaluation-path GET]", e);
    return NextResponse.json(
      { ok: false, error: "Failed to load evaluation path." },
      { status: 500 },
    );
  }
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
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { ok: false, error: issue?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await saveMissionBoardEvaluationPath({
      providerId,
      userId: uid,
      evaluationPath: body.evaluation_path,
      targetDate: body.target_date,
      notes: body.notes,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      evaluation_path: result.data.evaluationPath,
      engagement_synced: result.data.engagementSynced,
      engagement_sync_warning: result.data.engagementSyncWarning,
    });
  } catch (e) {
    console.error("[mission-board-evaluation-path POST]", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to save evaluation path.",
      },
      { status: 500 },
    );
  }
}
