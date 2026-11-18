import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { buildPrepareForMeetingView } from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import { markEngagementPrepared } from "@/lib/surgical-sales/engagements/markEngagementPrepared";
import { countWorkflowFieldsFilled } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { resolveEngagementWorkflowMode } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import { listClinicalDiscoveryAnswersForProvider } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { loadPrepareForMeetingGlanceMetrics } from "@/lib/surgical-sales/engagements/prepareForMeetingGlanceMetrics";
import { loadPrepareForMeetingRecentActivity } from "@/lib/surgical-sales/engagements/prepareForMeetingRecentActivity";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(_req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
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

  const engagement = await loadEngagementForPortalActor(engagementId, uid, { includeArchived: true });
  if (!engagement) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const marked = await markEngagementPrepared({
    engagementId,
    userId: uid,
    engagement,
    context: {
      providerId: engagement.provider_id ? String(engagement.provider_id) : null,
      organizationId: engagement.organization_id ? String(engagement.organization_id) : null,
      opportunityId: engagement.opportunity_id ? String(engagement.opportunity_id) : null,
      caseId: engagement.case_id ? String(engagement.case_id) : null,
    },
  });

  if (!marked.ok) {
    return NextResponse.json({ ok: false, error: marked.message }, { status: 500 });
  }

  const providerId = String(engagement.provider_id);
  const orgId = engagement.organization_id ? String(engagement.organization_id) : null;
  const opportunityId = engagement.opportunity_id ? String(engagement.opportunity_id) : null;

  const [providerRes, providerLinkRes, orgRes, oppRes, actsRes, clinicalAnswers, lastPriorRes] =
    await Promise.all([
      supabaseAdmin.from("surgical_sales_contacts").select("*").eq("id", providerId).maybeSingle(),
      supabaseAdmin
        .from("surgical_sales_contact_organizations")
        .select("specialty, influence_level, preferred_hospital")
        .eq("contact_id", providerId)
        .eq("is_active", true)
        .order("is_primary_org", { ascending: false })
        .limit(1)
        .maybeSingle(),
      orgId
        ? supabaseAdmin
            .from(SALES_ORGANIZATIONS_TABLE)
            .select("id, name, surgical_crm_billing_city, surgical_crm_billing_state")
            .eq("id", orgId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      opportunityId
        ? supabaseAdmin
            .from("sales_opportunities")
            .select("id, account_name, physician_name, stage, product_line")
            .eq("id", opportunityId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from("surgical_sales_engagement_activities")
        .select("id, user_id, activity_type, body, metadata_json, created_at")
        .eq("engagement_id", engagementId)
        .order("created_at", { ascending: false })
        .limit(30),
      listClinicalDiscoveryAnswersForProvider(supabaseAdmin, providerId).catch(() => []),
      supabaseAdmin
        .from("surgical_sales_engagements")
        .select("id, title, engagement_type, engagement_date, scheduled_at, status")
        .eq("provider_id", providerId)
        .is("archived_at", null)
        .neq("id", engagementId)
        .order("engagement_date", { ascending: false, nullsFirst: false })
        .order("scheduled_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const providerRow = providerRes.data
    ? {
        ...providerRes.data,
        display_name: contactDisplayName(providerRes.data as Parameters<typeof contactDisplayName>[0]),
      }
    : null;

  const workflowMode = resolveEngagementWorkflowMode(
    String(engagement.engagement_type ?? ""),
    (engagement.engagement_workflow_mode as "strategic" | "lightweight" | null) ?? null,
  );
  const draftKeys = [
    "engagement_purpose",
    "next_action",
    "follow_up_tasks",
    "sim_lab_focus",
    "products_to_demonstrate",
    "attendees",
    "hands_on_goals",
    "adoption_signals_to_watch",
    "observation_goal",
    "pre_call_hospital_name",
    "pre_call_surgeon_name",
    "pre_observation_impact_opening_statement",
    "pre_observation_probes",
    "pre_observation_tools_resources",
    "pre_observation_value_hypothesis",
    "pre_observation_planned_close",
    "pre_observation_additional_notes",
  ];
  const draft: Record<string, string> = {};
  for (const k of draftKeys) draft[k] = String(engagement[k] ?? "").trim();
  const planProgress = countWorkflowFieldsFilled(
    draft,
    workflowMode,
    String(engagement.engagement_type ?? ""),
  );

  const [glanceMetrics, recentActivity] = await Promise.all([
    loadPrepareForMeetingGlanceMetrics(supabaseAdmin, {
      providerId,
      salesRepId: uid,
      linkedOpportunity: oppRes.data
        ? {
            id: String((oppRes.data as { id: string }).id),
            product_line: (oppRes.data as { product_line?: string | null }).product_line,
            stage: (oppRes.data as { stage?: string | null }).stage,
          }
        : null,
    }),
    loadPrepareForMeetingRecentActivity(supabaseAdmin, {
      providerId,
      salesRepId: uid,
    }),
  ]);

  const { data: refreshedRow } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("*")
    .eq("id", engagementId)
    .maybeSingle();

  const prepare = buildPrepareForMeetingView({
    engagement: (refreshedRow ?? {
      ...engagement,
      prepared_at: marked.preparation.prepared_at,
      prepare_checklist_json: { completed_at: marked.preparation.prepared_at },
    }) as Record<string, unknown>,
    provider: providerRow as Record<string, unknown> | null,
    providerSpecialty: providerLinkRes.data?.specialty ? String(providerLinkRes.data.specialty) : null,
    providerOrgLink: providerLinkRes.data
      ? {
          influence_level: providerLinkRes.data.influence_level
            ? String(providerLinkRes.data.influence_level)
            : null,
          preferred_hospital: providerLinkRes.data.preferred_hospital
            ? String(providerLinkRes.data.preferred_hospital)
            : null,
        }
      : null,
    organization: orgRes.data as { id?: string; name?: string } | null,
    organizationLocation: orgRes.data
      ? {
          city: (orgRes.data as { surgical_crm_billing_city?: string | null }).surgical_crm_billing_city,
          state: (orgRes.data as { surgical_crm_billing_state?: string | null }).surgical_crm_billing_state,
        }
      : null,
    lastPriorEngagement: lastPriorRes.data
      ? {
          id: String(lastPriorRes.data.id),
          title: lastPriorRes.data.title ? String(lastPriorRes.data.title) : null,
          engagement_type: lastPriorRes.data.engagement_type
            ? String(lastPriorRes.data.engagement_type)
            : null,
          engagement_date: lastPriorRes.data.engagement_date
            ? String(lastPriorRes.data.engagement_date)
            : null,
          scheduled_at: lastPriorRes.data.scheduled_at
            ? String(lastPriorRes.data.scheduled_at)
            : null,
        }
      : null,
    opportunity: oppRes.data as {
      id?: string;
      account_name?: string;
      physician_name?: string | null;
      stage?: string;
      product_line?: string | null;
    } | null,
    activities: (actsRes.data || []) as Array<{
      id: string;
      activity_type?: string | null;
      body?: string | null;
      created_at?: string | null;
      metadata_json?: Record<string, unknown> | null;
    }>,
    clinicalDiscoveryAnswers: clinicalAnswers,
    planProgress,
    glanceMetrics,
    recentActivity,
  });

  return NextResponse.json({
    ok: true,
    already_prepared: marked.alreadyPrepared,
    preparation: marked.preparation,
    prepare,
  });
}
