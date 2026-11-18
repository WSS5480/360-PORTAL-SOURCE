import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { PROVIDER_OUTCOME_UPDATE_TYPES } from "@/lib/surgical-sales/providerCommitmentOutcomes";
import {
  activateMissionBoardOutcomesTracking,
  logMissionBoardOutcomeUpdate,
  logMissionBoardProductUse,
} from "@/lib/surgical-sales/missionBoardCommitmentOutcomesService";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PostBodySchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("activate"),
    })
    .strict(),
  z
    .object({
      action: z.literal("outcome_update"),
      update_type: z.enum(PROVIDER_OUTCOME_UPDATE_TYPES),
      notes: z.string().min(1).max(2000),
      recorded_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    })
    .strict(),
  z
    .object({
      action: z.literal("product_use"),
      recorded_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
      product_path: z.string().max(500).optional().nullable(),
      case_procedure: z.string().max(500).optional().nullable(),
      quantity: z.string().max(64).optional().nullable(),
      notes: z.string().max(2000).optional().nullable(),
    })
    .strict(),
]);

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

  if (body.action === "activate") {
    const result = await activateMissionBoardOutcomesTracking({ providerId, userId: uid });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
    }
    return NextResponse.json({ ok: true, alreadyActive: result.data.alreadyActive });
  }

  if (body.action === "outcome_update") {
    const result = await logMissionBoardOutcomeUpdate({
      providerId,
      userId: uid,
      updateType: body.update_type,
      notes: body.notes,
      recordedDate: body.recorded_date,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
    }
    return NextResponse.json({ ok: true, activityId: result.data.activityId });
  }

  const result = await logMissionBoardProductUse({
    providerId,
    userId: uid,
    recordedDate: body.recorded_date,
    productPath: body.product_path,
    caseProcedure: body.case_procedure,
    quantity: body.quantity,
    notes: body.notes,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
  }
  return NextResponse.json({ ok: true, activityId: result.data.activityId });
}
