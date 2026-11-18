import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import { buildSurgicalCasePatchAuditDiff } from "@/lib/surgical-sales/caseAuditFields";
import {
  logPreCallPlanActivityEvents,
  omitPreCallPlanFromAuditDiff,
  pickPreCallPlanAuditDiff,
} from "@/lib/surgical-sales/preCallPlanActivityLog";
import { formatSurgicalCaseNumber, formatSurgicalCaseStatus, isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import { loadDocumentTypesForCase } from "@/lib/surgical-sales/caseDocumentWorkflow";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import {
  buildSurgicalCaseDataWarnings,
  SURGICAL_STATUSES_PAST_SCHEDULED,
  validateSurgicalCaseStatusPatch,
  applyExpectedQuantitiesAsActualWhenCompleting,
} from "@/lib/surgical-sales/surgicalCaseIntegrity";
import { computeSurgicalBillingChecklist, surgicalCaseRequiresBillingWorkflow } from "@/lib/surgical-sales/billingReadiness";
import { listMissingBillingDocLabels, notifySurgicalCaseMissingDocsAfterCompleted } from "@/lib/surgical-sales/caseNotifications";
import { detectSurgicalPhiPatternKinds } from "@/lib/surgical-sales/phiContentHeuristics";
import { recordSurgicalPhiPatternEvent } from "@/lib/surgical-sales/phiWarningLogger";
import { isInternalPortalAdmin } from "@/lib/sales/isInternalPortalAdmin";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import { SALES_STAGES } from "@/lib/sales/stages";
import { buildCaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import { loadOrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import { listClinicalDiscoveryAnswersForProvider } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import { loadUniversalFactsReadModelForCase } from "@/lib/surgical-sales/universalExtractor/loadUniversalFactsReadModel";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import { assertProviderLinkedToOrganization } from "@/lib/surgical-sales/crmEntityRelationships";
import { persistProviderProcedureFocusFromCaseEntry } from "@/lib/surgical-sales/providerProcedureFocusFromCase";
import { actualRevenueToPersistOnComplete } from "@/lib/surgical-sales/casePerformedStatus";
import { BOOKED_REVENUE_CASE_STATUSES } from "@/lib/surgical-sales/caseRevenuePipeline";
import {
  adoptionInitiativeSnapshotFromRow,
  logAdoptionInitiativeCaseLinked,
} from "@/lib/activity/adoptionInitiativeActivity";
import { loadOpportunityForViewer } from "@/lib/sales/opportunityAccess";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import {
  applyPreCallPlanToEngagement,
  pickPreCallPlanPatchFromPayload,
  resolvePreCallPlanRowForCase,
} from "@/lib/surgical-sales/engagements/engagementPreCallPlan";
import { ensureEngagementForCase } from "@/lib/surgical-sales/engagements/createEngagement";
import { logEngagementPreCallPlanActivityEvents } from "@/lib/surgical-sales/engagements/engagementActivityLog";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CASE_STATUSES = [
  "draft",
  "scheduled",
  "rescheduled",
  "confirmed",
  "completed",
  "docs_needed",
  "billing_review",
  "invoiced",
  "closed",
  "cancelled",
] as const;

const PatchCaseSchema = z.object({
  case_type: z.enum(["observation", "product_support"]).optional(),
  account_id: z.string().uuid().optional(),
  surgeon_contact_id: z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.string().uuid().nullable().optional()),
  case_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  case_time: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/)
      .nullable()
      .optional()
  ),
  procedure_type: z.string().max(400).nullable().optional(),
  product_id: z.string().uuid().nullable().optional(),
  expected_revenue: z.number().nonnegative().max(1e12).nullable().optional(),
  actual_revenue: z.number().nonnegative().max(1e12).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
  observation_goal: z.string().max(1200).nullable().optional(),
  observation_key_questions: z.string().max(4000).nullable().optional(),
  observation_signals_to_validate: z.string().max(4000).nullable().optional(),
  observation_access: z
    .object({
      scheduling_owner: z.string().max(500).nullable().optional(),
      access_pathway: z.string().max(500).nullable().optional(),
      credentialing_requirement: z
        .enum(["unknown", "not_required", "required_not_started", "in_progress", "verified"])
        .optional(),
      vendor_restrictions: z.string().max(2000).nullable().optional(),
      preferred_timing: z.string().max(1000).nullable().optional(),
    })
    .optional(),
  observation_validation_targets: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        label: z.string().min(1).max(1000),
        source: z.enum(["manual", "provider_signal", "procedural_context", "chip"]),
        status: z.enum(["planned", "observed"]),
        created_at: z.string().min(1).max(80),
      }),
    )
    .max(200)
    .optional(),
  pre_call_hospital_name: z.string().max(400).nullable().optional(),
  pre_call_surgeon_name: z.string().max(400).nullable().optional(),
  pre_observation_impact_opening_statement: z.string().max(4000).nullable().optional(),
  pre_observation_probes: z.string().max(8000).nullable().optional(),
  pre_observation_tools_resources: z.string().max(8000).nullable().optional(),
  pre_observation_value_hypothesis: z.string().max(8000).nullable().optional(),
  pre_observation_planned_close: z.string().max(8000).nullable().optional(),
  pre_observation_additional_notes: z.string().max(8000).nullable().optional(),
  live_observation_workflow: z.string().max(8000).nullable().optional(),
  live_observation_clinical_pain_points: z.string().max(8000).nullable().optional(),
  live_observation_surgeon_reactions: z.string().max(8000).nullable().optional(),
  live_observation_product_fit: z.string().max(8000).nullable().optional(),
  observation_quick_finding_product_interest: z.string().max(120).nullable().optional(),
  live_observation_competitors: z.string().max(8000).nullable().optional(),
  live_observation_staff_process: z.string().max(8000).nullable().optional(),
  live_observation_questions: z.string().max(8000).nullable().optional(),
  live_observation_follow_up_items: z.string().max(8000).nullable().optional(),
  debrief_key_findings: z.string().max(8000).nullable().optional(),
  debrief_opportunity_score: z.number().int().min(0).max(100).nullable().optional(),
  debrief_recommended_next_stage: z.enum(SALES_STAGES).nullable().optional(),
  debrief_product_opportunity_identified: z.boolean().optional(),
  follow_up_needed: z.boolean().optional(),
  debrief_suggested_next_action: z.string().max(4000).nullable().optional(),
  debrief_convert_to_product_support_case: z.boolean().optional(),
  case_support_outcome: z
    .enum([
      "completed_as_planned",
      "product_used",
      "product_not_used",
      "issue_occurred",
      "follow_up_needed",
    ])
    .nullable()
    .optional(),
  case_support_provider_reaction: z.enum(["positive", "neutral", "negative"]).nullable().optional(),
  case_support_case_result: z
    .enum(["successful", "issue_encountered", "follow_up_needed"])
    .nullable()
    .optional(),
  case_support_next_step: z
    .enum(["additional_case", "training", "evaluation", "follow_up_meeting", "none"])
    .nullable()
    .optional(),
  case_implants_on_site: z.string().max(4000).nullable().optional(),
  case_trays_sterilization_status: z.string().max(4000).nullable().optional(),
  case_room_assignment: z.string().max(400).nullable().optional(),
  case_support_coverage: z.string().max(4000).nullable().optional(),
  case_planned_arrival_time: z.string().max(200).nullable().optional(),
  case_product_needs: z.string().max(4000).nullable().optional(),
  case_operational_risks: z.string().max(4000).nullable().optional(),
  related_opportunity_id: z.string().uuid().nullable().optional(),
  status: z.enum(CASE_STATUSES).optional(),
  archive: z.literal(true).optional(),
  restore: z.literal(true).optional(),
}).strict();

