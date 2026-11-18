import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { loadPrepareForMeetingViewForActor } from "@/lib/surgical-sales/engagements/loadPrepareForMeetingView";
import { improvePreCallPlanFieldWording } from "@/lib/surgical-sales/engagements/improvePreCallPlanFieldWording";
import { PRE_CALL_PLAN_STRATEGIC_DRAFT_KEYS } from "@/lib/surgical-sales/preCallPlanStrategicTemplateMapping";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PLAN_FIELD_KEY_ENUM = PRE_CALL_PLAN_STRATEGIC_DRAFT_KEYS as unknown as [
  (typeof PRE_CALL_PLAN_STRATEGIC_DRAFT_KEYS)[number],
  ...(typeof PRE_CALL_PLAN_STRATEGIC_DRAFT_KEYS)[number][],
];

const BodySchema = z
  .object({
    action: z.literal("improve_wording"),
    fieldKey: z.enum(PLAN_FIELD_KEY_ENUM),
    fieldLabel: z.string().min(1).max(120),
    fieldHelper: z.string().max(500).optional(),
    currentText: z.string().min(1).max(8000),
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

  const prepare = await loadPrepareForMeetingViewForActor(engagementId, uid);
  if (!prepare.ok) {
    return NextResponse.json({ ok: false, error: "Could not load prepare context" }, { status: 500 });
  }

  try {
    const result = await improvePreCallPlanFieldWording({
      fieldKey: body.fieldKey,
      fieldLabel: body.fieldLabel,
      fieldHelper: body.fieldHelper,
      currentText: body.currentText,
      engagementTypeLabel: formatEngagementType(
        String(engagement.engagement_type ?? prepare.prepare.upcoming_engagement.engagement_type),
      ),
      providerName: prepare.prepare.provider_snapshot.display_name,
      organizationName:
        prepare.prepare.provider_snapshot.organization_name ??
        prepare.prepare.upcoming_engagement.organization_name ??
        undefined,
    });
    return NextResponse.json({ ok: true, text: result.text, usedAi: result.usedAi });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not improve wording";
    const status = message.includes("Add text") ? 400 : 503;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
