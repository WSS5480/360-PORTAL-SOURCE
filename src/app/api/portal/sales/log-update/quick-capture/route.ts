import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { quickCaptureFieldIntelligence } from "@/lib/surgical-sales/quickCaptureFieldIntelligence";
import { CAPTURE_INTELLIGENCE_LAUNCH_SURFACES } from "@/lib/surgical-sales/captureIntelligenceLaunch";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? null : value),
  z.string().uuid().nullable().optional(),
);

const BodySchema = z
  .object({
    rawNote: z.string().min(1).max(16000),
    providerId: z.string().uuid(),
    organizationId: optionalUuid,
    engagementId: optionalUuid,
    productFocus: z.string().max(200).optional().nullable(),
    launchSurface: z.enum(CAPTURE_INTELLIGENCE_LAUNCH_SURFACES).optional(),
    context: z
      .object({
        providerId: z.string().optional(),
        providerLabel: z.string().optional(),
        organizationId: z.string().optional(),
        organizationLabel: z.string().optional(),
        engagementId: z.string().optional(),
        engagementTypeLabel: z.string().optional(),
        engagementType: z.string().optional(),
        productFocus: z.string().optional(),
        scopeLocked: z.boolean().optional(),
        declaredSourceType: z
          .enum(["field_note", "observation_case", "debrief", "evaluation", "outcome"])
          .optional(),
        launchSurface: z.enum(CAPTURE_INTELLIGENCE_LAUNCH_SURFACES).optional(),
        composeTitle: z.string().optional(),
        composeSubtitle: z.string().optional(),
        reviewSaveCta: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!UUID_RE.test(body.providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider id" }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("full_name, email")
    .eq("user_id", uid)
    .maybeSingle();
  const actorName =
    String((profile as { full_name?: string | null } | null)?.full_name ?? "").trim() ||
    String((profile as { email?: string | null } | null)?.email ?? "").trim() ||
    "Rep";

  const result = await quickCaptureFieldIntelligence({
    providerId: body.providerId,
    userId: uid,
    actorName,
    rawNote: body.rawNote,
    organizationId: body.organizationId ?? null,
    engagementId: body.engagementId ?? null,
    productFocus: body.productFocus ?? null,
    launchSurface: body.launchSurface ?? body.context?.launchSurface ?? null,
    context: body.context,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    suggestion_count: result.suggestionCount,
    suggestion_labels: result.suggestionLabels,
    capture_id: result.captureId,
    mapping_warning: result.mappingWarning,
  });
}
