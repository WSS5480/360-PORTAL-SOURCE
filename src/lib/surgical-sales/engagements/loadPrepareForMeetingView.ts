import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  buildPrepareForMeetingView,
  type PrepareForMeetingView,
} from "@/lib/surgical-sales/engagements/buildPrepareForMeetingView";
import { countWorkflowFieldsFilled } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { resolveEngagementWorkflowMode } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import { listClinicalDiscoveryAnswersForProvider } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import { formatProviderActivityType } from "@/lib/surgical-sales/providerActivityLabels";
import { loadPrepareForMeetingGlanceMetrics } from "@/lib/surgical-sales/engagements/prepareForMeetingGlanceMetrics";
import { loadPrepareForMeetingRecentActivity } from "@/lib/surgical-sales/engagements/prepareForMeetingRecentActivity";
import { loadPrepareProviderSupportContactsSummary } from "@/lib/surgical-sales/engagements/loadPrepareProviderSupportContacts";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { loadProviderDebriefPlanForEngagement } from "@/lib/surgical-sales/engagements/loadProviderDebriefPlanForEngagement";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import { resolveDebriefExecutionGuide } from "@/lib/surgical-sales/engagements/resolveDebriefExecutionGuide";

export async function loadPrepareForMeetingViewForActor(
  engagementId: string,
  userId: string,
): Promise<
  | { ok: true; prepare: PrepareForMeetingView; engagement: Record<string, unknown> }
  | { ok: false; error: string; status: 404 | 500 }
> {
  const engagement = await loadEngagementForPortalActor(engagementId, userId, {
    includeArchived: true,
  });
  if (!engagement) {
    return { ok: false, error: "Not found", status: 404 };
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

  let providerTimeline: Array<{
    id: string;
    at?: string | null;
    title?: string;
    body?: string;
    href?: string | null;
  }> = [];
  try {
    const { data: providerActs } = await supabaseAdmin
      .from("surgical_sales_provider_activities")
      .select("id, activity_type, body, metadata_json, created_at")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false })
      .limit(12);
    providerTimeline = (providerActs || []).map((a) => {
      const meta = (a.metadata_json || {}) as Record<string, unknown>;
      return {
        id: String(a.id),
        at: a.created_at,
        title: formatProviderActivityType(String(a.activity_type || "")),
        body: String(meta.question_label || a.body || ""),
        href: `/portal/sales/providers/${encodeURIComponent(providerId)}`,
      };
    });
  } catch {
    providerTimeline = [];
  }

  const [glanceMetrics, recentActivity, providerDebriefBriefing, supportContactsSummary, debriefExecutionGuideResult] =
    await Promise.all([
    loadPrepareForMeetingGlanceMetrics(supabaseAdmin, {
      providerId,
      salesRepId: userId,
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
      salesRepId: userId,
    }),
    loadProviderDebriefPlanForEngagement(supabaseAdmin, {
      engagement,
      engagementId,
      provider: providerRow as Record<string, unknown> | null,
      organization: orgRes.data as { name?: string } | null,
    }),
    loadPrepareProviderSupportContactsSummary(supabaseAdmin, providerId),
    isProviderDebriefEngagement(String(engagement.engagement_type ?? ""))
      ? resolveDebriefExecutionGuide({
          engagement: engagement as Record<string, unknown>,
          engagementId,
          userId,
        })
      : Promise.resolve({ ok: false as const, message: "Not a debrief", status: 400 as const }),
  ]);

  const debriefExecutionGuide =
    debriefExecutionGuideResult.ok === true ? debriefExecutionGuideResult.guide : null;

  const prepare = buildPrepareForMeetingView({
    engagement,
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
    providerTimeline,
    clinicalDiscoveryAnswers: clinicalAnswers,
    planProgress,
    glanceMetrics,
    recentActivity,
    providerDebriefBriefing: {
      is_provider_debrief: isProviderDebriefEngagement(String(engagement.engagement_type ?? "")),
      plan_mode: providerDebriefBriefing.plan_mode,
      completed_observation_count: providerDebriefBriefing.completed_observation_count,
      plan: providerDebriefBriefing.plan,
      linked_case_id: providerDebriefBriefing.linkedCaseId,
      linked_case_href: providerDebriefBriefing.linkedCaseHref,
      missing_case_message: providerDebriefBriefing.missing_case_message,
    },
    debriefExecutionGuide,
    supportContactsSummary,
  });

  return { ok: true, prepare, engagement };
}
