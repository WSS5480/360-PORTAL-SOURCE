import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import {
  mapContactWriteFields,
  mergeContactSalesIntelligenceIntoPatch,
  repCanAccessContact,
  upsertContactOrganizationLink,
  SURGICAL_CONTACT_INFLUENCE_LEVELS,
  SURGICAL_CONTACT_PREFERRED_METHODS,
  SURGICAL_CONTACT_RELATIONSHIP_STRENGTHS,
  type ContactSalesIntelligenceInput,
} from "@/lib/surgical-sales/contactManagement";
import { PROVIDER_CRM_STATUSES } from "@/lib/surgical-sales/labels";
import {
  defaultCrmStatusForRelationshipStage,
  PROVIDER_ONBOARDING_RELATIONSHIP_OPTIONS,
  relationshipStageFromOnboardingAnswer,
  type ProviderOnboardingRelationshipAnswer,
} from "@/lib/surgical-sales/providerRelationshipStage";
import { isAdoptionSuccessStage } from "@/lib/sales/stages";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import {
  mergeProviderWizardFieldsPatch,
  validateBasics,
  validateCompleteSubmit,
  type ProviderCreateWizardPayload,
} from "@/lib/surgical-sales/providerCreateWizard";
import {
  buildProviderPlanningCompletion,
  buildProviderPlanningSections,
} from "@/lib/surgical-sales/providerPlanningCompletion";
import { buildProviderMissionEngagementPreview } from "@/lib/surgical-sales/buildProviderMissionEngagementPreview";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import { providerHiddenFromProviderDirectory } from "@/lib/surgical-sales/providerRemoveScope";
import { isEvaluationEngagementType } from "@/lib/surgical-sales/missionBoardEvaluationEngagement";
import {
  computeUpcomingObservationImminent,
  computeUpcomingObservationPrepIncomplete,
  isFollowUpEngagementType,
} from "@/lib/surgical-sales/providerMissionHealth";
import { resolveSalesPathwayStage } from "@/lib/surgical-sales/pathway";
import { countObservedProcedures } from "@/lib/surgical-sales/pathwayStageGates";
import { buildProviderObservationCaseRollup } from "@/lib/surgical-sales/providerObservationCaseCollection";
import { voidRecordActivityEventDual } from "@/lib/activity/dualWrite";
import {
  listClinicalDiscoveryAnswersByProviderIds,
  listClinicalDiscoveryAnswersForProvider,
  touchProviderPlanningUpdatedAt,
  upsertClinicalDiscoveryAnswers,
} from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import {
  contactMatchesPhysicianName,
  pickPrimaryOrgLink,
  providerPlanningSummary,
  pickSpecialty,
  type ProviderDirectoryRow,
  type ProviderOrgLink,
  type ProviderPlanningStatus,
} from "@/lib/surgical-sales/providerDirectory";

export const dynamic = "force-dynamic";

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

function engagementSortTimestamp(row: {
  engagement_date?: string | null;
  scheduled_at?: string | null;
}): number {
  const scheduled = String(row.scheduled_at ?? "").trim();
  if (scheduled) {
    const t = new Date(scheduled).getTime();
    if (Number.isFinite(t)) return t;
  }
  const dateOnly = String(row.engagement_date ?? "").trim();
  if (dateOnly) {
    const t = new Date(`${dateOnly}T12:00:00`).getTime();
    if (Number.isFinite(t)) return t;
  }
  return Number.POSITIVE_INFINITY;
}

type UpcomingEngagementRow = {
  id: string;
  provider_id: string;
  engagement_type?: string | null;
  status?: string | null;
  engagement_date?: string | null;
  scheduled_at?: string | null;
  observation_goal?: string | null;
  pre_call_hospital_name?: string | null;
  organization_id?: string | null;
  case_id?: string | null;
  prepared_at?: string | null;
  planning_status?: string | null;
  organization?: { name?: string | null } | null;
};

function pickSoonerEngagement(
  current: UpcomingEngagementRow | undefined,
  candidate: UpcomingEngagementRow,
): UpcomingEngagementRow {
  if (!current) return candidate;
  return engagementSortTimestamp(candidate) < engagementSortTimestamp(current) ? candidate : current;
}

