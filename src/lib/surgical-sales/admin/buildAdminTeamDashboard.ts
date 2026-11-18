import {
  buildAdminPathwayFunnel,
} from "@/lib/surgical-sales/admin/buildAdminPathwayFunnel";
import {
  adminProviderPathwayLabels,
  deriveAdminProviderPathwayState,
} from "@/lib/surgical-sales/admin/adminProviderPathway";
import {
  buildAdminProviderIntelligenceSummary,
} from "@/lib/surgical-sales/admin/buildAdminProviderIntelligenceSummary";
import {
  countStaleProvidersByRep,
  isProviderIntelligenceStale,
} from "@/lib/surgical-sales/admin/adminProviderIntelligenceStatus";
import { isSupportedProductCase } from "@/lib/surgical-sales/admin/isSupportedProductCase";
import type { AdminRepAttention, AdminTeamDashboardPayload } from "@/lib/surgical-sales/admin/adminTeamDashboardTypes";
import { ymdInPeriod } from "@/lib/surgical-sales/admin/adminTeamDashboardPeriod";
import { isCompletedCaseStatus, isDebriefCompleted, tsInYmdRange } from "@/lib/surgical-sales/executionLeaderboardMetrics";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  buildRepPerformance,
  type PerfActivityRow,
  type PerfCaseRow,
} from "@/lib/surgical-sales/repPerformanceMetrics";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import type { UniversalSurgicalFactRow } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";

export type AdminTeamDashboardCaseRow = {
  id: string;
  sales_rep_id: string;
  surgeon_contact_id: string | null;
  case_type: string | null;
  status: string | null;
  case_date: string | null;
  created_at: string;
  updated_at: string;
  case_support_case_result?: string | null;
  archived_at?: string | null;
  observation_completed_at?: string | null;
  engagement_id?: string | null;
  product_id?: string | null;
  expected_revenue?: number | null;
  actual_revenue?: number | null;
};

export type AdminTeamDashboardEngagementRow = {
  id: string;
  sales_rep_id: string;
  provider_id: string | null;
  engagement_type: string;
  status: string;
  debrief_completed?: boolean | null;
  debrief_completed_at?: string | null;
  updated_at: string;
};

export type AdminTeamDashboardContactRow = Record<string, unknown> & {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  account_id?: string | null;
  role_type?: string | null;
  archived_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
};

export type AdminTeamDashboardNoteRow = {
  case_id: string;
  created_at: string;
};

export type AdminTeamDashboardProductLineRow = {
  case_id: string;
  actual_quantity?: unknown;
};

export type AdminTeamDashboardInput = {
  now: Date;
  period: { key: string; label: string; start: string; end: string; prior_label: string };
  prior: { start: string; end: string };
  internalReps: Array<{ user_id: string; display_name: string; email: string | null }>;
  cases: AdminTeamDashboardCaseRow[];
  engagements: AdminTeamDashboardEngagementRow[];
  contacts: AdminTeamDashboardContactRow[];
  orgNameById: Map<string, string>;
  repNameById: Map<string, string>;
  docTypesByCase: Map<string, Set<string>>;
  closedCaseActivities: PerfActivityRow[];
  productLinesByCase: Map<string, AdminTeamDashboardProductLineRow[]>;
  notesByCase: Map<string, AdminTeamDashboardNoteRow[]>;
  providerIdsWithIntelInPeriod: Set<string>;
  notes30dCutoff: string;
  universalFactsByProvider?: Map<string, UniversalSurgicalFactRow[]>;
  readModelEnabled?: boolean;
};

function isCancelledCase(row: AdminTeamDashboardCaseRow): boolean {
  return String(row.status ?? "").toLowerCase() === "cancelled" || Boolean(row.archived_at);
}

function caseInPeriod(row: AdminTeamDashboardCaseRow, start: string, end: string): boolean {
  if (isCancelledCase(row)) return false;
  return ymdInPeriod(row.case_date, start, end);
}

function supportedProductCaseInPeriod(
  row: AdminTeamDashboardCaseRow,
  productLinesByCase: Map<string, AdminTeamDashboardProductLineRow[]>,
  notesByCase: Map<string, AdminTeamDashboardNoteRow[]>,
  start: string,
  end: string,
): boolean {
  if (!caseInPeriod(row, start, end)) return false;
  const notes = notesByCase.get(row.id) ?? [];
  return isSupportedProductCase({
    caseRow: row,
    productLines: productLinesByCase.get(row.id),
    hasProductUseNote: notes.length > 0,
  });
}

