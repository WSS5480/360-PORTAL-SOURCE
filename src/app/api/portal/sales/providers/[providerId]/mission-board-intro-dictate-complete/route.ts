import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { completeMissionBoardIntroCallDictation, finalizeMissionBoardIntroCallDebrief } from "@/lib/surgical-sales/missionBoardIntroCallDictateCompleteService";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DictateCompleteBodySchema = z
  .object({
    engagement_id: z.string().uuid(),
    narrative: z.string().min(8).max(8000),
    capture_mode: z.enum(["voice", "quick"]).optional(),
  })
  .strict();

const FinalizeBodySchema = z
  .object({
    action: z.literal("finalize"),
    engagement_id: z.string().uuid(),
    narrative: z.string().max(8000).optional(),
  })
  .strict();

const PostBodySchema = z.union([DictateCompleteBodySchema, FinalizeBodySchema]);

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  if ("action" in parsed.data && parsed.data.action === "finalize") {
    const result = await finalizeMissionBoardIntroCallDebrief({
      providerId,
      userId: uid,
      engagementId: parsed.data.engagement_id,
      narrative: parsed.data.narrative,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
    }
    return NextResponse.json({ ok: true, engagementId: result.engagementId, finalized: true });
  }

  const dictateBody = DictateCompleteBodySchema.parse(parsed.data);
  const result = await completeMissionBoardIntroCallDictation({
    providerId,
    userId: uid,
    engagementId: dictateBody.engagement_id,
    narrative: dictateBody.narrative,
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
