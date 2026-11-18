import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { assertProviderLinkedToOrganization } from "@/lib/surgical-sales/crmEntityRelationships";
import { insertEngagement } from "@/lib/surgical-sales/engagements/createEngagement";
import {
  ENGAGEMENT_PLANNING_MODES,
  ENGAGEMENT_PLANNING_STATUSES,
  isEngagementPlanningMode,
  isEngagementPlanningStatus,
  resolvePlanningStatusOnCreate,
} from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import { ENGAGEMENT_TYPES } from "@/lib/surgical-sales/engagements/engagementTypes";
import { pickPreCallPlanPatchFromPayload } from "@/lib/surgical-sales/engagements/engagementPreCallPlan";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  adoptionInitiativeSnapshotFromRow,
  logAdoptionInitiativeEngagementLinked,
} from "@/lib/activity/adoptionInitiativeActivity";
import { loadOpportunityForViewer } from "@/lib/sales/opportunityAccess";
import {
  logEngagementCreatedActivity,
  logEngagementPreCallPlanActivityEvents,
} from "@/lib/surgical-sales/engagements/engagementActivityLog";
import {
  emptyEngagementBasicsDraft,
  resolveEngagementStatusOnCreate,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { buildEngagementWorkflowDraftFromRow } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { pickPrimaryOrgLink } from "@/lib/surgical-sales/providerDirectory";
import { mapEngagementRowForProviderProfile } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

export const dynamic = "force-dynamic";

const EngagementWorkflowModeSchema = z.enum(["strategic", "lightweight"]);

const CreateEngagementSchema = z
  .object({
    save_mode: z.enum(["draft", "final"]).optional(),
    mark_outcome_recorded: z.boolean().optional(),
    engagement_type: z.enum(ENGAGEMENT_TYPES),
    engagement_workflow_mode: EngagementWorkflowModeSchema.optional().nullable(),
    status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
    title: z.string().max(200).optional().nullable(),
    provider_id: z.string().uuid(),
    organization_id: z.string().uuid().optional().nullable(),
    opportunity_id: z.string().uuid().optional().nullable(),
    case_id: z.string().uuid().optional().nullable(),
    scheduled_at: z.string().datetime({ offset: true }).optional().nullable(),
    engagement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    notes: z.string().max(8000).optional().nullable(),
    engagement_purpose: z.string().max(2000).optional().nullable(),
    next_action: z.string().max(2000).optional().nullable(),
    follow_up_tasks: z.string().max(4000).optional().nullable(),
    sim_lab_focus: z.string().max(4000).optional().nullable(),
    products_to_demonstrate: z.string().max(4000).optional().nullable(),
    attendees: z.string().max(4000).optional().nullable(),
    hands_on_goals: z.string().max(4000).optional().nullable(),
    adoption_signals_to_watch: z.string().max(4000).optional().nullable(),
    observation_goal: z.string().max(1200).optional().nullable(),
    pre_call_hospital_name: z.string().max(400).optional().nullable(),
    pre_call_surgeon_name: z.string().max(400).optional().nullable(),
    pre_observation_impact_opening_statement: z.string().max(4000).optional().nullable(),
    pre_observation_probes: z.string().max(8000).optional().nullable(),
    pre_observation_tools_resources: z.string().max(8000).optional().nullable(),
    pre_observation_value_hypothesis: z.string().max(8000).optional().nullable(),
    pre_observation_planned_close: z.string().max(8000).optional().nullable(),
    pre_observation_additional_notes: z.string().max(8000).optional().nullable(),
    pre_call_plan_template_id: z.string().uuid().optional().nullable(),
    planning_mode: z.enum(ENGAGEMENT_PLANNING_MODES).optional(),
    planning_status: z.enum(ENGAGEMENT_PLANNING_STATUSES).optional(),
    /** @deprecated Use planning_status */
    briefing_status: z.enum(ENGAGEMENT_PLANNING_STATUSES).optional(),
    engagement_category: z
      .enum(["observation_discovery", "product_evaluation", "relationship_management"])
      .optional()
      .nullable(),
    briefing_id: z.string().uuid().optional().nullable(),
    source_observation_id: z.string().uuid().optional().nullable(),
    product_focus: z.string().max(400).optional().nullable(),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  })
  .strict();

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const providerId = url.searchParams.get("provider_id");
  const organizationId = url.searchParams.get("organization_id");

  let q = supabaseAdmin
    .from("surgical_sales_engagements")
    .select(
      `id, engagement_type, status, title, provider_id, organization_id, opportunity_id, case_id, sales_rep_id,
      scheduled_at, engagement_date, observation_goal, notes, updated_at, created_at, archived_at,
      debrief_completed, debrief_completed_at, prepared_at, planning_status, planning_mode, briefing_id,
      pre_call_hospital_name, pre_call_surgeon_name,
      pre_observation_impact_opening_statement, pre_observation_probes, pre_observation_tools_resources,
      pre_observation_value_hypothesis, pre_observation_planned_close, pre_observation_additional_notes`,
    )
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (providerId) q = q.eq("provider_id", providerId);
  if (organizationId) q = q.eq("organization_id", organizationId);

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const providerIds = [...new Set((rows || []).map((r) => String((r as { provider_id: string }).provider_id)))];
  const orgIds = [...new Set((rows || []).map((r) => String((r as { organization_id?: string }).organization_id || "")).filter(Boolean))];

  const providerBy = new Map<string, string>();
  if (providerIds.length > 0) {
    const { data: contacts } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("id, first_name, last_name, email")
      .in("id", providerIds);
    for (const c of contacts || []) {
      providerBy.set(String((c as { id: string }).id), contactDisplayName(c as Parameters<typeof contactDisplayName>[0]));
    }
  }

  const orgBy = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: accounts } = await supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").in("id", orgIds);
    for (const a of accounts || []) {
      orgBy.set(String((a as { id: string }).id), String((a as { name?: string }).name ?? ""));
    }
  }

  const caseBy = new Map<string, string>();
  const oppBy = new Map<string, string>();

  const engagements = (rows || []).map((r) => {
    const row = r as Record<string, unknown>;
    const pid = String(row.provider_id ?? "");
    const oid = row.organization_id ? String(row.organization_id) : "";
    const mapped = mapEngagementRowForProviderProfile(row, orgBy, caseBy, oppBy);
    return {
      ...mapped,
      provider_id: pid,
      provider_label: providerBy.get(pid) ?? "Provider",
      organization_label: oid ? orgBy.get(oid) ?? "" : null,
    };
  });

  return NextResponse.json({ ok: true, engagements });
}

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

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });

  const parsed = CreateEngagementSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;

  let organizationId = p.organization_id ?? null;
  if (!organizationId) {
    const { data: orgLinks } = await supabaseAdmin
      .from("surgical_sales_contact_organizations")
      .select("account_id, is_primary_org, is_active, accounts:sales_organizations!account_id(id)")
      .eq("contact_id", p.provider_id)
      .order("is_primary_org", { ascending: false })
      .limit(20);
    const primary = pickPrimaryOrgLink((orgLinks || []) as never);
    const primaryId = String(primary?.account_id || (primary?.accounts as { id?: string } | null)?.id || "").trim();
    if (primaryId) organizationId = primaryId;
  }

  if (organizationId) {
    const ok = await repCanViewSurgicalAccount(uid, organizationId);
    if (!ok) return NextResponse.json({ ok: false, error: "Organization not available" }, { status: 403 });
    const linkErr = await assertProviderLinkedToOrganization(p.provider_id, organizationId);
    if (linkErr) return NextResponse.json({ ok: false, error: linkErr }, { status: 400 });
  }

  const isLightweightCreate =
    isEngagementPlanningMode(p.planning_mode) && p.planning_mode === "quick_add";

  const preCallPatch = isLightweightCreate
    ? null
    : pickPreCallPlanPatchFromPayload(p as Record<string, unknown>);
  const preCallDraft: Record<string, string> = {};
  if (preCallPatch) {
    for (const [k, v] of Object.entries(preCallPatch)) {
      preCallDraft[k] = v ?? "";
    }
  }

  const preCallDraftRecord = (
    preCallPatch
      ? Object.fromEntries(Object.entries(preCallPatch).map(([k, v]) => [k, v ?? ""]))
      : {}
  ) as Record<PreCallPlanFieldKey, string>;

  const workflowDraft = buildEngagementWorkflowDraftFromRow(
    p as Record<string, unknown>,
    p.engagement_type,
    p.engagement_workflow_mode,
  );

  const resolvedStatus =
    p.status ??
    resolveEngagementStatusOnCreate({
      save_mode: p.save_mode ?? "final",
      mark_outcome_recorded: p.mark_outcome_recorded,
      basics: {
        ...emptyEngagementBasicsDraft(),
        provider_id: p.provider_id,
        organization_id: organizationId ?? "",
        engagement_type: p.engagement_type,
        engagement_date: p.engagement_date ?? "",
        opportunity_id: p.opportunity_id ?? "",
        case_id: p.case_id ?? "",
        product_line: String((p as { product_line?: string }).product_line ?? "").trim(),
      },
      workflowDraft,
      workflowModeOverride: p.engagement_workflow_mode,
    });

  const createRow = {
    ...(p as Record<string, unknown>),
    ...(preCallPatch ?? {}),
    prepared_at: null,
  };

  const explicitPlanningStatus = isEngagementPlanningStatus(p.planning_status)
    ? p.planning_status
    : isEngagementPlanningStatus(p.briefing_status)
      ? p.briefing_status
      : null;

  const planningMode = isEngagementPlanningMode(p.planning_mode)
    ? p.planning_mode
    : explicitPlanningStatus === "not_planned" ||
        p.briefing_status === "not_planned" ||
        p.planning_status === "not_planned"
      ? "quick_add"
      : "plan_first";

  const planningStatus =
    explicitPlanningStatus ??
    resolvePlanningStatusOnCreate({
      planningMode,
      engagementRow: createRow,
    });

  const scheduledDate = p.scheduled_date ?? p.engagement_date ?? null;

  const workflowExtras: Record<string, string | null> = {
    engagement_workflow_mode: p.engagement_workflow_mode ?? null,
    engagement_purpose: p.engagement_purpose ?? null,
    next_action: p.next_action ?? null,
    follow_up_tasks: p.follow_up_tasks ?? null,
    sim_lab_focus: p.sim_lab_focus ?? null,
    products_to_demonstrate: p.products_to_demonstrate ?? null,
    attendees: p.attendees ?? null,
    hands_on_goals: p.hands_on_goals ?? null,
    adoption_signals_to_watch: p.adoption_signals_to_watch ?? null,
  };

  const created = await insertEngagement({
    engagement_type: p.engagement_type,
    status: resolvedStatus,
    title: p.title,
    provider_id: p.provider_id,
    organization_id: organizationId,
    opportunity_id: p.opportunity_id,
    case_id: p.case_id,
    sales_rep_id: uid,
    scheduled_at: p.scheduled_at,
    engagement_date: p.engagement_date ?? scheduledDate,
    scheduled_date: scheduledDate,
    notes: p.notes,
    product_focus: p.product_focus,
    engagement_category: p.engagement_category,
    planning_mode: planningMode,
    planning_status: planningStatus,
    briefing_id: p.briefing_id,
    source_observation_id: p.source_observation_id,
    preCallDraft: Object.keys(preCallDraft).length > 0 ? preCallDraft : undefined,
    preCallPlanTemplateId: p.pre_call_plan_template_id ?? null,
    workflowExtras,
  });

  if (!created.ok) {
    return NextResponse.json({ ok: false, error: created.message }, { status: 500 });
  }

  const { data: engagement } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("*")
    .eq("id", created.engagementId)
    .single();

  if (engagement) {
    const engRow = engagement as Record<string, unknown>;
    const activityCtx = {
      providerId: String(engRow.provider_id ?? p.provider_id),
      organizationId: engRow.organization_id ? String(engRow.organization_id) : null,
      opportunityId: engRow.opportunity_id ? String(engRow.opportunity_id) : null,
      caseId: engRow.case_id ? String(engRow.case_id) : null,
    };
    const createdLog = await logEngagementCreatedActivity({
      engagementId: created.engagementId,
      userId: uid,
      engagementType: p.engagement_type,
      context: activityCtx,
      title: p.title,
    });
    if (!createdLog.ok) {
      return NextResponse.json({ ok: false, error: createdLog.message }, { status: 500 });
    }

    if (activityCtx.opportunityId) {
      const oppRow = await loadOpportunityForViewer(activityCtx.opportunityId, uid);
      if (oppRow) {
        const engagementLabel =
          p.title?.trim() ||
          formatEngagementType(p.engagement_type) ||
          String(engRow.title || "").trim() ||
          null;
        logAdoptionInitiativeEngagementLinked({
          userId: uid,
          snapshot: adoptionInitiativeSnapshotFromRow(oppRow),
          engagementId: created.engagementId,
          engagementLabel,
        });
      }
    }

    const preCallPatchForActivity = isLightweightCreate
      ? null
      : pickPreCallPlanPatchFromPayload(p as Record<string, unknown>);
    if (preCallPatchForActivity && Object.keys(preCallPatchForActivity).length > 0) {
      const previous_values: Record<string, unknown> = {};
      const new_values: Record<string, unknown> = {};
      for (const key of Object.keys(preCallPatchForActivity)) {
        previous_values[key] = null;
        new_values[key] = preCallPatchForActivity[key] ?? null;
      }
      const preCallLog = await logEngagementPreCallPlanActivityEvents({
        engagementId: created.engagementId,
        userId: uid,
        accountId: activityCtx.organizationId,
        providerId: activityCtx.providerId,
        opportunityId: activityCtx.opportunityId,
        caseId: activityCtx.caseId,
        prevRow: {},
        nextRow: { ...engRow, ...preCallPatchForActivity },
        previousValues: previous_values,
        newValues: new_values,
      });
      if (!preCallLog.ok) {
        return NextResponse.json({ ok: false, error: preCallLog.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true, engagement_id: created.engagementId, engagement });
}
