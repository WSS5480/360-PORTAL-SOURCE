import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import { insertSurgicalCaseBundle } from "@/lib/surgical-sales/createSurgicalCase";
import { enrichSurgicalCasesForList, type SurgicalCaseListRow } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { loadDocumentTypesForCase } from "@/lib/surgical-sales/caseDocumentWorkflow";
import { buildSurgicalCaseDataWarnings } from "@/lib/surgical-sales/surgicalCaseIntegrity";
import { surgicalCaseRequiresBillingWorkflow } from "@/lib/surgical-sales/billingReadiness";
import { validateSurgicalCaseLineItems } from "@/lib/surgical-sales/validateSurgicalCaseLineItems";
import { detectSurgicalPhiPatternKinds } from "@/lib/surgical-sales/phiContentHeuristics";
import { recordSurgicalPhiPatternEvent } from "@/lib/surgical-sales/phiWarningLogger";
import { assertProviderLinkedToOrganization } from "@/lib/surgical-sales/crmEntityRelationships";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { pickPreCallPlanPatchFromPayload } from "@/lib/surgical-sales/engagements/engagementPreCallPlan";
import { persistProviderProcedureFocusFromCaseEntry } from "@/lib/surgical-sales/providerProcedureFocusFromCase";
import {
  SURGICAL_CASE_CREATE_STATUSES,
  SurgicalCaseCreateSchema,
} from "@/lib/surgical-sales/surgicalCaseCreateSchema";
import { isCaseDateInThePast } from "@/lib/surgical-sales/casePerformedStatus";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isMissingNewCaseColumnsError(message: string | null | undefined): boolean {
  const m = String(message || "").toLowerCase();
  return (
    m.includes("surgical_sales_cases") &&
    (m.includes("case_type") || m.includes("observation_goal") || m.includes("follow_up_needed") || m.includes("related_opportunity_id")) &&
    m.includes("schema cache")
  );
}

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const fromDate = (url.searchParams.get("from_date") || "").trim();
  const toDate = (url.searchParams.get("to_date") || "").trim();
  const statusRaw = (url.searchParams.get("status") || "").trim();
  const accountId = (url.searchParams.get("account_id") || "").trim();
  const surgeonContactId = (url.searchParams.get("surgeon_contact_id") || "").trim();
  const productId = (url.searchParams.get("product_id") || "").trim();
  const procedure = (url.searchParams.get("procedure") || "").trim();
  const caseScope = (url.searchParams.get("case_scope") || "active").trim().toLowerCase();

  const fullSelect =
    "id, case_number, account_id, surgeon_contact_id, sales_rep_id, case_date, case_time, procedure_type, case_type, observation_goal, observation_key_questions, observation_signals_to_validate, observation_validation_targets, observation_access_scheduling_owner, observation_access_pathway, observation_access_credentialing, follow_up_needed, related_opportunity_id, product_id, status, expected_revenue, notes, case_product_needs, live_observation_product_fit, live_observation_competitors, live_observation_staff_process, observation_quick_finding_product_interest, debrief_key_findings, case_implants_on_site, case_trays_sterilization_status, case_support_coverage, case_support_outcome, case_operational_risks, created_at, updated_at, billing_reviewed_at, billing_reviewed_by_user_id, billing_admin_notes, archived_at";
  const legacySelect =
    "id, case_number, account_id, surgeon_contact_id, sales_rep_id, case_date, case_time, procedure_type, product_id, status, expected_revenue, notes, created_at, updated_at, billing_reviewed_at, billing_reviewed_by_user_id, billing_admin_notes, archived_at";
  let q = supabaseAdmin.from("surgical_sales_cases").select(fullSelect);

  if (caseScope === "archived") {
    q = q.not("archived_at", "is", null);
  } else if (caseScope !== "all") {
    q = q.is("archived_at", null);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
    q = q.gte("case_date", fromDate);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    q = q.lte("case_date", toDate);
  }
  if (UUID_RE.test(accountId)) {
    q = q.eq("account_id", accountId);
  }
  if (UUID_RE.test(surgeonContactId)) {
    q = q.eq("surgeon_contact_id", surgeonContactId);
  }
  if (UUID_RE.test(productId)) {
    q = q.eq("product_id", productId);
  }
  if (procedure) {
    q = q.ilike("procedure_type", `%${escapeIlike(procedure)}%`);
  }
  if (statusRaw) {
    const parts = statusRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => (SURGICAL_CASE_CREATE_STATUSES as readonly string[]).includes(s));
    if (parts.length === 1) {
      q = q.eq("status", parts[0]!);
    } else if (parts.length > 1) {
      q = q.in("status", parts);
    }
  }

  q = q.order("case_date", { ascending: false }).limit(500);

  const initialRes = await q;
  let data = (initialRes.data ?? null) as Record<string, unknown>[] | null;
  let error = initialRes.error;
  if (error && isMissingNewCaseColumnsError(error.message)) {
    let qLegacy = supabaseAdmin.from("surgical_sales_cases").select(legacySelect);
    if (caseScope === "archived") qLegacy = qLegacy.not("archived_at", "is", null);
    else if (caseScope !== "all") qLegacy = qLegacy.is("archived_at", null);
    if (/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) qLegacy = qLegacy.gte("case_date", fromDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(toDate)) qLegacy = qLegacy.lte("case_date", toDate);
    if (UUID_RE.test(accountId)) qLegacy = qLegacy.eq("account_id", accountId);
    if (UUID_RE.test(surgeonContactId)) qLegacy = qLegacy.eq("surgeon_contact_id", surgeonContactId);
    if (UUID_RE.test(productId)) qLegacy = qLegacy.eq("product_id", productId);
    if (procedure) qLegacy = qLegacy.ilike("procedure_type", `%${escapeIlike(procedure)}%`);
    if (statusRaw) {
      const parts = statusRaw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => (SURGICAL_CASE_CREATE_STATUSES as readonly string[]).includes(s));
      if (parts.length === 1) qLegacy = qLegacy.eq("status", parts[0]!);
      else if (parts.length > 1) qLegacy = qLegacy.in("status", parts);
    }
    const legacyRes = await qLegacy.order("case_date", { ascending: false }).limit(500);
    data = (legacyRes.data ?? null) as Record<string, unknown>[] | null;
    error = legacyRes.error;
  }

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data || []) as SurgicalCaseListRow[];
  const cases = await enrichSurgicalCasesForList(rows);

  return NextResponse.json({ ok: true, cases });
}

