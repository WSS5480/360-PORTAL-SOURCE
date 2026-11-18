import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import { categoryLabelForQuestionKey } from "@/lib/surgical-sales/providerClinicalDiscoveryCaseInsight";
import {
  appendTextToEngagementField,
  DEPRECATED_PROVIDER_CLINICAL_DISCOVERY_NOTE,
} from "@/lib/surgical-sales/engagementInteractionPlanning";
import { isClinicalDiscoveryQuestionKey } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BodySchema = z
  .object({
    questionKey: z.string().refine((k) => isClinicalDiscoveryQuestionKey(k), "Invalid category key"),
    insightText: z.string().min(1).max(16000),
    tags: z.array(z.string().max(80)).max(32).optional(),
    confidence: z.enum(["low", "medium", "high"]).nullable().optional(),
    mergeMode: z.enum(["append", "replace"]).optional(),
  })
  .strict();

function formatCaseInsightBlock(
  categoryLabel: string,
  insightText: string,
  caseLabel: string,
  mergeMode: "append" | "replace",
): string {
  const header = `[${categoryLabel} · ${caseLabel}]`;
  const body = insightText.trim();
  if (mergeMode === "replace") return `${header}\n${body}`;
  return `${header}\n${body}`;
}

export async function POST(req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { caseId } = await ctx.params;
  if (!UUID_RE.test(caseId)) {
    return NextResponse.json({ ok: false, error: "Invalid case id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const caseRow = await loadSurgicalCaseForPortalActor(caseId, uid, { includeArchived: true });
  if (!caseRow) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const engagementId = String((caseRow as { engagement_id?: string | null }).engagement_id || "").trim();
  if (!engagementId || !UUID_RE.test(engagementId)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Link this case to an engagement first, then capture visit discovery on Prepare for Meeting (Pre-Call Plan).",
        code: "engagement_required",
        hint: DEPRECATED_PROVIDER_CLINICAL_DISCOVERY_NOTE,
      },
      { status: 400 },
    );
  }

  const { data: engagement, error: engErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("id, pre_observation_probes")
    .eq("id", engagementId)
    .maybeSingle();
  if (engErr) return NextResponse.json({ ok: false, error: engErr.message }, { status: 500 });
  if (!engagement) return NextResponse.json({ ok: false, error: "Engagement not found." }, { status: 404 });

  const categoryLabel = categoryLabelForQuestionKey(parsed.data.questionKey);
  const caseNumber = formatSurgicalCaseNumber(String((caseRow as { case_number?: string }).case_number ?? ""));
  const caseLabel = caseNumber ? `case ${caseNumber}` : "observation case";
  const existingProbes = String((engagement as { pre_observation_probes?: string }).pre_observation_probes ?? "").trim();
  const hasExisting = existingProbes.length >= 3;

  if (hasExisting && !parsed.data.mergeMode) {
    return NextResponse.json(
      {
        ok: false,
        error: "Existing discovery notes on the engagement require append or replace confirmation.",
        code: "merge_required",
        existing: { field: "pre_observation_probes", value: existingProbes },
      },
      { status: 409 },
    );
  }

  const mergeMode = hasExisting ? parsed.data.mergeMode! : "append";
  const block = formatCaseInsightBlock(categoryLabel, parsed.data.insightText, caseLabel, mergeMode);
  const nextProbes =
    mergeMode === "replace"
      ? block
      : appendTextToEngagementField(existingProbes, block);

  const now = new Date().toISOString();
  const { error: updateErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({ pre_observation_probes: nextProbes, updated_at: now })
    .eq("id", engagementId);
  if (updateErr) return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });

  await logSurgicalSalesCrmAudit({
    actorUserId: uid,
    action: "engagement_interaction_planning_updated_from_case",
    meta: {
      case_id: caseId,
      engagement_id: engagementId,
      field: "pre_observation_probes",
      category_label: categoryLabel,
      merge_mode: mergeMode,
    },
    req,
  });

  return NextResponse.json({
    ok: true,
    engagement_id: engagementId,
    field: "pre_observation_probes",
    prepare_href: `/portal/sales/engagements/${encodeURIComponent(engagementId)}/prepare`,
    message: `Saved to engagement preparation (${categoryLabel}).`,
  });
}