function countCasesInPeriod(cases: AdminTeamDashboardCaseRow[], start: string, end: string): number {
  return cases.filter((c) => caseInPeriod(c, start, end)).length;
}

function countObservationsCompleted(cases: AdminTeamDashboardCaseRow[], start: string, end: string): number {
  return cases.filter(
    (c) =>
      caseInPeriod(c, start, end) &&
      String(c.case_type ?? "").toLowerCase() === "observation" &&
      isCompletedCaseStatus(c.status),
  ).length;
}

function countSupportedProductCases(
  cases: AdminTeamDashboardCaseRow[],
  productLinesByCase: Map<string, AdminTeamDashboardProductLineRow[]>,
  notesByCase: Map<string, AdminTeamDashboardNoteRow[]>,
  start: string,
  end: string,
): number {
  return cases.filter((c) => supportedProductCaseInPeriod(c, productLinesByCase, notesByCase, start, end)).length;
}

function positiveAmount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

function sumEnteredRevenue(
  cases: AdminTeamDashboardCaseRow[],
  start: string,
  end: string,
  field: "expected_revenue" | "actual_revenue",
): { sum: number; counted: number } {
  let sum = 0;
  let counted = 0;
  for (const row of cases) {
    if (!caseInPeriod(row, start, end)) continue;
    const amount = positiveAmount(row[field]);
    if (amount <= 0) continue;
    sum += amount;
    counted += 1;
  }
  return { sum: Math.round(sum * 100) / 100, counted };
}

function countProductSupportMissingExpected(
  cases: AdminTeamDashboardCaseRow[],
  start: string,
  end: string,
): number {
  return cases.filter((row) => {
    if (!caseInPeriod(row, start, end)) return false;
    if (String(row.case_type ?? "").toLowerCase() !== "product_support") return false;
    return positiveAmount(row.expected_revenue) <= 0;
  }).length;
}

function buildCaseRevenue(input: AdminTeamDashboardInput): AdminTeamDashboardPayload["case_revenue"] {
  const expected = sumEnteredRevenue(input.cases, input.period.start, input.period.end, "expected_revenue");
  const actual = sumEnteredRevenue(input.cases, input.period.start, input.period.end, "actual_revenue");
  const priorExpected = sumEnteredRevenue(input.cases, input.prior.start, input.prior.end, "expected_revenue");
  const priorActual = sumEnteredRevenue(input.cases, input.prior.start, input.prior.end, "actual_revenue");
  return {
    expected: expected.sum,
    actual: actual.sum,
    prior_expected: priorExpected.sum,
    prior_actual: priorActual.sum,
    cases_in_period: countCasesInPeriod(input.cases, input.period.start, input.period.end),
    cases_with_expected: expected.counted,
    cases_with_actual: actual.counted,
    product_support_missing_expected: countProductSupportMissingExpected(
      input.cases,
      input.period.start,
      input.period.end,
    ),
  };
}

function buildKpis(input: AdminTeamDashboardInput): AdminTeamDashboardPayload["kpis"] {
  const { cases, period, prior } = input;

  return [
    {
      id: "cases_in_period",
      label: "Cases in period",
      value: countCasesInPeriod(cases, period.start, period.end),
      prior_value: countCasesInPeriod(cases, prior.start, prior.end),
      hint: "Cases by case date",
      question: "executing",
    },
    {
      id: "observations_completed",
      label: "Observations completed",
      value: countObservationsCompleted(cases, period.start, period.end),
      prior_value: countObservationsCompleted(cases, prior.start, prior.end),
      hint: "Completed observation program cases",
      question: "executing",
    },
    {
      id: "supported_product_cases",
      label: "Supported product cases",
      value: countSupportedProductCases(cases, input.productLinesByCase, input.notesByCase, period.start, period.end),
      prior_value: countSupportedProductCases(
        cases,
        input.productLinesByCase,
        input.notesByCase,
        prior.start,
        prior.end,
      ),
      hint: "Cases where our products were used and supported in the OR",
      question: "products_used",
    },
  ];
}

