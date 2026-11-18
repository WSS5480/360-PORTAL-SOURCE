import type { SupabaseClient } from "@supabase/supabase-js";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import { mergeProviderEngagementsWithLegacyDraft } from "@/lib/surgical-sales/legacyPreCallPlanMigration";
import {
  mapEngagementRowForProviderProfile,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { reconcileProviderObservationApprovalFromEngagements } from "@/lib/surgical-sales/engagements/observationApprovalFromEngagements";

type EngagementRow = Record<string, unknown> & {
  organization?: { id?: string; name?: string | null } | null;
};

function organizationNameFromRow(
  row: EngagementRow,
  orgBy: Map<string, string>,
  fallbackName: string | null,
): string | null {
  const orgId = row.organization_id ? String(row.organization_id) : null;
  const joined = row.organization?.name ? String(row.organization.name).trim() : "";
  if (joined) return joined;
  if (orgId) {
    const mapped = orgBy.get(orgId);
    if (mapped?.trim()) return mapped.trim();
  }
  return fallbackName?.trim() || null;
}

/**
 * Loads engagements for a provider profile with organization names resolved.
 */
export async function loadProviderEngagementsForProfile(
  supabase: SupabaseClient,
  opts: {
    providerId: string;
    salesRepId: string;
    contact: Record<string, unknown>;
    actorName?: string;
    primaryOrganizationName?: string | null;
    primaryOrganizationId?: string | null;
  },
): Promise<{ engagements: ProviderEngagementSummary[]; contact?: Record<string, unknown> }> {
  const fallbackOrgName = opts.primaryOrganizationName?.trim() || null;
  const fallbackOrgId = opts.primaryOrganizationId?.trim() || null;

  const { data: engagementRows, error } = await supabase
    .from("surgical_sales_engagements")
    .select(
      `id, engagement_type, status, title, organization_id, opportunity_id, case_id, scheduled_at, engagement_date, notes,
      next_action, follow_up_tasks, debrief_intelligence_snapshot,
      debrief_completed, debrief_completed_at,
      pre_call_hospital_name, pre_call_surgeon_name, observation_goal,
      pre_observation_impact_opening_statement, pre_observation_probes, pre_observation_tools_resources,
      pre_observation_value_hypothesis, pre_observation_planned_close, pre_observation_additional_notes,
      updated_at, created_at, prepared_at, planning_status, planning_mode, briefing_id,
      organization:sales_organizations!organization_id(id, name)`,
    )
    .eq("provider_id", opts.providerId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  const engagementList = (engagementRows || []) as EngagementRow[];
  const engagementOrgIds = [
    ...new Set(
      engagementList
        .filter((e) => e.organization_id && !e.organization?.name)
        .map((e) => String(e.organization_id)),
    ),
  ];
  const engagementCaseIds = [...new Set(engagementList.map((e) => String(e.case_id || "")).filter(Boolean))];
  const engagementOppIds = [...new Set(engagementList.map((e) => String(e.opportunity_id || "")).filter(Boolean))];

  const orgBy = new Map<string, string>();
  if (fallbackOrgId && fallbackOrgName) orgBy.set(fallbackOrgId, fallbackOrgName);
  if (engagementOrgIds.length > 0) {
    const { data: orgs } = await supabase.from(SALES_ORGANIZATIONS_TABLE).select("id, name").in("id", engagementOrgIds);
    for (const o of orgs || []) {
      orgBy.set(String((o as { id: string }).id), String((o as { name?: string }).name ?? ""));
    }
  }

  const caseBy = new Map<string, string>();
  if (engagementCaseIds.length > 0) {
    const { data: linkedCases } = await supabase
      .from("surgical_sales_cases")
      .select("id, case_number")
      .in("id", engagementCaseIds);
    for (const c of linkedCases || []) {
      caseBy.set(
        String((c as { id: string }).id),
        formatSurgicalCaseNumber(String((c as { case_number?: string }).case_number ?? "")),
      );
    }
  }

  const oppBy = new Map<string, string>();
  if (engagementOppIds.length > 0) {
    const { data: linkedOpps } = await supabase
      .from("sales_opportunities")
      .select("id, account_name")
      .in("id", engagementOppIds);
    for (const o of linkedOpps || []) {
      oppBy.set(
        String((o as { id: string }).id),
        String((o as { account_name?: string }).account_name ?? OPPORTUNITY_UI.fallbackRecordLabel),
      );
    }
  }

  let contact = opts.contact;
  if (engagementList.length > 0) {
    const reconciled = await reconcileProviderObservationApprovalFromEngagements({
      providerId: opts.providerId,
      userId: opts.salesRepId,
      actorName: opts.actorName?.trim() || "Rep",
      contact,
      engagementRows: engagementList,
    });
    if (reconciled.updated) contact = reconciled.contact;
  }

  const engagementsMapped = engagementList.map((row) => {
    const orgName = organizationNameFromRow(row, orgBy, fallbackOrgName);
    const orgId = row.organization_id ? String(row.organization_id) : fallbackOrgId;
    const rowWithOrg = {
      ...row,
      organization_id: orgId,
      organization_name: orgName,
    };
    return mapEngagementRowForProviderProfile(rowWithOrg, orgBy, caseBy, oppBy);
  });

  const engagements = mergeProviderEngagementsWithLegacyDraft(contact, engagementsMapped, {
    organizationName: fallbackOrgName,
  });

  return {
    engagements,
    contact: contact !== opts.contact ? contact : undefined,
  };
}
