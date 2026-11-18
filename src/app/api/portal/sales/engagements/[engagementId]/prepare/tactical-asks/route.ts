import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { runPrepareTacticalAskMutation } from "@/lib/surgical-sales/engagements/runPrepareTacticalAskMutation";
import { updateEngagementPatch } from "@/lib/surgical-sales/engagements/engagementPatchPersistence";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DismissReasonSchema = z.enum([
  "not_relevant",
  "already_answered",
  "wrong_timing",
  "wrong_engagement_type",
]);

const StatusSchema = z.enum([
  "unanswered",
  "answered",
  "skipped",
  "not_relevant",
  "ask_later",
  "follow_up_task",
]);

const GenerateCategorySchema = z.enum([
  "workflow",
  "access",
  "product_evaluation",
  "economic_buyer",
]);

const BodySchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("update_status"),
      ask_id: z.string().min(1).max(80),
      status: StatusSchema,
      answer_summary: z.string().max(2000).optional().nullable(),
      dismiss_reason: DismissReasonSchema.optional().nullable(),
    })
    .strict(),
  z
    .object({
      op: z.literal("dismiss"),
      ask_id: z.string().min(1).max(80),
      reason: DismissReasonSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal("add_custom"),
      text: z.string().min(3).max(500),
      intelligence_category: z.string().max(80).optional().nullable(),
    })
    .strict(),
  z
    .object({
      op: z.literal("generate_more"),
      category: GenerateCategorySchema,
    })
    .strict(),
  z
    .object({
      op: z.literal("remove"),
      ask_id: z.string().min(1).max(80),
    })
    .strict(),
  z
    .object({
      op: z.literal("save_brief"),
      mission_goal: z.string().max(2000).optional().nullable(),
      questions: z
        .array(
          z
            .object({
              id: z.string().min(1).max(80).optional().nullable(),
              text: z.string().min(1).max(500),
            })
            .strict(),
        )
        .max(50),
    })
    .strict(),
]);

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

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const engagement = await loadEngagementForPortalActor(engagementId, uid, { includeArchived: true });
  if (!engagement) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const mutation =
    body.op === "update_status"
      ? {
          op: "update_status" as const,
          askId: body.ask_id,
          status: body.status,
          answerSummary: body.answer_summary,
          dismissReason: body.dismiss_reason,
        }
      : body.op === "dismiss"
        ? { op: "dismiss" as const, askId: body.ask_id, reason: body.reason }
        : body.op === "add_custom"
          ? {
              op: "add_custom" as const,
              text: body.text,
              intelligenceCategory: body.intelligence_category,
            }
          : body.op === "generate_more"
            ? { op: "generate_more" as const, category: body.category }
            : body.op === "save_brief"
              ? {
                  op: "save_brief" as const,
                  missionGoal: body.mission_goal ?? "",
                  questions: body.questions.map((q) => ({
                    id: q.id ?? null,
                    text: q.text,
                  })),
                }
              : { op: "remove" as const, askId: body.ask_id };

  const result = await runPrepareTacticalAskMutation({
    engagementId,
    userId: uid,
    mutation,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
  }

  const saved = await updateEngagementPatch(engagementId, result.patch);
  if (!saved.ok) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: 500 });
  }
  if (saved.tacticalAsksSkipped) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Structured tactical asks require migration 20260633_prepare_tactical_asks.sql. Apply it to your database, then retry.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    asks: result.asks,
    probes:
      typeof result.patch.pre_observation_probes === "string" ||
      result.patch.pre_observation_probes === null
        ? result.patch.pre_observation_probes
        : null,
    message: result.message,
  });
}