function buildRepRows(
  input: AdminTeamDashboardInput,
  staleProvidersByRep: Map<string, number>,
): AdminTeamDashboardPayload["reps"] {
  const perfCases: PerfCaseRow[] = input.cases
    .filter((c) => !c.archived_at)
    .map((c) => ({
      id: c.id,
      sales_rep_id: c.sales_rep_id,
      product_id: null,
      case_date: c.case_date,
      status: String(c.status ?? ""),
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));

  const { reps, highlights } = buildRepPerformance({
    now: input.now,
    internalReps: input.internalReps,
    cases: perfCases,
    docTypesByCase: input.docTypesByCase,
    closedCaseActivities: input.closedCaseActivities,
    productNameBy: new Map(),
  });

  const docRiskIds = new Set(highlights.doc_risk.map((r) => r.user_id));
  const lowActivityIds = new Set(highlights.low_activity.map((r) => r.user_id));

  return reps.map((rep) => {
    const repCases = input.cases.filter((c) => c.sales_rep_id === rep.user_id && !isCancelledCase(c));
    const scheduled = repCases.filter(
      (c) =>
        caseInPeriod(c, input.period.start, input.period.end) &&
        ["scheduled", "confirmed"].includes(String(c.status ?? "").toLowerCase()),
    ).length;
    const completed = repCases.filter(
      (c) => caseInPeriod(c, input.period.start, input.period.end) && isCompletedCaseStatus(c.status),
    ).length;
    const observations = repCases.filter(
      (c) =>
        caseInPeriod(c, input.period.start, input.period.end) &&
        String(c.case_type ?? "").toLowerCase() === "observation" &&
        isCompletedCaseStatus(c.status),
    ).length;
    const supported_product_cases = repCases.filter((c) =>
      supportedProductCaseCaseInPeriod(c, input, input.period.start, input.period.end),
    ).length;
    const debriefs = input.engagements.filter(
      (e) =>
        e.sales_rep_id === rep.user_id &&
        isDebriefCompleted(e) &&
        tsInYmdRange(e.debrief_completed_at ?? e.updated_at, input.period.start, input.period.end),
    ).length;
    const notes_30d = repCases.filter((c) =>
      (input.notesByCase.get(c.id) ?? []).some((n) => n.created_at >= input.notes30dCutoff),
    ).length;

    let attention: AdminRepAttention = null;
    if (lowActivityIds.has(rep.user_id)) attention = "low_activity";
    else if (docRiskIds.has(rep.user_id)) attention = "doc_risk";
    else if ((staleProvidersByRep.get(rep.user_id) ?? 0) > 0) attention = "stale_providers";

    const stale_providers = staleProvidersByRep.get(rep.user_id) ?? 0;

    return {
      user_id: rep.user_id,
      display_name: rep.display_name,
      email: rep.email,
      metrics: {
        scheduled,
        completed,
        observations,
        supported_product_cases,
        debriefs,
        notes_30d,
        doc_gaps: rep.missing_docs_count,
        stale_providers,
        expected_revenue: sumEnteredRevenue(repCases, input.period.start, input.period.end, "expected_revenue").sum,
        actual_revenue: sumEnteredRevenue(repCases, input.period.start, input.period.end, "actual_revenue").sum,
      },
      attention,
      composite_score: rep.composite_score,
    };
  });
}

function supportedProductCaseCaseInPeriod(
  row: AdminTeamDashboardCaseRow,
  input: AdminTeamDashboardInput,
  start: string,
  end: string,
): boolean {
  return supportedProductCaseInPeriod(row, input.productLinesByCase, input.notesByCase, start, end);
}

function buildProviderRows(input: AdminTeamDashboardInput): {
  providers: AdminTeamDashboardPayload["providers"];
  pathwayStages: Array<{ providerId: string; currentStage: SalesPathwayStageId }>;
} {
  const casesBySurgeon = new Map<string, AdminTeamDashboardCaseRow[]>();
  const repBySurgeon = new Map<string, string>();

  function caseRecencyKey(row: AdminTeamDashboardCaseRow): string {
    const date = row.case_date?.slice(0, 10) ?? "";
    return `${date}\t${row.updated_at}`;
  }

  for (const c of input.cases) {
    if (!c.surgeon_contact_id || isCancelledCase(c)) continue;
    const sid = String(c.surgeon_contact_id);
    const bucket = casesBySurgeon.get(sid) ?? [];
    bucket.push(c);
    casesBySurgeon.set(sid, bucket);

    const prevRep = repBySurgeon.get(sid);
    if (!prevRep) {
      repBySurgeon.set(sid, c.sales_rep_id);
      continue;
    }
    const prevCase = bucket.find((row) => row.sales_rep_id === prevRep);
    if (!prevCase || caseRecencyKey(c) > caseRecencyKey(prevCase)) {
      repBySurgeon.set(sid, c.sales_rep_id);
    }
  }

  const engagementsByProvider = new Map<string, AdminTeamDashboardEngagementRow[]>();
  for (const e of input.engagements) {
    if (!e.provider_id) continue;
    const pid = String(e.provider_id);
    const bucket = engagementsByProvider.get(pid) ?? [];
    bucket.push(e);
    engagementsByProvider.set(pid, bucket);
  }

  const pathwayStages: Array<{ providerId: string; currentStage: SalesPathwayStageId }> = [];
  const providers: AdminTeamDashboardPayload["providers"] = [];

  for (const contact of input.contacts) {
    if (contact.archived_at) continue;
    const role = String(contact.role_type ?? "").toLowerCase();
    if (role !== "surgeon" && role !== "physician_assistant") continue;

    const contactId = String(contact.id);
    const providerCases = casesBySurgeon.get(contactId) ?? [];
    const pathway = deriveAdminProviderPathwayState({
      providerId: contactId,
      contact,
      cases: providerCases,
      engagements: engagementsByProvider.get(contactId) ?? [],
    });
    const pathwayLabels = adminProviderPathwayLabels(pathway);

    pathwayStages.push({ providerId: contactId, currentStage: pathway.currentStage });

    const lastCaseDate =
      providerCases
        .map((c) => c.case_date)
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? null;

    const lastNoteAt = providerCases
      .flatMap((c) => input.notesByCase.get(c.id) ?? [])
      .map((n) => n.created_at)
      .sort()
      .reverse()[0];
    const contactUpdated = String(contact.updated_at ?? "");
    const lastCapturedAt = [lastNoteAt, contactUpdated].filter(Boolean).sort().reverse()[0] ?? null;

    const repId = repBySurgeon.get(contactId) ?? String(contact.created_by ?? "");

    const intelligence_bullets = buildAdminProviderIntelligenceSummary({
      contact,
      stageId: pathway.currentStage,
      universalFacts: input.universalFactsByProvider?.get(contactId),
    });
    const has_signals = intelligence_bullets.length > 0 && !/^no intelligence on file yet/i.test(intelligence_bullets[0] ?? "");
    const is_stale = isProviderIntelligenceStale({
      now: input.now,
      caseCount: providerCases.length,
      lastCapturedAt,
    });

    providers.push({
      contact_id: contactId,
      display_name: contactDisplayName(contact),
      organization_name: input.orgNameById.get(String(contact.account_id ?? "")) ?? "—",
      rep_name: input.repNameById.get(repId) ?? "—",
      rep_user_id: repId || null,
      stage_id: pathwayLabels.stage_id,
      stage_label: pathwayLabels.stage_label,
      funnel_stage_id: pathwayLabels.funnel_stage_id,
      case_count: providerCases.length,
      last_case_date: lastCaseDate,
      last_captured_at: lastCapturedAt,
      has_signals,
      is_stale,
      intelligence_bullets,
      portal_href: `/admin/sales/providers/${contactId}`,
    });
  }

  providers.sort((a, b) => {
    const aTs = a.last_captured_at ?? "";
    const bTs = b.last_captured_at ?? "";
    return bTs.localeCompare(aTs);
  });

  return { providers, pathwayStages };
}

export function buildAdminTeamDashboard(input: AdminTeamDashboardInput): AdminTeamDashboardPayload {
  const { providers, pathwayStages } = buildProviderRows(input);
  const staleProvidersByRep = countStaleProvidersByRep(providers);

  return {
    period: input.period,
    read_model_enabled: input.readModelEnabled ?? false,
    pathway_funnel: buildAdminPathwayFunnel(pathwayStages),
    kpis: buildKpis(input),
    case_revenue: buildCaseRevenue(input),
    reps: buildRepRows(input, staleProvidersByRep).sort(
      (a, b) => b.composite_score - a.composite_score || a.display_name.localeCompare(b.display_name),
    ),
    providers,
  };
}