export async function POST(req: Request) {
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
  const parsed = SurgicalCaseCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;
  const canUseAccount = await repCanViewSurgicalAccount(uid, p.account_id);
  if (!canUseAccount) {
    return NextResponse.json({ ok: false, error: "Account not available for this user" }, { status: 403 });
  }

  const surgeonId = p.surgeon_contact_id ?? null;
  const engagementId = p.engagement_id?.trim() || null;
  if (engagementId) {
    const engagement = await loadEngagementForPortalActor(engagementId, uid);
    if (!engagement) {
      return NextResponse.json({ ok: false, error: "Engagement not found" }, { status: 404 });
    }
    if (engagement.case_id) {
      return NextResponse.json({ ok: false, error: "Engagement already has a linked case" }, { status: 400 });
    }
    const engProviderId = String(engagement.provider_id ?? "");
    const engOrgId = engagement.organization_id ? String(engagement.organization_id) : null;
    if (surgeonId && surgeonId !== engProviderId) {
      return NextResponse.json({ ok: false, error: "Surgeon must match the engagement provider" }, { status: 400 });
    }
    if (engOrgId && p.account_id !== engOrgId) {
      return NextResponse.json({ ok: false, error: "Organization must match the engagement" }, { status: 400 });
    }
    const preCallOnPayload = pickPreCallPlanPatchFromPayload(p as Record<string, unknown>);
    if (preCallOnPayload && Object.keys(preCallOnPayload).length > 0) {
      return NextResponse.json(
        { ok: false, error: "Pre-Call Plan is owned by the engagement; do not send pre-call fields on the case." },
        { status: 400 },
      );
    }
  }
  if (surgeonId) {
    const providerErr = await assertProviderLinkedToOrganization(surgeonId, p.account_id);
    if (providerErr) {
      return NextResponse.json({ ok: false, error: providerErr }, { status: 400 });
    }
  }

  const lines =
    p.line_items && p.line_items.length > 0
      ? p.line_items.map((l) => ({
          product_id: l.product_id,
          sku_id: l.sku_id,
          expected_quantity: l.expected_quantity,
        }))
      : p.product_id && p.sku_id && p.expected_quantity != null
        ? [
          {
            product_id: p.product_id,
            sku_id: p.sku_id!,
            expected_quantity: p.expected_quantity!,
          },
          ]
        : [];

  if (lines.length > 0) {
    const lineCheck = await validateSurgicalCaseLineItems(lines);
    if (!lineCheck.ok) {
      return NextResponse.json({ ok: false, error: lineCheck.error }, { status: 400 });
    }
  }

  let effectiveSurgeonId = surgeonId;
  if (engagementId && !effectiveSurgeonId) {
    const engagement = await loadEngagementForPortalActor(engagementId, uid);
    effectiveSurgeonId = engagement?.provider_id ? String(engagement.provider_id) : null;
  }

  const caseType = p.case_type ?? "product_support";
  let status = p.status ?? "scheduled";
  if (status === "scheduled" && isCaseDateInThePast(p.case_date)) {
    status = "completed";
  }
  if (status !== "draft" && !effectiveSurgeonId) {
    return NextResponse.json(
      { ok: false, error: "Select a provider so this case appears on their Cases tab." },
      { status: 400 },
    );
  }
  const caseTime = p.case_time && String(p.case_time).trim() ? String(p.case_time).trim() : null;
  const revenue = p.expected_revenue != null && p.expected_revenue !== undefined ? p.expected_revenue : 0;

  const bundle = await insertSurgicalCaseBundle(
    {
      account_id: p.account_id,
      surgeon_contact_id: effectiveSurgeonId,
      sales_rep_id: uid,
      case_date: p.case_date,
      case_time: caseTime,
      procedure_type: p.procedure_type?.trim() || null,
      case_type: caseType,
      observation_goal: p.observation_goal?.trim() || null,
      observation_key_questions: p.observation_key_questions?.trim() || null,
      observation_signals_to_validate: p.observation_signals_to_validate?.trim() || null,
      observation_access: p.observation_access
        ? {
            scheduling_owner: p.observation_access.scheduling_owner?.trim() || null,
            access_pathway: p.observation_access.access_pathway?.trim() || null,
            credentialing_requirement: p.observation_access.credentialing_requirement ?? "unknown",
            vendor_restrictions: p.observation_access.vendor_restrictions?.trim() || null,
            preferred_timing: p.observation_access.preferred_timing?.trim() || null,
          }
        : null,
      observation_validation_targets: p.observation_validation_targets ?? [],
      pre_call_hospital_name: p.pre_call_hospital_name?.trim() || null,
      pre_call_surgeon_name: p.pre_call_surgeon_name?.trim() || null,
      pre_observation_impact_opening_statement: p.pre_observation_impact_opening_statement?.trim() || null,
      pre_observation_probes: p.pre_observation_probes?.trim() || null,
      pre_observation_tools_resources: p.pre_observation_tools_resources?.trim() || null,
      pre_observation_value_hypothesis: p.pre_observation_value_hypothesis?.trim() || null,
      pre_observation_planned_close: p.pre_observation_planned_close?.trim() || null,
      pre_observation_additional_notes: p.pre_observation_additional_notes?.trim() || null,
      follow_up_needed: Boolean(p.follow_up_needed),
      related_opportunity_id: p.related_opportunity_id ?? null,
      product_id: p.product_id ?? null,
      status,
      expected_revenue: revenue,
      notes: p.notes?.trim() || null,
      sku_id: lines[0]?.sku_id ?? null,
      expected_quantity: lines[0]?.expected_quantity ?? null,
      line_items: p.line_items && p.line_items.length > 0 ? lines : null,
      engagement_id: engagementId,
      case_support_coverage:
        typeof p.case_support_coverage === "string" ? p.case_support_coverage.trim() || null : null,
      case_product_needs:
        typeof p.case_product_needs === "string" ? p.case_product_needs.trim() || null : null,
    },
    uid
  );

  if (!bundle.ok) {
    return NextResponse.json({ ok: false, error: bundle.message }, { status: 500 });
  }

  const savedProcedureType = p.procedure_type?.trim() || null;
  if (effectiveSurgeonId && savedProcedureType) {
    void persistProviderProcedureFocusFromCaseEntry({
      providerId: effectiveSurgeonId,
      procedureType: savedProcedureType,
    });
  }

  const noteStr = p.notes?.trim() ? String(p.notes).trim() : "";
  const phiKinds = detectSurgicalPhiPatternKinds(noteStr);
  if (phiKinds.length) {
    void recordSurgicalPhiPatternEvent({
      actorUserId: uid,
      caseId: bundle.caseId,
      surface: "case_create_notes",
      kinds: phiKinds,
    });
  }

  const docTypes = await loadDocumentTypesForCase(bundle.caseId);
  const warnings = buildSurgicalCaseDataWarnings({
    status,
    hasPurchaseOrder: docTypes.has("purchase_order"),
    expectedRevenue: revenue,
    surgeonContactId: surgeonId,
    requiresBilling: surgicalCaseRequiresBillingWorkflow({
      caseType,
      productId: p.product_id ?? null,
      productLineCount: lines.length,
    }),
  });

  return NextResponse.json({
    ok: true,
    case: { id: bundle.caseId, case_number: bundle.caseNumber },
    ...(warnings.length ? { warnings } : {}),
  });
}
