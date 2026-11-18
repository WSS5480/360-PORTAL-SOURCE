/**
 * Server-side loader for the provider-centric Opportunity pipeline view.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import {
  contactMatchesPhysicianName,
  pickPrimaryOrgLink,
  pickSpecialty,
  providerPlanningSummary,
  type ProviderDirectoryRow,
  type ProviderOrgLink,
} from "@/lib/surgical-sales/providerDirectory";
import { buildProviderMissionEngagementPreview } from "@/lib/surgical-sales/buildProviderMissionEngagementPreview";
import {
  computeUpcomingObservationImminent,
  computeUpcomingObservationPrepIncomplete,
  isFollowUpEngagementType,
} from "@/lib/surgical-sales/providerMissionHealth";
import { resolveSalesPathwayStage } from "@/lib/surgical-sales/pathway";
import { countObservedProcedures } from "@/lib/surgical-sales/pathwayStageGates";
import { listClinicalDiscoveryAnswersByProviderIds } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import {
  buildOpportunityPipelineView,
  providerHasWonOpportunity,
  type OpportunityPipelineProviderInput,
} from "@/lib/surgical-sales/opportunityPipelineView";

const IN_CHUNK = 120;
const RECENT_CASE_DAYS = 90;

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return dt.toISOString().slice(0, 10);
}

function maxIso(a: string | null | undefined, b: string | null | undefined): string | null {
  const aa = a ? new Date(a).getTime() : NaN;
  const bb = b ? new Date(b).getTime() : NaN;
  if (Number.isNaN(aa) && Number.isNaN(bb)) return null;
  if (Number.isNaN(aa)) return b || null;
  if (Number.isNaN(bb)) return a || null;
  return aa >= bb ? (a as string) : (b as string);
}

export async function loadOpportunityPipelineForRep(uid: string, searchQuery?: string) {
  let query = supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*, organization:sales_organizations!organization_id(id,name), account:sales_organizations!account_id(id,name)")
    .in("role_type", ["surgeon", "physician_assistant"])
    .eq("provider_crm_status", "prospect")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(800);

  const { data: contactRows, error } = await query;
  if (error) throw new Error(error.message);

  const allowed: Record<string, unknown>[] = [];
  for (const row of (contactRows || []) as Record<string, unknown>[]) {
    if (await repCanAccessContact(uid, row as never)) allowed.push(row);
  }

  const q = String(searchQuery ?? "").trim().toLowerCase();
  const filtered = q
    ? allowed.filter((row) => {
        const name = `${row.first_name ?? ""} ${row.last_name ?? ""}`.toLowerCase();
        const org = String(
          (row as { organization?: { name?: string } }).organization?.name ??
            (row as { account?: { name?: string } }).account?.name ??
            "",
        ).toLowerCase();
        const specialty = String(row.title ?? "").toLowerCase();
        return name.includes(q) || org.includes(q) || specialty.includes(q);
      })
    : allowed;

  const allowedIds = filtered.map((r) => String((r as { id: string }).id)).filter(Boolean);

  const orgLinksByContact = new Map<string, ProviderOrgLink[]>();
  if (allowedIds.length > 0) {
    for (let i = 0; i < allowedIds.length; i += IN_CHUNK) {
      const slice = allowedIds.slice(i, i + IN_CHUNK);
      const { data: links } = await supabaseAdmin
        .from("surgical_sales_contact_organizations")
        .select("contact_id, account_id, role_type, specialty, is_primary_org, is_active, accounts:sales_organizations!account_id(id,name)")
        .in("contact_id", slice)
        .limit(4000);
      for (const row of (links || []) as ProviderOrgLink[]) {
        const key = String(row.contact_id || "");
        const arr = orgLinksByContact.get(key) || [];
        arr.push(row);
        orgLinksByContact.set(key, arr);
      }
    }
  }

  const recentCutoff = addDaysYmd(todayYmd(), -RECENT_CASE_DAYS);
  const casesBySurgeon = new Map<
    string,
    Array<{
      id?: string;
      updated_at?: string | null;
      case_date?: string | null;
      status?: string | null;
      case_type?: string | null;
      debrief_completed?: boolean | null;
    }>
  >();
  const lastActivityBySurgeon = new Map<string, string>();
  const pendingFollowUpByProvider = new Map<string, boolean>();

  if (allowedIds.length > 0) {
    for (let i = 0; i < allowedIds.length; i += IN_CHUNK) {
      const slice = allowedIds.slice(i, i + IN_CHUNK);
      const { data: cases } = await supabaseAdmin
        .from("surgical_sales_cases")
        .select("id, surgeon_contact_id, case_date, status, updated_at, case_type, follow_up_needed, debrief_completed")
        .in("surgeon_contact_id", slice)
        .limit(4000);
      for (const c of (cases || []) as Array<Record<string, unknown>>) {
        const sid = String(c.surgeon_contact_id || "");
        if (!sid) continue;
        const list = casesBySurgeon.get(sid) || [];
        list.push({
          id: String(c.id || ""),
          updated_at: c.updated_at as string | null,
          case_date: c.case_date as string | null,
          status: c.status as string | null,
          case_type: c.case_type as string | null,
          debrief_completed: c.debrief_completed as boolean | null,
        });
        casesBySurgeon.set(sid, list);
        const prev = lastActivityBySurgeon.get(sid);
        lastActivityBySurgeon.set(sid, maxIso(prev, String(c.updated_at || "")) || prev || String(c.updated_at || ""));

        const status = String(c.status || "").toLowerCase();
        const followUpNeeded = Boolean(c.follow_up_needed);
        if (
          followUpNeeded &&
          status !== "cancelled" &&
          status !== "closed" &&
          status !== "done" &&
          status !== "completed"
        ) {
          pendingFollowUpByProvider.set(sid, true);
        }
      }
    }
  }

  const upcomingEngagementByProvider = new Map<string, number>();
  const nextEngagementByProvider = new Map<string, Record<string, unknown>>();
  const pathwayEngagementsByProvider = new Map<
    string,
    Array<{ id: string; engagement_type?: string | null; status?: string | null; debrief_completed?: boolean | null }>
  >();

  if (allowedIds.length > 0) {
    for (let i = 0; i < allowedIds.length; i += IN_CHUNK) {
      const slice = allowedIds.slice(i, i + IN_CHUNK);
      const { data: engRows } = await supabaseAdmin
        .from("surgical_sales_engagements")
        .select(
          "id, provider_id, engagement_type, status, engagement_date, scheduled_at, observation_goal, case_id, debrief_completed, organization:sales_organizations!organization_id(name)",
        )
        .in("provider_id", slice)
        .is("archived_at", null)
        .in("status", ["planned", "in_progress", "completed", "done", "closed"]);
      for (const e of engRows || []) {
        const row = e as Record<string, unknown> & { provider_id: string; status?: string };
        const pid = String(row.provider_id);
        const status = String(row.status || "").toLowerCase();
        if (status === "planned" || status === "in_progress") {
          upcomingEngagementByProvider.set(pid, (upcomingEngagementByProvider.get(pid) ?? 0) + 1);
          const current = nextEngagementByProvider.get(pid);
          if (!current) nextEngagementByProvider.set(pid, row);
        }
        const pathwayList = pathwayEngagementsByProvider.get(pid) || [];
        pathwayList.push({
          id: String(row.id),
          engagement_type: row.engagement_type as string | null,
          status: row.status as string | null,
          debrief_completed: row.debrief_completed as boolean | null,
        });
        pathwayEngagementsByProvider.set(pid, pathwayList);
      }
    }
  }

  const { data: opps } = await supabaseAdmin
    .from("sales_opportunities")
    .select("id, account_id, physician_name, surgeon_contact_id, stage, updated_at")
    .limit(2000);

  let clinicalAnswersByProvider: Awaited<ReturnType<typeof listClinicalDiscoveryAnswersByProviderIds>> = new Map();
  try {
    clinicalAnswersByProvider = await listClinicalDiscoveryAnswersByProviderIds(supabaseAdmin, allowedIds);
  } catch {
    clinicalAnswersByProvider = new Map();
  }

  const pipelineInputs: OpportunityPipelineProviderInput[] = filtered.map((row) => {
    const id = String((row as { id: string }).id);
    const links = orgLinksByContact.get(id) || [];
    const primaryLink = pickPrimaryOrgLink(links);
    const primaryAcct = primaryLink?.accounts as { id?: string; name?: string | null } | null;
    const legacyOrg = (row as { organization?: { id?: string; name?: string | null } }).organization;
    const legacyAcct = (row as { account?: { id?: string; name?: string | null } }).account;
    const primaryOrgId = String(
      primaryLink?.account_id ||
        primaryAcct?.id ||
        legacyOrg?.id ||
        legacyAcct?.id ||
        (row as { organization_id?: string }).organization_id ||
        (row as { account_id?: string }).account_id ||
        "",
    );
    const primaryOrgName =
      String(primaryAcct?.name || legacyOrg?.name || legacyAcct?.name || "").trim() || null;

    const accountIds = new Set<string>();
    if (primaryOrgId) accountIds.add(primaryOrgId);
    for (const l of links) {
      const aid = String(l.account_id || (l.accounts as { id?: string } | null)?.id || "");
      if (aid) accountIds.add(aid);
    }

    let linkedOpps = 0;
    for (const o of (opps || []) as Array<Record<string, unknown>>) {
      const aid = String(o.account_id || "");
      const nameMatch = contactMatchesPhysicianName(row as never, String(o.physician_name || ""));
      const contactMatch = String(o.surgeon_contact_id ?? "") === id;
      const orgMatch = aid && accountIds.has(aid);
      if (contactMatch || nameMatch || orgMatch) linkedOpps += 1;
    }

    const surgeonCases = casesBySurgeon.get(id) || [];
    const pathwayEngagements = pathwayEngagementsByProvider.get(id) || [];
    const observationCount = countObservedProcedures({
      contact: row as Record<string, unknown>,
      cases: surgeonCases,
      engagements: pathwayEngagements.map((e) => ({
        id: e.id,
        engagement_type: String(e.engagement_type || ""),
        status: String(e.status || ""),
        debrief_completed: Boolean(e.debrief_completed),
      })),
    });
    const recentCaseCount = surgeonCases.filter((c) => {
      const cd = String(c.case_date || "").slice(0, 10);
      const st = String(c.status || "").toLowerCase();
      return cd >= recentCutoff && st !== "cancelled";
    }).length;

    const latestCaseDate = surgeonCases.reduce((max, c) => {
      const d = String(c.case_date || "").slice(0, 10);
      return d > max ? d : max;
    }, "");

    const planning_completion = providerPlanningSummary(
      row as Record<string, unknown>,
      { latestCaseDate: latestCaseDate || null },
      links,
      clinicalAnswersByProvider.get(id) || [],
    );

    const last_activity_at = maxIso(
      maxIso((row as { updated_at?: string }).updated_at, (row as { last_contacted_at?: string }).last_contacted_at),
      lastActivityBySurgeon.get(id),
    );

    const nextEng = nextEngagementByProvider.get(id);
    const directoryRow: ProviderDirectoryRow = {
      ...(row as ProviderDirectoryRow),
      organization_links: links,
      organization_count: links.filter((l) => l.is_active !== false).length || links.length,
      specialty: pickSpecialty(links, (row as { title?: string }).title),
      primary_organization_name: primaryOrgName,
      primary_organization_id: primaryOrgId || null,
      additional_organizations_count: Math.max(0, links.length - (primaryOrgId ? 1 : 0)),
      territory: null,
      planning_status: planning_completion.status,
      planning_completion,
      onboarding_status: String((row as { provider_onboarding_status?: string }).provider_onboarding_status || "active"),
      crm_status: String((row as { provider_crm_status?: string }).provider_crm_status || "prospect"),
      relationship_stage: String(
        (row as { provider_relationship_stage?: string }).provider_relationship_stage || "early_discovery",
      ),
      upcoming_engagement_count: upcomingEngagementByProvider.get(id) ?? 0,
      linked_opportunities_count: linkedOpps,
      observation_count: observationCount,
      recent_case_count: recentCaseCount,
      last_activity_at,
      relationship_pathway_stage_id: resolveSalesPathwayStage({
        contact: row as Record<string, unknown>,
        cases: surgeonCases,
        engagements: (pathwayEngagementsByProvider.get(id) || []).map((e) => ({
          id: e.id,
          engagement_type: String(e.engagement_type || ""),
          status: String(e.status || ""),
          debrief_completed: Boolean(e.debrief_completed),
        })),
      }),
      pending_follow_up_unscheduled: pendingFollowUpByProvider.get(id) ?? false,
    };

    if (nextEng) {
      directoryRow.upcoming_engagement = buildProviderMissionEngagementPreview(
        nextEng as never,
        directoryRow,
      );
      directoryRow.upcoming_observation_imminent = computeUpcomingObservationImminent(nextEng as never, todayYmd());
      directoryRow.upcoming_observation_prep_incomplete = computeUpcomingObservationPrepIncomplete(
        nextEng as never,
        directoryRow,
      );
    }

    const hasObservationCase = surgeonCases.some(
      (c) => String(c.case_type || "").toLowerCase() === "observation",
    );
    const hasProductSupportCase = surgeonCases.some(
      (c) =>
        String(c.case_type || "").toLowerCase() === "product_support" &&
        !["cancelled", "draft"].includes(String(c.status || "").toLowerCase()),
    );
    const observationDebriefComplete = surgeonCases.some(
      (c) => String(c.case_type || "").toLowerCase() === "observation" && Boolean(c.debrief_completed),
    );

    return {
      provider: directoryRow,
      contact: row,
      hasWonOpportunity: providerHasWonOpportunity(directoryRow, (opps || []) as Array<Record<string, unknown>>),
      hasProductSupportCase,
      hasObservationCase,
      observationDebriefComplete,
    };
  });

  return buildOpportunityPipelineView(pipelineInputs);
}
