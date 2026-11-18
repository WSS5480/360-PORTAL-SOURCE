import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { commitAiNoteCaptureItems } from "@/lib/surgical-sales/aiNoteCapture/commitItems";
import { AI_NOTE_CAPTURE_CLASSIFICATIONS, AI_NOTE_CAPTURE_DESTINATIONS } from "@/lib/surgical-sales/aiNoteCapture/types";
import {
  AI_NOTE_CAPTURE_MERGE_STRATEGIES,
  PROVIDER_PLANNING_LOGICAL_FIELDS,
} from "@/lib/surgical-sales/aiNoteCapture/workflowTargets";

const PROVIDER_PLANNING_WORKFLOW_SECTIONS = [
  "provider_basics",
  "procedural_intelligence",
  "product_competitor_intelligence",
  "relationship_strategy",
  "observation_prompts",
] as const;

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const WorkflowTargetSchema = z
  .object({
    workflow: z.literal("provider_planning"),
    section: z.enum(PROVIDER_PLANNING_WORKFLOW_SECTIONS),
    field: z.enum(PROVIDER_PLANNING_LOGICAL_FIELDS),
    fieldLabel: z.string(),
    mergeStrategy: z.enum(AI_NOTE_CAPTURE_MERGE_STRATEGIES),
  })
  .nullable()
  .optional();

const ItemSchema = z.object({
  id: z.string().min(1).max(80),
  category: z.enum(AI_NOTE_CAPTURE_CLASSIFICATIONS),
  destination: z.enum(AI_NOTE_CAPTURE_DESTINATIONS),
  targetId: z.string().max(80).optional(),
  body: z.string().min(1).max(8000),
  originalText: z.string().max(2000).optional(),
  workflowTarget: WorkflowTargetSchema,
  mergeStrategy: z.enum(AI_NOTE_CAPTURE_MERGE_STRATEGIES).optional(),
});

function resolveCommitTargetId(
  item: { destination: (typeof AI_NOTE_CAPTURE_DESTINATIONS)[number]; targetId?: string; category: (typeof AI_NOTE_CAPTURE_CLASSIFICATIONS)[number] },
  context: {
    caseId?: string;
    providerId?: string;
    opportunityId?: string;
    organizationId?: string;
  },
): string | null {
  const raw = (item.targetId || "").trim();
  if (UUID_RE.test(raw)) return raw;

  switch (item.destination) {
    case "case":
    case "product":
      return context.caseId && UUID_RE.test(context.caseId) ? context.caseId : null;
    case "provider":
      return context.providerId && UUID_RE.test(context.providerId) ? context.providerId : null;
    case "opportunity":
    case "task":
      return context.opportunityId && UUID_RE.test(context.opportunityId) ? context.opportunityId : null;
    case "organization":
      return context.organizationId && UUID_RE.test(context.organizationId) ? context.organizationId : null;
    case "unclassified":
      return null;
    default:
      return null;
  }
}

const BodySchema = z
  .object({
    context: z
      .object({
        caseId: z.string().uuid().optional(),
        caseLabel: z.string().max(200).optional(),
        providerId: z.string().uuid().optional(),
        providerLabel: z.string().max(200).optional(),
        opportunityId: z.string().uuid().optional(),
        opportunityLabel: z.string().max(200).optional(),
        organizationId: z.string().uuid().optional(),
        organizationLabel: z.string().max(200).optional(),
      })
      .optional(),
    inputMode: z.enum(["photo", "upload", "dictate", "type"]).optional().nullable(),
    sourceExcerpt: z.string().max(500).optional(),
    items: z.array(ItemSchema).min(1).max(24),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const uid = auth.user.id;
    const rep = await userIsInternalSalesRep(uid);
    if (!rep) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const raw = await req.json().catch(() => null);
    const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
    if (keyErr) {
      return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
    }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const ctx = parsed.data.context ?? {};
    const items = parsed.data.items.map((item) => {
      if (item.destination === "unclassified" || item.category === "unclassified") {
        return null;
      }
      if (item.category === "workflow_field_suggestion" && !item.workflowTarget) {
        return null;
      }
      const targetId = resolveCommitTargetId(item, ctx);
      if (!targetId && item.destination !== "task") {
        return null;
      }
      if (item.destination === "task") {
        const taskTarget = resolveCommitTargetId({ ...item, destination: "opportunity" }, ctx);
        if (!taskTarget) return null;
        return { ...item, targetId: taskTarget };
      }
      return {
        ...item,
        targetId: targetId!,
        workflowTarget: item.workflowTarget ?? null,
        mergeStrategy: item.mergeStrategy ?? item.workflowTarget?.mergeStrategy,
      };
    });

    if (items.some((i) => i == null)) {
      return NextResponse.json(
        { ok: false, error: "Each accepted item needs a valid target record. Tasks require an opportunity." },
        { status: 400 },
      );
    }

    const result = await commitAiNoteCaptureItems({
      actorUserId: uid,
      context: ctx,
      items: items as NonNullable<(typeof items)[number]>[],
      inputMode: parsed.data.inputMode,
      sourceExcerpt: parsed.data.sourceExcerpt,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, saved: result.saved });
  } catch (e: unknown) {
    console.error("[ai-note-capture commit]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}
