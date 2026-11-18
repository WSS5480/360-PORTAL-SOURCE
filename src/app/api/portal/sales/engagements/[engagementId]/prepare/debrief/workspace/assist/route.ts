import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { resolveDebriefPrepareWorkspaceForEngagement } from "@/lib/surgical-sales/engagements/resolveDebriefPrepareWorkspace";
import {
  buildConfirmObjectives,
  buildHypothesisDraft,
  buildMoreQuestions,
} from "@/lib/surgical-sales/engagements/debriefPreparePlanningAssist";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BodySchema = z
  .object({
    action: z.enum(["generate_hypothesis", "generate_more_confirm", "generate_more_questions"]),
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

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
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

  const result = await resolveDebriefPrepareWorkspaceForEngagement({
    engagement,
    engagementId,
    userId: uid,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
  }

  const { workspace } = result;
  const planningContext = {
    draft: workspace.draft,
    providerName: workspace.draft.providerName ?? null,
    procedureLabel: workspace.draft.procedureLabel ?? null,
    wedgeTopic: workspace.draft.wedgeTopic ?? null,
    incumbentProduct: workspace.draft.incumbentProduct ?? null,
  };

  if (body.action === "generate_hypothesis") {
    return NextResponse.json({
      ok: true,
      hypothesis: buildHypothesisDraft(planningContext),
    });
  }

  if (body.action === "generate_more_confirm") {
    return NextResponse.json({
      ok: true,
      items: buildConfirmObjectives({
        existing: workspace.learnItems.map((item) => item.text),
        count: 3,
      }),
    });
  }

  return NextResponse.json({
    ok: true,
    questions: buildMoreQuestions({
      draft: workspace.draft,
      existing: workspace.questionCards.map((card) => card.text),
      count: 3,
    }),
  });
}