function maxIso(a: string | null | undefined, b: string | null | undefined): string | null {
  const aa = a ? new Date(a).getTime() : NaN;
  const bb = b ? new Date(b).getTime() : NaN;
  if (Number.isNaN(aa) && Number.isNaN(bb)) return null;
  if (Number.isNaN(aa)) return b || null;
  if (Number.isNaN(bb)) return a || null;
  return aa >= bb ? (a as string) : (b as string);
}

async function requireRep() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const uid = auth.user.id;
  const rep = await userIsInternalSalesRep(uid);
  if (!rep) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, uid };
}

export async function GET(req: Request) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const specialtyQ = (url.searchParams.get("specialty") || "").trim().toLowerCase();
  const organizationId = (url.searchParams.get("organization_id") || "").trim();
  const territoryQ = (url.searchParams.get("territory") || "").trim().toLowerCase();
  const planningStatus = (url.searchParams.get("planning_status") || "").trim() as ProviderPlanningStatus | "";
  const opportunityLinked = (url.searchParams.get("opportunity_linked") || "").trim();
  const archiveFilter = (url.searchParams.get("archive") || "active").trim();

  let query = supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*, organization:sales_organizations!organization_id(id,name,surgical_crm_billing_state), account:sales_organizations!account_id(id,name,surgical_crm_billing_state)")
    .in("role_type", ["surgeon", "physician_assistant"])
    .order("updated_at", { ascending: false })
    .limit(800);

  if (archiveFilter === "archived") {
    query = query.not("archived_at", "is", null);
  } else if (archiveFilter !== "all") {
    query = query.is("archived_at", null);
  }

  if (organizationId) {
    query = query.or(`organization_id.eq.${organizationId},account_id.eq.${organizationId}`);
  }

  const { data: contactRows, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const allowed: Record<string, unknown>[] = [];
  for (const row of (contactRows || []) as Record<string, unknown>[]) {
    if (archiveFilter !== "archived" && archiveFilter !== "all" && providerHiddenFromProviderDirectory(row)) {
      continue;
    }
    if (await repCanAccessContact(gate.uid, row as never)) allowed.push(row);
  }

  const allowedIds = allowed.map((r) => String((r as { id: string }).id)).filter(Boolean);

  const upcomingEngagementByProvider = new Map<string, number>();
  const nextEngagementByProvider = new Map<string, UpcomingEngagementRow>();
  const upcomingFollowUpByProvider = new Map<string, boolean>();
  const pathwayEngagementsByProvider = new Map<
    string,
    Array<{ id: string; engagement_type?: string | null; status?: string | null; debrief_completed?: boolean | null }>
  >();
  const latestDebriefEngagementByProvider = new Map<
    string,
    {
      id: string;
      status: string;
      debrief_completed: boolean;
      updated_at: string;
      prepared_at: string | null;
      planning_status: string | null;
    }
  >();
  type EvaluationEngagementCandidate = {
    id: string;
    engagement_type: string;
    status: string;
    updated_at: string;
    prepared_at: string | null;
    planning_status: string | null;
  };
  // Active (planned/in_progress) evaluation engagements win over completed ones.
  const activeEvaluationEngagementByProvider = new Map<string, EvaluationEngagementCandidate>();
  const completedEvaluationEngagementByProvider = new Map<string, EvaluationEngagementCandidate>();
  if (allowedIds.length > 0) {
    for (let i = 0; i < allowedIds.length; i += IN_CHUNK) {
      const slice = allowedIds.slice(i, i + IN_CHUNK);
      const { data: engRows } = await supabaseAdmin
        .from("surgical_sales_engagements")
        .select(
          "id, provider_id, engagement_type, status, engagement_date, scheduled_at, observation_goal, pre_call_hospital_name, organization_id, case_id, debrief_completed, updated_at, prepared_at, planning_status, organization:sales_organizations!organization_id(name)",
        )
        .in("provider_id", slice)
        .is("archived_at", null)
        .in("status", ["planned", "in_progress", "completed", "done", "closed"]);
      for (const e of engRows || []) {
        const row = e as UpcomingEngagementRow & {
          status?: string | null;
          debrief_completed?: boolean | null;
          updated_at?: string | null;
          prepared_at?: string | null;
          planning_status?: string | null;
        };
        const pid = String(row.provider_id);
        const status = String(row.status || "").toLowerCase();
        if (isProviderDebriefEngagement(String(row.engagement_type ?? ""))) {
          const updatedAt = String(row.updated_at ?? "").trim();
          const existingDebrief = latestDebriefEngagementByProvider.get(pid);
          if (
            !existingDebrief ||
            (updatedAt && updatedAt >= existingDebrief.updated_at)
          ) {
            latestDebriefEngagementByProvider.set(pid, {
              id: String(row.id),
              status: String(row.status ?? "planned"),
              debrief_completed: Boolean(row.debrief_completed),
              updated_at: updatedAt || existingDebrief?.updated_at || "",
              prepared_at: row.prepared_at ? String(row.prepared_at) : null,
              planning_status: row.planning_status ? String(row.planning_status) : null,
            });
          }
        }
        if (isEvaluationEngagementType(String(row.engagement_type ?? ""))) {
          const candidate: EvaluationEngagementCandidate = {
            id: String(row.id),
            engagement_type: String(row.engagement_type ?? ""),
            status: String(row.status ?? "planned"),
            updated_at: String(row.updated_at ?? "").trim(),
            prepared_at: row.prepared_at ? String(row.prepared_at) : null,
            planning_status: row.planning_status ? String(row.planning_status) : null,
          };
          const bucket =
            status === "planned" || status === "in_progress"
              ? activeEvaluationEngagementByProvider
              : completedEvaluationEngagementByProvider;
          const existing = bucket.get(pid);
          if (!existing || (candidate.updated_at && candidate.updated_at >= existing.updated_at)) {
            bucket.set(pid, candidate);
          }
        }
        if (status === "planned" || status === "in_progress") {
          upcomingEngagementByProvider.set(pid, (upcomingEngagementByProvider.get(pid) ?? 0) + 1);
          nextEngagementByProvider.set(pid, pickSoonerEngagement(nextEngagementByProvider.get(pid), row));
          if (isFollowUpEngagementType(row.engagement_type)) {
            upcomingFollowUpByProvider.set(pid, true);
          }
        }
        const pathwayList = pathwayEngagementsByProvider.get(pid) || [];
        pathwayList.push({
          id: String(row.id),
          engagement_type: row.engagement_type,
          status: row.status,
          debrief_completed: row.debrief_completed,
        });
        pathwayEngagementsByProvider.set(pid, pathwayList);
      }
    }
  }
  const orgLinksByContact = new Map<string, ProviderOrgLink[]>();
  const accountTerritory = new Map<string, string>();

  if (allowedIds.length > 0) {
    for (let i = 0; i < allowedIds.length; i += IN_CHUNK) {
      const slice = allowedIds.slice(i, i + IN_CHUNK);
      const { data: links } = await supabaseAdmin
        .from("surgical_sales_contact_organizations")
        .select("contact_id, account_id, role_type, specialty, is_primary_org, is_active, accounts:sales_organizations!account_id(id,name,surgical_crm_billing_state)")
        .in("contact_id", slice)
        .limit(4000);
      for (const row of (links || []) as ProviderOrgLink[]) {
        const key = String(row.contact_id || "");
        const arr = orgLinksByContact.get(key) || [];
        arr.push(row);
        orgLinksByContact.set(key, arr);
        const acct = row.accounts as { id?: string; surgical_crm_billing_state?: string | null } | null | undefined;
        const aid = String(row.account_id || acct?.id || "");
        const st = String(acct?.surgical_crm_billing_state || "").trim();
        if (aid && st) accountTerritory.set(aid, st);
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
      case_time?: string | null;
      status?: string | null;
      case_type?: string | null;
      procedure_type?: string | null;
      follow_up_needed?: boolean | null;
      engagement_id?: string | null;
    }>
  >();
  const pendingFollowUpByProvider = new Map<string, boolean>();
  const lastActivityBySurgeon = new Map<string, string>();

  if (allowedIds.length > 0) {
    for (let i = 0; i < allowedIds.length; i += IN_CHUNK) {
      const slice = allowedIds.slice(i, i + IN_CHUNK);
      const { data: cases } = await supabaseAdmin
        .from("surgical_sales_cases")
        .select("id, surgeon_contact_id, case_date, case_time, status, updated_at, case_type, procedure_type, follow_up_needed, engagement_id")
        .in("surgeon_contact_id", slice)
        .limit(4000);
      for (const c of (cases || []) as Array<Record<string, unknown>>) {
        const sid = String(c.surgeon_contact_id || "");
        if (!sid) continue;
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
        const list = casesBySurgeon.get(sid) || [];
        list.push({
          id: String(c.id || ""),
          updated_at: c.updated_at as string | null,
          case_date: c.case_date as string | null,
          case_time: c.case_time as string | null,
          status: c.status as string | null,
          case_type: c.case_type as string | null,
          procedure_type: c.procedure_type as string | null,
          follow_up_needed: followUpNeeded,
          engagement_id: (c.engagement_id as string | null) ?? null,
        });
        casesBySurgeon.set(sid, list);
        const prev = lastActivityBySurgeon.get(sid);
        lastActivityBySurgeon.set(sid, maxIso(prev, String(c.updated_at || "")) || prev || String(c.updated_at || ""));
      }
    }
  }

  const { data: opps } = await supabaseAdmin
    .from("sales_opportunities")
    .select("id, account_id, physician_name, stage, updated_at")
    .limit(2000);

  let clinicalAnswersByProvider: Awaited<ReturnType<typeof listClinicalDiscoveryAnswersByProviderIds>> = new Map();
  try {
    clinicalAnswersByProvider = await listClinicalDiscoveryAnswersByProviderIds(supabaseAdmin, allowedIds);
  } catch {
    clinicalAnswersByProvider = new Map();
  }

  const enriched: ProviderDirectoryRow[] = allowed.map((row) => {
    const id = String((row as { id: string }).id);
    const links = orgLinksByContact.get(id) || [];
    const activeLinks = links.filter((l) => l.is_active !== false);
    const primaryLink = pickPrimaryOrgLink(links);
    const primaryAcct = primaryLink?.accounts as { id?: string; name?: string | null; surgical_crm_billing_state?: string | null } | null;
    const legacyOrg = (row as { organization?: { id?: string; name?: string | null; surgical_crm_billing_state?: string | null } }).organization;
    const legacyAcct = (row as { account?: { id?: string; name?: string | null; surgical_crm_billing_state?: string | null } }).account;

    const primaryOrgId = String(primaryLink?.account_id || primaryAcct?.id || legacyOrg?.id || legacyAcct?.id || (row as { organization_id?: string }).organization_id || (row as { account_id?: string }).account_id || "");
    const primaryOrgName =
      String(primaryAcct?.name || legacyOrg?.name || legacyAcct?.name || "").trim() || null;
    const orgCount = activeLinks.length || links.length;
    const additionalOrgs = Math.max(0, orgCount - (primaryOrgId ? 1 : 0));

    const accountIds = new Set<string>();
    if (primaryOrgId) accountIds.add(primaryOrgId);
    for (const l of links) {
      const aid = String(l.account_id || (l.accounts as { id?: string } | null)?.id || "");
      if (aid) accountIds.add(aid);
    }

    let linkedOpps = 0;
    let hasWon = false;
    for (const o of (opps || []) as Array<Record<string, unknown>>) {
      const aid = String(o.account_id || "");
      const nameMatch = contactMatchesPhysicianName(row as never, String(o.physician_name || ""));
      const orgMatch = aid && accountIds.has(aid);
      if (!nameMatch && !orgMatch) continue;
      linkedOpps += 1;
      if (isAdoptionSuccessStage(String(o.stage || ""))) hasWon = true;
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

    const territory =
      String(primaryAcct?.surgical_crm_billing_state || legacyOrg?.surgical_crm_billing_state || legacyAcct?.surgical_crm_billing_state || "").trim() ||
      (primaryOrgId ? accountTerritory.get(primaryOrgId) || null : null);

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
    const planning_status = planning_completion.status;

    const last_activity_at = maxIso(
      maxIso((row as { updated_at?: string }).updated_at, (row as { last_contacted_at?: string }).last_contacted_at),
      lastActivityBySurgeon.get(id),
    );

    const directoryRow: ProviderDirectoryRow = {
      ...(row as ProviderDirectoryRow),
      organization_links: links,
      organization_count: orgCount,
      specialty: pickSpecialty(links, (row as { title?: string }).title),
      primary_organization_name: primaryOrgName,
      primary_organization_id: primaryOrgId || null,
      additional_organizations_count: additionalOrgs,
      territory: territory || null,
      planning_status,
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
    };

    const nextEng = nextEngagementByProvider.get(id);
    if (nextEng) {
      directoryRow.upcoming_engagement = buildProviderMissionEngagementPreview(
        {
          id: nextEng.id,
          engagement_type: nextEng.engagement_type,
          status: nextEng.status,
          engagement_date: nextEng.engagement_date,
          scheduled_at: nextEng.scheduled_at,
          observation_goal: nextEng.observation_goal,
          pre_call_hospital_name: nextEng.pre_call_hospital_name,
          organization_id: nextEng.organization_id,
          organization_name: nextEng.organization?.name ?? null,
          case_id: nextEng.case_id,
          prepared_at: nextEng.prepared_at ?? null,
          planning_status: nextEng.planning_status ?? null,
        },
        directoryRow,
      );
      directoryRow.upcoming_observation_imminent = computeUpcomingObservationImminent(nextEng, todayYmd());
      directoryRow.upcoming_observation_prep_incomplete = computeUpcomingObservationPrepIncomplete(
        nextEng,
        directoryRow,
      );
    }

    const debriefEng = latestDebriefEngagementByProvider.get(id);
    if (debriefEng) {
      directoryRow.provider_debrief_engagement = {
        id: debriefEng.id,
        status: debriefEng.status,
        debrief_completed: debriefEng.debrief_completed,
        prepared_at: debriefEng.prepared_at,
        planning_status: debriefEng.planning_status,
      };
    }

    const evaluationEng =
      activeEvaluationEngagementByProvider.get(id) ?? completedEvaluationEngagementByProvider.get(id);
    if (evaluationEng) {
      directoryRow.provider_evaluation_engagement = {
        id: evaluationEng.id,
        engagement_type: evaluationEng.engagement_type,
        status: evaluationEng.status,
        prepared_at: evaluationEng.prepared_at,
        planning_status: evaluationEng.planning_status,
      };
    }

    directoryRow.pending_follow_up_unscheduled =
      Boolean(pendingFollowUpByProvider.get(id)) && !upcomingFollowUpByProvider.get(id);

    const observationRollup = buildProviderObservationCaseRollup({
      cases: surgeonCases,
      facilityLabel: primaryOrgName || "No organization",
      completedCount: observationCount,
    });
    directoryRow.observation_cases = observationRollup;
    directoryRow.next_scheduled_observation_case = observationRollup.nextScheduled;

    return directoryRow;
  });

  const specialties = [...new Set(enriched.map((r) => String(r.specialty || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  const territories = [...new Set(enriched.map((r) => String(r.territory || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );

  const filtered = enriched
    .filter((row) => {
      if (!q) return true;
      const specs = (row.organization_links || [])
        .map((x) => String(x.specialty || "").toLowerCase())
        .join(" ");
      const hay = [
        row.primary_organization_name,
        row.specialty,
        row.title,
        row.first_name,
        row.last_name,
        row.email,
        specs,
        row.territory,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    })
    .filter((row) => {
      if (!specialtyQ) return true;
      return String(row.specialty || "")
        .toLowerCase()
        .includes(specialtyQ);
    })
    .filter((row) => {
      if (!territoryQ) return true;
      return String(row.territory || "").toLowerCase() === territoryQ;
    })
    .filter((row) => {
      if (!planningStatus) return true;
      return row.planning_status === planningStatus;
    })
    .filter((row) => {
      if (opportunityLinked === "yes") return row.linked_opportunities_count > 0;
      if (opportunityLinked === "no") return row.linked_opportunities_count === 0;
      return true;
    });

  return NextResponse.json({
    ok: true,
    providers: filtered,
    filter_options: { specialties, territories },
  });
}

const ProviderCreateSchema = z
  .object({
    save_mode: z.enum(["draft", "complete"]),
    first_name: z.string().max(200).optional().nullable(),
    last_name: z.string().max(200).optional().nullable(),
    title: z.string().max(200).optional().nullable(),
    role_type: z.enum(["surgeon", "physician_assistant"]).optional().default("surgeon"),
    email: z.string().max(320).optional().nullable(),
    phone: z.string().max(80).optional().nullable(),
    mobile_phone: z.string().max(80).optional().nullable(),
    specialty: z.string().max(200).optional().nullable(),
    primary_organization_id: z.string().uuid().optional().nullable(),
    additional_organization_ids: z.array(z.string().uuid()).optional().default([]),
    provider_crm_status: z.enum(PROVIDER_CRM_STATUSES).optional(),
    onboarding_relationship: z
      .enum([
        "early_discovery",
        "active_evaluation",
        "active_relationship",
        "established_customer",
        "dormant_reactivation",
      ])
      .optional(),
    provider_relationship_stage: z.string().max(64).optional(),
    influence_level: z.enum(SURGICAL_CONTACT_INFLUENCE_LEVELS).optional(),
    relationship_strength: z.enum(SURGICAL_CONTACT_RELATIONSHIP_STRENGTHS).optional(),
    preferred_contact_method: z.enum(SURGICAL_CONTACT_PREFERRED_METHODS).optional(),
    best_time_to_contact: z.string().max(500).optional().nullable(),
    fields: z.record(z.string(), z.union([z.string(), z.null()])).optional(),
  })
  .strict();

export async function POST(req: Request) {
  const gate = await requireRep();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });
  const parsed = ProviderCreateSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });

  const p = parsed.data as ProviderCreateWizardPayload;
  const basicsErr = validateBasics(p);
  if (p.save_mode === "complete" && basicsErr) {
    return NextResponse.json({ ok: false, error: basicsErr }, { status: 400 });
  }
  if (p.save_mode === "draft" && !String(p.first_name ?? "").trim() && !String(p.last_name ?? "").trim()) {
    return NextResponse.json({ ok: false, error: "Enter at least a first or last name to save a draft." }, { status: 400 });
  }

  const primaryOrgId = String(p.primary_organization_id ?? "").trim() || null;
  if (primaryOrgId) {
    if (!(await repCanViewSurgicalAccount(gate.uid, primaryOrgId))) {
      return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });
    }
  }

  const relationshipStage =
    p.provider_relationship_stage?.trim() ||
    (p.onboarding_relationship
      ? relationshipStageFromOnboardingAnswer(p.onboarding_relationship)
      : "early_discovery");
  const crmStatus =
    p.provider_crm_status ??
    defaultCrmStatusForRelationshipStage(
      relationshipStage as Parameters<typeof defaultCrmStatusForRelationshipStage>[0],
    );

  const row: Record<string, unknown> = {
    ...mapContactWriteFields({
      organization_id: primaryOrgId,
      first_name: p.first_name,
      last_name: p.last_name,
      title: p.title,
      email: p.email,
      phone: p.phone,
      mobile_phone: p.mobile_phone,
      role_type: p.role_type || "surgeon",
      influence_level: p.influence_level || "unknown",
      relationship_strength: p.relationship_strength || "unknown",
      created_by: gate.uid,
    }),
    provider_onboarding_status: p.save_mode === "draft" ? "draft" : "active",
    provider_crm_status: crmStatus,
    provider_relationship_stage: relationshipStage,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const clinicalUpserts = mergeProviderWizardFieldsPatch(row, p.fields);
  if (p.specialty?.trim()) {
    row.provider_procedure_focus = String(row.provider_procedure_focus || p.specialty.trim());
  }

  const intelInput: ContactSalesIntelligenceInput = {
    best_time_to_contact: p.best_time_to_contact ?? null,
    personality_notes: p.fields?.provider_rep_strategy_notes ?? undefined,
    access_notes: p.fields?.provider_follow_up_approach ?? undefined,
  };
  if (p.preferred_contact_method !== undefined) {
    intelInput.preferred_contact_method =
      p.preferred_contact_method as (typeof SURGICAL_CONTACT_PREFERRED_METHODS)[number];
  }
  const intelErr = mergeContactSalesIntelligenceIntoPatch(row, intelInput);
  if (intelErr) return NextResponse.json({ ok: false, error: intelErr }, { status: 400 });

  const completeErr = validateCompleteSubmit(row, p);
  if (p.save_mode === "complete" && completeErr) {
    return NextResponse.json({ ok: false, error: completeErr }, { status: 400 });
  }

  const { data: created, error } = await supabaseAdmin.from("surgical_sales_contacts").insert(row).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const contactId = String((created as { id: string }).id);
  const specialty = String(p.specialty ?? "").trim() || null;

  if (clinicalUpserts.length > 0) {
    await upsertClinicalDiscoveryAnswers(supabaseAdmin, contactId, gate.uid, clinicalUpserts);
    await touchProviderPlanningUpdatedAt(supabaseAdmin, contactId);
  }

  if (primaryOrgId) {
    await upsertContactOrganizationLink({
      contactId,
      accountId: primaryOrgId,
      actorId: gate.uid,
      roleType: p.role_type || "surgeon",
      isPrimary: true,
      specialty,
    });
  }

  const extraOrgs = [...new Set((p.additional_organization_ids || []).filter((id) => id && id !== primaryOrgId))];
  for (const accountId of extraOrgs) {
    if (!(await repCanViewSurgicalAccount(gate.uid, accountId))) continue;
    await upsertContactOrganizationLink({
      contactId,
      accountId,
      actorId: gate.uid,
      roleType: p.role_type || "surgeon",
      isPrimary: false,
      specialty,
    });
  }

  await logSurgicalSalesCrmAudit({
    actorUserId: gate.uid,
    action: p.save_mode === "draft" ? "provider_draft_created" : "provider_created",
    meta: { contact_id: contactId, provider_id: contactId, save_mode: p.save_mode },
    req,
  });

  const displayName = [String(p.first_name ?? "").trim(), String(p.last_name ?? "").trim()].filter(Boolean).join(" ");
  voidRecordActivityEventDual({
    type: "PROVIDER_CREATED",
    summary: displayName
      ? `Provider ${displayName} created${p.save_mode === "draft" ? " (draft)" : ""}.`
      : `Provider created${p.save_mode === "draft" ? " (draft)" : ""}.`,
    entityType: "provider",
    entityId: contactId,
    createdBy: { userId: gate.uid },
    metadata: { save_mode: p.save_mode, primary_organization_id: primaryOrgId },
    tags: p.save_mode === "draft" ? ["draft"] : ["active"],
  });

  if (p.save_mode === "complete") {
    const sections = buildProviderPlanningSections(created as Record<string, unknown>);
    for (const section of sections) {
      if (section.status === "complete") {
        voidRecordActivityEventDual({
          type: "PLANNING_SECTION_COMPLETED",
          summary: `${section.label} completed during provider onboarding.`,
          entityType: "provider",
          entityId: contactId,
          createdBy: { userId: gate.uid },
          metadata: { section_id: section.id, section_label: section.label },
          tags: [section.id],
        });
      }
    }
  }

  const clinical_discovery_answers =
    clinicalUpserts.length > 0
      ? await listClinicalDiscoveryAnswersForProvider(supabaseAdmin, contactId)
      : [];

  return NextResponse.json({
    ok: true,
    provider_id: contactId,
    provider: created,
    clinical_discovery_answers,
    planning_completion: buildProviderPlanningCompletion(created as Record<string, unknown>),
    onboarding_status: p.save_mode === "draft" ? "draft" : "active",
  });
}