async function loadProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (uniq.length === 0) return map;
  const { data } = await supabaseAdmin.from("user_profiles").select("user_id, full_name, email").in("user_id", uniq);
  for (const r of data || []) {
    const id = String((r as { user_id: string }).user_id);
    const fn = String((r as { full_name?: string | null }).full_name ?? "").trim();
    const em = String((r as { email?: string | null }).email ?? "").trim();
    map.set(id, fn || em || id);
  }
  return map;
}

export async function GET(_req: Request, ctx: { params: Promise<{ caseId: string }> }) {
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

  const { caseId } = await ctx.params;
  if (!UUID_RE.test(caseId)) {
    return NextResponse.json({ ok: false, error: "Invalid case id" }, { status: 400 });
  }

  const row = await loadSurgicalCaseForPortalActor(caseId, uid, { includeArchived: true });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const accountId = String(row.account_id);
  const surgeonId = row.surgeon_contact_id ? String(row.surgeon_contact_id) : null;
  const productId = row.product_id ? String(row.product_id) : null;
  const repId = String(row.sales_rep_id);

  const [accRes, surgeonRes, prodRes, linesRes, actsRes, docsRes] = await Promise.all([
    supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").eq("id", accountId).maybeSingle(),
    surgeonId
      ? supabaseAdmin.from("surgical_sales_contacts").select("*").eq("id", surgeonId).maybeSingle()
      : Promise.resolve({ data: null as null }),
    productId
      ? supabaseAdmin.from("surgical_sales_products").select("id, name, category").eq("id", productId).maybeSingle()
      : Promise.resolve({ data: null as null }),
    supabaseAdmin
      .from("surgical_sales_case_products")
      .select("id, product_id, sku_id, expected_quantity, actual_quantity, notes, created_at, updated_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("surgical_sales_case_activities")
      .select("id, user_id, activity_type, body, metadata_json, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(300),
    supabaseAdmin
      .from("surgical_sales_case_documents")
      .select("id, case_id, document_type, file_name, file_url, storage_key, uploaded_by, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false }),
  ]);

  const lineRows = (linesRes.data || []) as { sku_id?: string | null; product_id?: string }[];
  const skuIds = [...new Set(lineRows.map((l) => l.sku_id).filter(Boolean) as string[])];
  const lineProductIds = [...new Set(lineRows.map((l) => String(l.product_id)).filter(Boolean))];
  const skuBy = new Map<string, { sku: string; description: string | null }>();
  if (skuIds.length > 0) {
    const { data: skus } = await supabaseAdmin.from("surgical_sales_product_skus").select("id, sku, description").in("id", skuIds);
    for (const s of skus || []) {
      skuBy.set(String((s as { id: string }).id), {
        sku: String((s as { sku: string }).sku),
        description: (s as { description?: string | null }).description ?? null,
      });
    }
  }
  const productNameBy = new Map<string, string>();
  if (lineProductIds.length > 0) {
    const { data: prods } = await supabaseAdmin.from("surgical_sales_products").select("id, name").in("id", lineProductIds);
    for (const p of prods || []) {
      productNameBy.set(String((p as { id: string }).id), String((p as { name?: string | null }).name ?? ""));
    }
  }

  const lines = lineRows.map((l) => {
    const sid = l.sku_id ? String(l.sku_id) : null;
    const sk = sid ? skuBy.get(sid) : undefined;
    const pid = String(l.product_id);
    return {
      ...l,
      sku_code: sk?.sku ?? null,
      sku_description: sk?.description ?? null,
      product_name: productNameBy.get(pid) ?? null,
    };
  });

  const acts = (actsRes.data || []) as { user_id: string }[];
  const docs = (docsRes.data || []) as { uploaded_by: string }[];
  const profileIds = [repId, ...acts.map((a) => a.user_id), ...docs.map((d) => d.uploaded_by)];
  const profileBy = await loadProfileNames(profileIds);

  const activities = (actsRes.data || []).map((a: Record<string, unknown>) => ({
    ...a,
    actor_display_name: profileBy.get(String(a.user_id)) ?? String(a.user_id),
  }));

  const documents = (docsRes.data || []).map((d: Record<string, unknown>) => ({
    ...d,
    uploader_display_name: profileBy.get(String(d.uploaded_by)) ?? String(d.uploaded_by),
  }));

  const docTypes = new Set(
    (docsRes.data || []).map((d) => String((d as { document_type: string }).document_type).toLowerCase())
  );
  const hasPo = docTypes.has("purchase_order");
  const hasInv = docTypes.has("invoice");
  const qtyLines = lines.map((l) => ({ actual_quantity: (l as { actual_quantity?: unknown }).actual_quantity }));
  const requiresBilling = surgicalCaseRequiresBillingWorkflow({
    caseType: (row as { case_type?: string | null }).case_type,
    productId: productId,
    productLineCount: lines.length,
  });
  const billingChecklist = computeSurgicalBillingChecklist(
    String((row as { status?: string }).status ?? ""),
    hasPo,
    hasInv,
    qtyLines,
    requiresBilling
  );

  const surgeonRow = surgeonRes.data as Record<string, unknown> | null;
  const planningContext = {
    referenceCaseDate: (row as { case_date?: string | null }).case_date,
    referenceCaseUpdatedAt: (row as { updated_at?: string | null }).updated_at,
  };
  let providerIntelligence = null;
  if (surgeonRow && surgeonId && isProviderRole(String(surgeonRow.role_type || ""))) {
    let clinicalAnswers: Awaited<ReturnType<typeof listClinicalDiscoveryAnswersForProvider>> = [];
    try {
      clinicalAnswers = await listClinicalDiscoveryAnswersForProvider(supabaseAdmin, surgeonId);
    } catch {
      clinicalAnswers = [];
    }
    providerIntelligence = buildProviderIntelligenceSnapshot(surgeonRow, surgeonId, planningContext);
  }

  const preCallResolved = await resolvePreCallPlanRowForCase(row as Record<string, unknown>);
  const engagement = preCallResolved.engagementId
    ? await loadEngagementForPortalActor(preCallResolved.engagementId, uid, { includeArchived: true })
    : null;

  const accountName = String((accRes.data as { name?: string | null } | null)?.name ?? "").trim();
  let organizationIntelligenceBaseline = null;
  if (surgeonId && accountId) {
    try {
      organizationIntelligenceBaseline = await loadOrganizationIntelligenceBaseline({
        organizationId: accountId,
        organizationName: accountName || "Facility",
        excludeProviderId: surgeonId,
      });
    } catch {
      organizationIntelligenceBaseline = null;
    }
  }

  const caseOperationalContext = buildCaseOperationalContextView({
    caseRow: preCallResolved.row,
    surgeonContact: surgeonRow,
    organizationBaseline: organizationIntelligenceBaseline,
    organizationName: accountName || null,
  });

  let providerPriorCases: Record<string, unknown>[] = [];
  let providerPriorObservationCases: Record<string, unknown>[] = [];
  if (surgeonId) {
    const { data: priorCases } = await supabaseAdmin
      .from("surgical_sales_cases")
      .select(
        "id, case_type, procedure_type, case_date, status, observation_completed_at, live_observation_competitors, live_observation_product_fit, live_observation_workflow, live_observation_clinical_pain_points, live_observation_staff_process, live_observation_surgeon_reactions, notes, observation_workflow_intelligence_snapshot, case_support_outcome, case_product_needs, debrief_key_findings",
      )
      .eq("surgeon_contact_id", surgeonId)
      .neq("id", caseId)
      .in("case_type", ["observation", "product_support"])
      .order("case_date", { ascending: false })
      .limit(12);
    providerPriorCases = (priorCases || []) as Record<string, unknown>[];
    providerPriorObservationCases = providerPriorCases.filter(
      (row) => String(row.case_type ?? "") === "observation",
    );

    const priorCaseIds = providerPriorCases
      .map((row) => String(row.id ?? "").trim())
      .filter(Boolean);
    if (priorCaseIds.length > 0) {
      const { data: priorActivities } = await supabaseAdmin
        .from("surgical_sales_case_activities")
        .select("id, case_id, activity_type, body, metadata_json, created_at")
        .in("case_id", priorCaseIds)
        .order("created_at", { ascending: true })
        .limit(600);
      const activitiesByCase = new Map<string, Record<string, unknown>[]>();
      for (const activity of priorActivities || []) {
        const activityCaseId = String((activity as { case_id?: string }).case_id ?? "").trim();
        if (!activityCaseId) continue;
        const bucket = activitiesByCase.get(activityCaseId) ?? [];
        bucket.push(activity as Record<string, unknown>);
        activitiesByCase.set(activityCaseId, bucket);
      }
      providerPriorCases = providerPriorCases.map((priorCase) => {
        const priorCaseId = String(priorCase.id ?? "").trim();
        const caseActivities = activitiesByCase.get(priorCaseId);
        return caseActivities?.length ? { ...priorCase, activities: caseActivities } : priorCase;
      });
      providerPriorObservationCases = providerPriorCases.filter(
        (row) => String(row.case_type ?? "") === "observation",
      );
    }
  }

  const universalFactsReadModel = await loadUniversalFactsReadModelForCase({
    caseId,
    providerId: surgeonId,
  });

  return NextResponse.json({
    ok: true,
    case: {
      ...preCallResolved.row,
      case_number: formatSurgicalCaseNumber((row as { case_number?: string | null }).case_number),
    },
    engagement,
    pre_call_plan_source: preCallResolved.source,
    account: accRes.data,
    surgeon: surgeonRes.data,
    provider_intelligence: providerIntelligence,
    organization_intelligence_baseline: organizationIntelligenceBaseline,
    case_operational_context: caseOperationalContext,
    product: prodRes.data,
    sales_rep: {
      user_id: repId,
      display_name: profileBy.get(repId) ?? repId,
    },
    lines,
    activities,
    provider_prior_observation_cases: providerPriorObservationCases,
    provider_prior_cases: providerPriorCases,
    universal_facts_read_model: universalFactsReadModel,
    documents,
    billing: {
      ...billingChecklist,
      billing_reviewed_at: (row as { billing_reviewed_at?: string | null }).billing_reviewed_at ?? null,
      billing_admin_notes: (row as { billing_admin_notes?: string | null }).billing_admin_notes ?? null,
    },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ caseId: string }> }) {
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

  const { caseId } = await ctx.params;
  if (!UUID_RE.test(caseId)) {
    return NextResponse.json({ ok: false, error: "Invalid case id" }, { status: 400 });
  }

  const row = await loadSurgicalCaseForPortalActor(caseId, uid, { includeArchived: true });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) {
    return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  }
  const parsed = PatchCaseSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;
  if (p.archive === true && p.restore === true) {
    return NextResponse.json({ ok: false, error: "Choose archive or restore, not both." }, { status: 400 });
  }

  const archiveOnlyKeys = new Set(["archive", "restore"]);
  const otherTouched = (Object.keys(p) as (keyof typeof p)[]).filter((k) => p[k] !== undefined && !archiveOnlyKeys.has(k as string));
  if ((p.archive === true || p.restore === true) && otherTouched.length > 0) {
    return NextResponse.json({ ok: false, error: "Send archive or restore alone (no other fields)." }, { status: 400 });
  }

  const archivedAt = (row as { archived_at?: string | null }).archived_at ?? null;

  if (p.archive === true) {
    if (archivedAt) {
      return NextResponse.json({ ok: false, error: "Case is already archived." }, { status: 400 });
    }
    const admin = await isInternalPortalAdmin(uid);
    if (!admin && !(await userIsInternalSalesRep(uid))) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const now = new Date().toISOString();
    const { data: updated, error: upErr } = await supabaseAdmin
      .from("surgical_sales_cases")
      .update({ archived_at: now, archived_by_user_id: uid, updated_at: now })
      .eq("id", caseId)
      .select("*")
      .single();
    if (upErr || !updated) {
      console.error("[case PATCH archive]", upErr);
      return NextResponse.json({ ok: false, error: upErr?.message || "Archive failed" }, { status: 500 });
    }
    const log = await logSurgicalCaseActivity({
      caseId,
      userId: uid,
      activityType: "case_archived",
      body: "Case archived — hidden from active lists; history and documents are kept.",
      metadataJson: { archived_at: now },
    });
    if (!log.ok) {
      return NextResponse.json({ ok: false, error: log.message }, { status: 500 });
    }
    await logSurgicalSalesCrmAudit({
      actorUserId: uid,
      action: "case_archived",
      meta: { case_id: caseId, account_id: String((row as { account_id?: string }).account_id ?? "") },
      req,
    });
    return NextResponse.json({ ok: true, case: updated });
  }

  if (p.restore === true) {
    if (!archivedAt) {
      return NextResponse.json({ ok: false, error: "Case is not archived." }, { status: 400 });
    }
    const admin = await isInternalPortalAdmin(uid);
    if (!admin && !(await userIsInternalSalesRep(uid))) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const now = new Date().toISOString();
    const { data: updated, error: upErr } = await supabaseAdmin
      .from("surgical_sales_cases")
      .update({ archived_at: null, archived_by_user_id: null, updated_at: now })
      .eq("id", caseId)
      .select("*")
      .single();
    if (upErr || !updated) {
      console.error("[case PATCH restore]", upErr);
      return NextResponse.json({ ok: false, error: upErr?.message || "Restore failed" }, { status: 500 });
    }
    const log = await logSurgicalCaseActivity({
      caseId,
      userId: uid,
      activityType: "case_restored",
      body: "Case restored to active lists.",
      metadataJson: { previous_archived_at: archivedAt },
    });
    if (!log.ok) {
      return NextResponse.json({ ok: false, error: log.message }, { status: 500 });
    }
    await logSurgicalSalesCrmAudit({
      actorUserId: uid,
      action: "case_restored",
      meta: { case_id: caseId },
      req,
    });
    return NextResponse.json({ ok: true, case: updated });
  }

  if (archivedAt) {
    return NextResponse.json(
      { ok: false, error: "This case is archived. Restore it before editing details." },
      { status: 409 },
    );
  }

  const definedKeys = (Object.keys(p) as (keyof typeof p)[]).filter((k) => p[k] !== undefined);
  if (definedKeys.length === 0) {
    return NextResponse.json({ ok: false, error: "No changes" }, { status: 400 });
  }

  let nextAccountId = String(row.account_id);
  if (p.account_id !== undefined && p.account_id !== nextAccountId) {
    const ok = await repCanViewSurgicalAccount(uid, p.account_id);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Account not available for this user" }, { status: 403 });
    }
    nextAccountId = p.account_id;
  }

  const nextSurgeon: string | null =
    p.surgeon_contact_id !== undefined ? p.surgeon_contact_id : ((row.surgeon_contact_id as string | null) ?? null);
  const surgeonCheck = await assertProviderLinkedToOrganization(nextSurgeon, nextAccountId);
  if (surgeonCheck) {
    return NextResponse.json({ ok: false, error: surgeonCheck }, { status: 400 });
  }

  if (p.product_id !== undefined && p.product_id !== null) {
    const { data: pr } = await supabaseAdmin.from("surgical_sales_products").select("id, active").eq("id", p.product_id).maybeSingle();
    if (!pr || !(pr as { active?: boolean }).active) {
      return NextResponse.json({ ok: false, error: "Product not found or inactive" }, { status: 400 });
    }
  }

  const prevStatus = String(row.status ?? "");
  const prevExpected = Number(row.expected_revenue ?? 0);
  const prevActual = row.actual_revenue == null || row.actual_revenue === "" ? null : Number(row.actual_revenue);
  const surgeonId = row.surgeon_contact_id ? String(row.surgeon_contact_id) : null;
  const prevRelatedOpportunityId = row.related_opportunity_id ? String(row.related_opportunity_id) : null;

  const mergedStatus = (p.status !== undefined ? String(p.status) : String(row.status ?? "")).toLowerCase();
  const mergedProductId =
    p.product_id !== undefined
      ? p.product_id === null
        ? null
        : String(p.product_id)
      : row.product_id
        ? String(row.product_id)
        : null;

  const caseType = p.case_type ?? String((row as { case_type?: string | null }).case_type ?? "product_support");
  const { count: productLineCount } = await supabaseAdmin
    .from("surgical_sales_case_products")
    .select("id", { count: "exact", head: true })
    .eq("case_id", caseId);
  const requiresBilling = surgicalCaseRequiresBillingWorkflow({
    caseType,
    productId: mergedProductId,
    productLineCount: productLineCount ?? 0,
  });

  const statusChanging =
    p.status !== undefined && String(p.status).toLowerCase() !== prevStatus.toLowerCase();
  if (
    statusChanging &&
    mergedStatus !== "cancelled" &&
    SURGICAL_STATUSES_PAST_SCHEDULED.has(mergedStatus) &&
    !mergedProductId &&
    requiresBilling
  ) {
    return NextResponse.json(
      { ok: false, error: "Choose a case product before moving past Scheduled." },
      { status: 400 }
    );
  }

  if (p.status !== undefined && String(p.status).toLowerCase() !== prevStatus.toLowerCase()) {
    if (String(p.status).toLowerCase() === "completed") {
      const filled = await applyExpectedQuantitiesAsActualWhenCompleting(caseId);
      if (!filled.ok) {
        return NextResponse.json({ ok: false, error: filled.error }, { status: 500 });
      }
    }
    const v = await validateSurgicalCaseStatusPatch({
      caseId,
      fromStatus: prevStatus,
      toStatus: String(p.status),
      effectiveProductId: mergedProductId,
      caseType,
    });
    if (!v.ok) {
      return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
    }
  }

  const preCallPatch = pickPreCallPlanPatchFromPayload(p as Record<string, unknown>);
  let preCallEngagementPrev: Record<string, unknown> | null = null;
  if (preCallPatch) {
    const ensured = await ensureEngagementForCase({
      caseRow: row as Record<string, unknown>,
      userId: uid,
    });
    if (!ensured.ok) {
      return NextResponse.json({ ok: false, error: ensured.message }, { status: 400 });
    }
    preCallEngagementPrev = (await loadEngagementForPortalActor(ensured.engagementId, uid)) ?? null;
    const applied = await applyPreCallPlanToEngagement({
      engagementId: ensured.engagementId,
      patch: preCallPatch,
      mirrorCaseId: caseId,
    });
    if (!applied.ok) {
      return NextResponse.json({ ok: false, error: applied.message }, { status: 500 });
    }
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (p.account_id !== undefined) patch.account_id = p.account_id;
  if (p.surgeon_contact_id !== undefined) patch.surgeon_contact_id = p.surgeon_contact_id;
  if (p.case_date !== undefined) patch.case_date = p.case_date;
  if (p.case_time !== undefined) {
    patch.case_time = p.case_time && String(p.case_time).trim() ? String(p.case_time).trim() : null;
  }
  if (p.procedure_type !== undefined) patch.procedure_type = p.procedure_type?.trim() || null;
  if (p.product_id !== undefined) patch.product_id = p.product_id;
  if (p.expected_revenue !== undefined) patch.expected_revenue = p.expected_revenue ?? 0;
  if (p.actual_revenue !== undefined) patch.actual_revenue = p.actual_revenue;
  const enteringBooked =
    BOOKED_REVENUE_CASE_STATUSES.has(mergedStatus) &&
    !BOOKED_REVENUE_CASE_STATUSES.has(prevStatus.toLowerCase());
  if (enteringBooked && p.actual_revenue === undefined) {
    const copied = actualRevenueToPersistOnComplete(
      p.expected_revenue !== undefined ? p.expected_revenue : prevExpected,
      prevActual,
    );
    if (copied != null) patch.actual_revenue = copied;
  }
  if (p.notes !== undefined) patch.notes = p.notes?.trim() || null;
  if (p.case_type !== undefined) patch.case_type = p.case_type;
  if (p.observation_goal !== undefined) patch.observation_goal = p.observation_goal?.trim() || null;
  if (p.observation_key_questions !== undefined) patch.observation_key_questions = p.observation_key_questions?.trim() || null;
  if (p.observation_signals_to_validate !== undefined)
    patch.observation_signals_to_validate = p.observation_signals_to_validate?.trim() || null;
  if (p.observation_access !== undefined) {
    const observationAccess = p.observation_access;
    patch.observation_access_scheduling_owner = observationAccess.scheduling_owner?.trim() || null;
    patch.observation_access_pathway = observationAccess.access_pathway?.trim() || null;
    patch.observation_access_credentialing = observationAccess.credentialing_requirement || "unknown";
    patch.observation_access_vendor_restrictions = observationAccess.vendor_restrictions?.trim() || null;
    patch.observation_access_preferred_timing = observationAccess.preferred_timing?.trim() || null;
    patch.observation_access_metadata = observationAccess;
  }
  if (p.observation_validation_targets !== undefined)
    patch.observation_validation_targets = p.observation_validation_targets;
  if (p.live_observation_workflow !== undefined) patch.live_observation_workflow = p.live_observation_workflow?.trim() || null;
  if (p.live_observation_clinical_pain_points !== undefined)
    patch.live_observation_clinical_pain_points = p.live_observation_clinical_pain_points?.trim() || null;
  if (p.live_observation_surgeon_reactions !== undefined)
    patch.live_observation_surgeon_reactions = p.live_observation_surgeon_reactions?.trim() || null;
  if (p.live_observation_product_fit !== undefined) patch.live_observation_product_fit = p.live_observation_product_fit?.trim() || null;
  if (p.observation_quick_finding_product_interest !== undefined) {
    patch.observation_quick_finding_product_interest =
      p.observation_quick_finding_product_interest?.trim() || null;
  }
  if (p.live_observation_competitors !== undefined) patch.live_observation_competitors = p.live_observation_competitors?.trim() || null;
  if (p.live_observation_staff_process !== undefined)
    patch.live_observation_staff_process = p.live_observation_staff_process?.trim() || null;
  if (p.live_observation_questions !== undefined) patch.live_observation_questions = p.live_observation_questions?.trim() || null;
  if (p.live_observation_follow_up_items !== undefined)
    patch.live_observation_follow_up_items = p.live_observation_follow_up_items?.trim() || null;
  if (p.debrief_key_findings !== undefined) patch.debrief_key_findings = p.debrief_key_findings?.trim() || null;
  if (p.debrief_opportunity_score !== undefined) patch.debrief_opportunity_score = p.debrief_opportunity_score;
  if (p.debrief_recommended_next_stage !== undefined) patch.debrief_recommended_next_stage = p.debrief_recommended_next_stage;
  if (p.debrief_product_opportunity_identified !== undefined)
    patch.debrief_product_opportunity_identified = p.debrief_product_opportunity_identified;
  if (p.follow_up_needed !== undefined) patch.follow_up_needed = p.follow_up_needed;
  if (p.debrief_suggested_next_action !== undefined) patch.debrief_suggested_next_action = p.debrief_suggested_next_action?.trim() || null;
  if (p.debrief_convert_to_product_support_case !== undefined)
    patch.debrief_convert_to_product_support_case = p.debrief_convert_to_product_support_case;
  if (p.case_support_outcome !== undefined) {
    patch.case_support_outcome = p.case_support_outcome?.trim() || null;
  }
  if (p.case_support_provider_reaction !== undefined) {
    patch.case_support_provider_reaction = p.case_support_provider_reaction?.trim() || null;
  }
  if (p.case_support_case_result !== undefined) {
    patch.case_support_case_result = p.case_support_case_result?.trim() || null;
  }
  if (p.case_support_next_step !== undefined) {
    patch.case_support_next_step = p.case_support_next_step?.trim() || null;
  }
  if (p.case_implants_on_site !== undefined) patch.case_implants_on_site = p.case_implants_on_site?.trim() || null;
  if (p.case_trays_sterilization_status !== undefined)
    patch.case_trays_sterilization_status = p.case_trays_sterilization_status?.trim() || null;
  if (p.case_room_assignment !== undefined) patch.case_room_assignment = p.case_room_assignment?.trim() || null;
  if (p.case_support_coverage !== undefined) patch.case_support_coverage = p.case_support_coverage?.trim() || null;
  if (p.case_planned_arrival_time !== undefined)
    patch.case_planned_arrival_time = p.case_planned_arrival_time?.trim() || null;
  if (p.case_product_needs !== undefined) patch.case_product_needs = p.case_product_needs?.trim() || null;
  if (p.case_operational_risks !== undefined) patch.case_operational_risks = p.case_operational_risks?.trim() || null;
  if (p.related_opportunity_id !== undefined) patch.related_opportunity_id = p.related_opportunity_id;
  if (p.status !== undefined) patch.status = p.status;

  const isObservationCase = isSurgicalObservationCase(caseType);
  if (isObservationCase && p.status !== undefined) {
    const nextStatus = String(p.status).toLowerCase();
    const prev = prevStatus.toLowerCase();
    if (
      nextStatus === "confirmed" &&
      (prev === "scheduled" || prev === "rescheduled") &&
      !row.observation_started_at
    ) {
      patch.observation_started_at = patch.updated_at;
    }
    if (nextStatus === "completed" && prev !== "completed") {
      patch.observation_completed_at = patch.updated_at;
    }
  }

  const { data: updated, error: upErr } = await supabaseAdmin
    .from("surgical_sales_cases")
    .update(patch)
    .eq("id", caseId)
    .select("*")
    .single();

  if (upErr || !updated) {
    return NextResponse.json({ ok: false, error: upErr?.message || "Update failed" }, { status: 500 });
  }

  const nextStatus = String((updated as { status?: string }).status ?? prevStatus);
  if (p.status !== undefined && nextStatus !== prevStatus) {
    const log = await logSurgicalCaseActivity({
      caseId,
      userId: uid,
      activityType: "status_change",
      body: `Status changed from ${formatSurgicalCaseStatus(prevStatus)} to ${formatSurgicalCaseStatus(nextStatus)}.`,
      metadataJson: { from_status: prevStatus, to_status: nextStatus, requested_status: p.status },
      previousValues: { status: prevStatus },
      newValues: { status: nextStatus },
      providerId: surgeonId,
      opportunityId: prevRelatedOpportunityId,
    });
    if (!log.ok) {
      return NextResponse.json({ ok: false, error: log.message }, { status: 500 });
    }
  }

  const nextExpected = p.expected_revenue !== undefined ? Number(p.expected_revenue ?? 0) : prevExpected;
  const nextActual =
    patch.actual_revenue !== undefined
      ? patch.actual_revenue == null
        ? null
        : Number(patch.actual_revenue)
      : p.actual_revenue !== undefined
        ? p.actual_revenue == null
          ? null
          : Number(p.actual_revenue)
        : prevActual;

  const revenueChanged =
    (p.expected_revenue !== undefined && nextExpected !== prevExpected) ||
    nextActual !== prevActual;

  if (revenueChanged) {
    const log = await logSurgicalCaseActivity({
      caseId,
      userId: uid,
      activityType: "billing_update",
      body: "Billing amounts were updated.",
      metadataJson: {
        expected_revenue: nextExpected,
        actual_revenue: nextActual,
        previous_expected_revenue: prevExpected,
        previous_actual_revenue: prevActual,
      },
      previousValues: { expected_revenue: prevExpected, actual_revenue: prevActual },
      newValues: { expected_revenue: nextExpected, actual_revenue: nextActual },
    });
    if (!log.ok) {
      return NextResponse.json({ ok: false, error: log.message }, { status: 500 });
    }
  }

  const auditKeys = definedKeys.filter((k) => k !== "status" && k !== "expected_revenue" && k !== "actual_revenue");
  const caseNumber = String((updated as { case_number?: string }).case_number ?? "");
  const patchDiff = buildSurgicalCasePatchAuditDiff({
    prevRow: row as Record<string, unknown>,
    nextRow: updated as Record<string, unknown>,
    touchedKeys: auditKeys,
  });
  const nextRelatedOpportunityIdForActivity = (updated as { related_opportunity_id?: string | null })
    .related_opportunity_id
    ? String((updated as { related_opportunity_id: string }).related_opportunity_id)
    : null;
  const activityOpportunityId =
    p.related_opportunity_id !== undefined ? nextRelatedOpportunityIdForActivity : prevRelatedOpportunityId;
  const activityAccountId = String((updated as { account_id?: string }).account_id ?? nextAccountId);
  const activityProviderId =
    (updated as { surgeon_contact_id?: string | null }).surgeon_contact_id != null
      ? String((updated as { surgeon_contact_id: string }).surgeon_contact_id)
      : surgeonId;

  if (preCallPatch && preCallEngagementPrev) {
    const engagementId = String(preCallEngagementPrev.id);
    const engAfter = await loadEngagementForPortalActor(engagementId, uid);
    if (engAfter) {
      const preCallDiff = pickPreCallPlanAuditDiff({
        previous_values: preCallEngagementPrev,
        new_values: engAfter,
      });
      if (preCallDiff) {
        const preCallLog = await logEngagementPreCallPlanActivityEvents({
          engagementId,
          userId: uid,
          accountId: activityAccountId || null,
          providerId: activityProviderId,
          opportunityId: activityOpportunityId,
          caseId,
          caseNumber: caseNumber || null,
          prevRow: preCallEngagementPrev,
          nextRow: engAfter,
          previousValues: preCallDiff.previous_values,
          newValues: preCallDiff.new_values,
        });
        if (!preCallLog.ok) {
          return NextResponse.json({ ok: false, error: preCallLog.message }, { status: 500 });
        }
      }
    }
  }

  if (patchDiff) {
    const preCallDiff = pickPreCallPlanAuditDiff(patchDiff);
    if (preCallDiff && !preCallPatch) {
      const preCallLog = await logPreCallPlanActivityEvents({
        caseId,
        userId: uid,
        accountId: activityAccountId || null,
        providerId: activityProviderId,
        opportunityId: activityOpportunityId,
        caseNumber: caseNumber || null,
        prevRow: row as Record<string, unknown>,
        nextRow: updated as Record<string, unknown>,
        previousValues: preCallDiff.previous_values,
        newValues: preCallDiff.new_values,
      });
      if (!preCallLog.ok) {
        return NextResponse.json({ ok: false, error: preCallLog.message }, { status: 500 });
      }
    }

    const otherDiff = omitPreCallPlanFromAuditDiff(patchDiff);
    if (otherDiff) {
      const labels = Object.keys(otherDiff.previous_values).join(", ");
      const log = await logSurgicalCaseActivity({
        caseId,
        userId: uid,
        activityType: "case_updated",
        body: `Case details updated (${labels}).`,
        metadataJson: { fields: Object.keys(otherDiff.previous_values) },
        previousValues: otherDiff.previous_values,
        newValues: otherDiff.new_values,
        providerId: activityProviderId,
        opportunityId: activityOpportunityId,
      });
      if (!log.ok) {
        return NextResponse.json({ ok: false, error: log.message }, { status: 500 });
      }
    }
  }

  const finalStatus = String((updated as { status?: string }).status ?? "").toLowerCase();
  const nextRelatedOpportunityId = (updated as { related_opportunity_id?: string | null }).related_opportunity_id
    ? String((updated as { related_opportunity_id: string }).related_opportunity_id)
    : null;
  if (p.related_opportunity_id !== undefined && nextRelatedOpportunityId && nextRelatedOpportunityId !== prevRelatedOpportunityId) {
    const oppRow = await loadOpportunityForViewer(nextRelatedOpportunityId, uid);
    if (oppRow) {
      logAdoptionInitiativeCaseLinked({
        userId: uid,
        snapshot: adoptionInitiativeSnapshotFromRow(oppRow),
        caseId,
        caseLabel: caseNumber || null,
        previousOpportunityId: prevRelatedOpportunityId,
      });
    }
  }

  if (
    p.status !== undefined &&
    finalStatus === "completed" &&
    prevStatus.toLowerCase() !== "completed"
  ) {
    const missing = requiresBilling ? await listMissingBillingDocLabels(caseId) : [];
    if (missing.length > 0) {
      void notifySurgicalCaseMissingDocsAfterCompleted({
        repUserId: uid,
        caseId,
        caseNumber,
        missingLabels: missing,
      });
    }
  }

  const docTypes = await loadDocumentTypesForCase(caseId);
  const warnings =
    finalStatus !== "cancelled" && SURGICAL_STATUSES_PAST_SCHEDULED.has(finalStatus)
      ? buildSurgicalCaseDataWarnings({
          status: finalStatus,
          hasPurchaseOrder: docTypes.has("purchase_order"),
          expectedRevenue: (updated as { expected_revenue?: number | null }).expected_revenue,
          surgeonContactId: (updated as { surgeon_contact_id?: string | null }).surgeon_contact_id,
          requiresBilling,
        })
      : [];

  if (p.notes !== undefined) {
    const noteStr = p.notes === null ? "" : String(p.notes);
    const phiKinds = detectSurgicalPhiPatternKinds(noteStr);
    if (phiKinds.length) {
      void recordSurgicalPhiPatternEvent({
        actorUserId: uid,
        caseId,
        surface: "case_notes_patch",
        kinds: phiKinds,
      });
    }
  }

  if (p.procedure_type !== undefined) {
    const nextProcedure = p.procedure_type?.trim() || null;
    const providerForPersist = nextSurgeon?.trim() || null;
    if (providerForPersist && nextProcedure) {
      void persistProviderProcedureFocusFromCaseEntry({
        providerId: providerForPersist,
        procedureType: nextProcedure,
      });
    }
  }

  const preCallResolved = await resolvePreCallPlanRowForCase(updated as Record<string, unknown>);
  const engagement = preCallResolved.engagementId
    ? await loadEngagementForPortalActor(preCallResolved.engagementId, uid, { includeArchived: true })
    : null;

  return NextResponse.json({
    ok: true,
    case: {
      ...preCallResolved.row,
      case_number: formatSurgicalCaseNumber((updated as { case_number?: string | null }).case_number),
    },
    engagement,
    pre_call_plan_source: preCallResolved.source,
    ...(warnings.length ? { warnings } : {}),
  });
}
