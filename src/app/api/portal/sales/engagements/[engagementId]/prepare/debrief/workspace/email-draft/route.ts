import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { getDebriefProductKnowledge } from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import {
  generateDebriefPrepareProviderEmailDraft,
  isDebriefPrepareEmailOutreachGoal,
} from "@/lib/surgical-sales/engagements/debriefPrepareProviderEmailDraft";
import { tryResolveDebriefProductKnowledgeId } from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import { resolveDebriefPrepareWorkspaceForEngagement } from "@/lib/surgical-sales/engagements/resolveDebriefPrepareWorkspace";
import {
  completedObservationCaseIds,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BodySchema = z
  .object({
    outreachGoal: z.enum(["sim360_experience", "product_trial", "inservice"]),
    targetProductId: z.string().min(1),
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

  if (!isDebriefPrepareEmailOutreachGoal(body.outreachGoal)) {
    return NextResponse.json({ ok: false, error: "Invalid outreach goal" }, { status: 400 });
  }

  const productId = tryResolveDebriefProductKnowledgeId(body.targetProductId);
  if (!productId) {
    return NextResponse.json({ ok: false, error: "Invalid product" }, { status: 400 });
  }

  const engagement = await loadEngagementForPortalActor(engagementId, uid, { includeArchived: true });
  if (!engagement) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const workspaceResult = await resolveDebriefPrepareWorkspaceForEngagement({
    engagement,
    engagementId,
    userId: uid,
  });

  if (!workspaceResult.ok) {
    return NextResponse.json({ ok: false, error: workspaceResult.message }, { status: workspaceResult.status });
  }

  const { loadAiDebriefStrategyBuilderContext } = await import(
    "@/lib/surgical-sales/engagements/loadAiDebriefStrategyBuilderContext"
  );

  const loaded = await loadAiDebriefStrategyBuilderContext({
    engagement,
    engagementId,
    userId: uid,
  });

  if (!loaded.ok) {
    return NextResponse.json({ ok: false, error: loaded.message }, { status: loaded.status });
  }

  const { context } = loaded;
  const { workspace } = workspaceResult;

  const completedCaseIds = context.observationIntelligence?.caseRow
    ? completedObservationCaseIds({
        caseRow: context.observationIntelligence.caseRow,
        priorCases: context.observationIntelligence.priorCases,
      })
    : [];

  const repName =
    String(auth.user.user_metadata?.full_name ?? "").trim() ||
    String(auth.user.user_metadata?.name ?? "").trim() ||
    null;

  const draft = await generateDebriefPrepareProviderEmailDraft({
    outreachGoal: body.outreachGoal,
    targetProduct: getDebriefProductKnowledge(productId),
    providerName: context.providerName,
    organizationName: context.organizationName,
    repName,
    completedObservationCount: context.completedObservationCount,
    meetingObjective: workspace.meetingObjective,
    whyItMatters: workspace.whyItMatters,
    hypothesis: workspace.hypothesis,
    knownFacts: workspace.knownFacts,
    learnItems: workspace.learnItems.map((item) => item.text),
    questionCards: workspace.questionCards.map((card) => card.text),
    meetingNotes: workspace.meetingNotes,
    observationNotes: context.observationNotes,
    observationCorpus: context.observationCorpus,
    universalFactsReadModel: context.universalFactsReadModel,
    completedCaseIds,
    competitorSummaries: context.commercialSynthesis.competitorUsage.map((item) => item.summary),
    productFitSignals: context.commercialSynthesis.productCandidates.map(
      (item) => `${item.productName} (${item.fitLevel ?? "unknown"} fit)`,
    ),
  });

  return NextResponse.json({
    ok: true,
    subject: draft.subject,
    body: draft.body,
    usedAi: draft.usedAi,
  });
}
