import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { formatSurgicalCaseNumber, contactDisplayName } from "@/lib/surgical-sales/labels";
import { surgicalCaseRequiresBillingWorkflow } from "@/lib/surgical-sales/billingReadiness";
import { buildSalesExecutionDashboardAlertCounts } from "@/lib/surgical-sales/buildSalesExecutionDashboardAlerts";
import { countPreCallPlanFilled } from "@/lib/surgical-sales/preCallPlanFields";
import {
  formatEngagementStatus,
  formatEngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import { isUpcomingEngagementStatus } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
export const dynamic = "force-dynamic";

const CHUNK = 400;

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUtcMonth(d: Date): string {
  return utcYmd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

function endOfUtcMonth(d: Date): string {
  return utcYmd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

function addUtcDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + deltaDays));
  return utcYmd(dt);
}

/** Activity on UTC calendar day `ymd`, or yesterday if none today (one-day grace). */
function consecutiveActivityStreakUtc(activeDays: Set<string>): number {
  const today = utcYmd(new Date());
  let anchor = today;
  if (!activeDays.has(today)) {
    const y = addUtcDaysYmd(today, -1);
    if (!activeDays.has(y)) return 0;
    anchor = y;
  }
  let streak = 0;
  let d = anchor;
  while (activeDays.has(d)) {
    streak++;
    d = addUtcDaysYmd(d, -1);
  }
  return streak;
}

/** Monday–Sunday week in UTC for `case_date` comparisons. */
function currentUtcWeekRange(): { start: string; end: string } {
  const ref = new Date();
  const day = ref.getUTCDay();
  const mondayDiff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate() + mondayDiff));
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return { start: utcYmd(monday), end: utcYmd(sunday) };
}

export async function GET() {
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

  const { data: casesRaw, error: cErr } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select(
      "id, case_number, account_id, case_date, case_time, procedure_type, status, case_type, product_id, surgeon_contact_id, expected_revenue, actual_revenue, updated_at, created_at, observation_goal, notes, debrief_key_findings, follow_up_needed, case_support_outcome, case_implants_on_site, case_trays_sterilization_status, case_support_coverage, observation_access_scheduling_owner, observation_access_pathway, observation_access_credentialing, archived_at",
    );

  if (cErr) {
    return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
  }

  const cases = ((casesRaw || []) as {
    id: string;
    case_number: string;
    account_id: string;
    case_date: string | null;
    case_time?: string | null;
    procedure_type?: string | null;
    status: string;
    case_type: string | null;
    product_id: string | null;
    surgeon_contact_id: string | null;
    expected_revenue: number | null;
    actual_revenue: number | null;
    updated_at: string;
    created_at: string;
    observation_goal?: string | null;
    notes?: string | null;
    debrief_key_findings?: string | null;
    follow_up_needed?: boolean | null;
    case_support_outcome?: string | null;
    case_implants_on_site?: string | null;
    case_trays_sterilization_status?: string | null;
    case_support_coverage?: string | null;
    observation_access_scheduling_owner?: string | null;
    observation_access_pathway?: string | null;
    observation_access_credentialing?: string | null;
    archived_at?: string | null;
  }[]).map((row) => ({
    ...row,
    case_number: formatSurgicalCaseNumber(row.case_number),
  }));

  const caseIds = cases.map((c) => c.id);
  const productLineCountByCase = new Map<string, number>();
  for (let i = 0; i < caseIds.length; i += CHUNK) {
    const slice = caseIds.slice(i, i + CHUNK);
    if (slice.length === 0) break;
    const { data: lineRows } = await supabaseAdmin
      .from("surgical_sales_case_products")
      .select("case_id")
      .in("case_id", slice);
    for (const row of lineRows || []) {
      const cid = String((row as { case_id: string }).case_id);
      productLineCountByCase.set(cid, (productLineCountByCase.get(cid) ?? 0) + 1);
    }
  }
  const docTypesByCase = new Map<string, Set<string>>();
  for (let i = 0; i < caseIds.length; i += CHUNK) {
    const slice = caseIds.slice(i, i + CHUNK);
    if (slice.length === 0) break;
    const { data: docs, error: dErr } = await supabaseAdmin
      .from("surgical_sales_case_documents")
      .select("case_id, document_type")
      .in("case_id", slice);
    if (dErr) {
      return NextResponse.json({ ok: false, error: dErr.message }, { status: 500 });
    }
    for (const d of docs || []) {
      const cid = String((d as { case_id: string }).case_id);
      const t = String((d as { document_type: string }).document_type).toLowerCase();
      if (!docTypesByCase.has(cid)) docTypesByCase.set(cid, new Set());
      docTypesByCase.get(cid)!.add(t);
    }
  }

  const now = new Date();
  const { start: weekStart, end: weekEnd } = currentUtcWeekRange();
  const monthStart = startOfUtcMonth(now);
  const monthEnd = endOfUtcMonth(now);
  const todayStr = utcYmd(now);
  const plus2Str = addUtcDaysYmd(todayStr, 2);

  const statusCounts: Record<string, number> = {};

  let upcomingThisWeek = 0;
  let needingDocuments = 0;
  let completedThisMonth = 0;
  let completedThisWeek = 0;
  let casesThisMonth = 0;

  let missing_po_active = 0;
  let missing_invoice_active = 0;
  let upcoming_48h = 0;
  let billing_review_count = 0;
  let no_surgeon_active = 0;
  const active_accounts_set = new Set<string>();
  const surgeons_engaged_month_set = new Set<string>();

  for (const c of cases) {
    const st = String(c.status || "").toLowerCase();
    statusCounts[st] = (statusCounts[st] || 0) + 1;

    const cd = c.case_date ? String(c.case_date).slice(0, 10) : null;
    if (cd && cd >= weekStart && cd <= weekEnd && (st === "scheduled" || st === "confirmed")) {
      upcomingThisWeek++;
    }

    if (cd && cd >= weekStart && cd <= weekEnd && st === "completed") {
      completedThisWeek++;
    }

    if (cd && cd >= monthStart && cd <= monthEnd && st !== "cancelled") {
      casesThisMonth++;
    }

    if (cd && cd >= monthStart && cd <= monthEnd && st === "completed") {
      completedThisMonth++;
    }

    const types = docTypesByCase.get(c.id) ?? new Set();
    const hasPo = types.has("purchase_order");
    const hasInv = types.has("invoice");
    const requiresBilling = surgicalCaseRequiresBillingWorkflow({
      caseType: c.case_type,
      productId: c.product_id,
      productLineCount: productLineCountByCase.get(c.id) ?? 0,
    });
    const active = st !== "cancelled" && st !== "closed";
    if (requiresBilling && (st === "docs_needed" || (active && (!hasPo || !hasInv)))) {
      needingDocuments++;
    }

    if (active) {
      active_accounts_set.add(String(c.account_id));
      if (requiresBilling && !hasPo) missing_po_active++;
      if (requiresBilling && !hasInv) missing_invoice_active++;
      if (!c.surgeon_contact_id) no_surgeon_active++;
    }
    if (st === "billing_review") billing_review_count++;
    if (cd && cd >= todayStr && cd <= plus2Str && (st === "scheduled" || st === "confirmed")) {
      upcoming_48h++;
    }
    if (cd && cd >= monthStart && cd <= monthEnd && st !== "cancelled" && c.surgeon_contact_id) {
      surgeons_engaged_month_set.add(String(c.surgeon_contact_id));
    }
  }

  const surgeonsOnActiveCases = new Set<string>();
  for (const c of cases) {
    const st = String(c.status || "").toLowerCase();
    const active = st !== "cancelled" && st !== "closed";
    if (active && c.surgeon_contact_id) surgeonsOnActiveCases.add(String(c.surgeon_contact_id));
  }
  const surgeonsWithSupportRel = new Set<string>();
  if (surgeonsOnActiveCases.size > 0) {
    const sidList = [...surgeonsOnActiveCases];
    for (let i = 0; i < sidList.length; i += CHUNK) {
      const slice = sidList.slice(i, i + CHUNK);
      const { data: relRows, error: relErr } = await supabaseAdmin
        .from("surgical_sales_contact_relationships")
        .select("primary_contact_id")
        .in("primary_contact_id", slice);
      if (relErr) {
        return NextResponse.json({ ok: false, error: relErr.message }, { status: 500 });
      }
      for (const row of relRows || []) {
        surgeonsWithSupportRel.add(String((row as { primary_contact_id: string }).primary_contact_id));
      }
    }
  }
  let cases_missing_support_contact = 0;
  for (const c of cases) {
    const st = String(c.status || "").toLowerCase();
    const active = st !== "cancelled" && st !== "closed";
    if (!active || !c.surgeon_contact_id) continue;
    if (!surgeonsWithSupportRel.has(String(c.surgeon_contact_id))) cases_missing_support_contact++;
  }

  const caseIdSet = new Set(caseIds);
  type LineRow = { case_id: string; product_id: string; expected_quantity: number | null; actual_quantity: number | null };
  const allLines: LineRow[] = [];
  for (let i = 0; i < caseIds.length; i += CHUNK) {
    const slice = caseIds.slice(i, i + CHUNK);
    if (slice.length === 0) break;
    const { data: lines, error: lErr } = await supabaseAdmin
      .from("surgical_sales_case_products")
      .select("case_id, product_id, expected_quantity, actual_quantity")
      .in("case_id", slice);
    if (lErr) {
      return NextResponse.json({ ok: false, error: lErr.message }, { status: 500 });
    }
    for (const row of lines || []) {
      allLines.push(row as LineRow);
    }
  }

  const productIdsForLines = [
    ...new Set(
      [...allLines.map((l) => l.product_id), ...cases.map((c) => c.product_id)].filter(Boolean) as string[]
    ),
  ];
  const catByProduct = new Map<string, string>();
  for (let i = 0; i < productIdsForLines.length; i += CHUNK) {
    const slice = productIdsForLines.slice(i, i + CHUNK);
    if (slice.length === 0) break;
    const { data: prods } = await supabaseAdmin.from("surgical_sales_products").select("id, name, category").in("id", slice);
    for (const p of prods || []) {
      const id = String((p as { id: string }).id);
      const cat = String((p as { category?: string | null }).category ?? "").trim();
      const name = String((p as { name?: string | null }).name ?? "").trim();
      catByProduct.set(id, cat || name || "Product");
    }
  }

  function productLooksRobotic(pid: string | null | undefined): boolean {
    if (!pid) return false;
    const label = (catByProduct.get(String(pid)) || "").toLowerCase();
    return (
      label.includes("robot") ||
      label.includes("davinci") ||
      label.includes("da vinci") ||
      label.includes("intuitive")
    );
  }

  const linesByCase = new Map<string, string[]>();
  for (const row of allLines) {
    if (!linesByCase.has(row.case_id)) linesByCase.set(row.case_id, []);
    linesByCase.get(row.case_id)!.push(row.product_id);
  }

  let upcoming_robotic_week = 0;
  for (const c of cases) {
    const st = String(c.status || "").toLowerCase();
    const cd = c.case_date ? String(c.case_date).slice(0, 10) : null;
    if (!cd || cd < weekStart || cd > weekEnd) continue;
    if (st !== "scheduled" && st !== "confirmed") continue;
    if (productLooksRobotic(c.product_id)) {
      upcoming_robotic_week++;
      continue;
    }
    const linePids = linesByCase.get(c.id) || [];
    if (linePids.some((pid) => productLooksRobotic(pid))) upcoming_robotic_week++;
  }

  const lineAgg = new Map<string, number>();
  for (const row of allLines) {
    if (!caseIdSet.has(row.case_id)) continue;
    const fam = catByProduct.get(row.product_id) || "Product";
    const q = Number(row.actual_quantity);
    const qe = Number(row.expected_quantity);
    const use = Number.isFinite(q) && q > 0 ? q : Number.isFinite(qe) && qe > 0 ? qe : 0;
    lineAgg.set(fam, (lineAgg.get(fam) || 0) + use);
  }

  const product_usage_by_family = [...lineAgg.entries()]
    .map(([family, units]) => ({ family, units }))
    .sort((a, b) => b.units - a.units);

  const accountIds = [...new Set(cases.map((c) => c.account_id))];
  const accountNameBy = new Map<string, string>();
  if (accountIds.length > 0) {
    const { data: accs } = await supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").in("id", accountIds);
    for (const a of accs || []) {
      accountNameBy.set(String((a as { id: string }).id), String((a as { name?: string | null }).name ?? "—"));
    }
  }

  const upcomingCaseRows = cases
    .filter((c) => {
      const st = String(c.status || "").toLowerCase();
      const cd = c.case_date ? String(c.case_date).slice(0, 10) : null;
      return Boolean(cd && cd >= todayStr && (st === "scheduled" || st === "confirmed"));
    })
    .sort((a, b) => {
      const ad = `${String(a.case_date ?? "9999-12-31").slice(0, 10)} ${String(a.case_time ?? "")}`;
      const bd = `${String(b.case_date ?? "9999-12-31").slice(0, 10)} ${String(b.case_time ?? "")}`;
      return ad.localeCompare(bd);
    })
    .slice(0, 8);

  const upcomingProviderIds = [
    ...new Set(upcomingCaseRows.map((c) => String(c.surgeon_contact_id || "")).filter(Boolean)),
  ];
  const caseProviderBy = new Map<string, string>();
  if (upcomingProviderIds.length > 0) {
    const { data: contacts } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("id, first_name, last_name, email")
      .in("id", upcomingProviderIds);
    for (const c of contacts || []) {
      caseProviderBy.set(
        String((c as { id: string }).id),
        contactDisplayName(c as Parameters<typeof contactDisplayName>[0]),
      );
    }
  }

  const upcoming_cases = upcomingCaseRows.map((c) => ({
    id: c.id,
    case_number: c.case_number,
    account_name: accountNameBy.get(c.account_id) || "—",
    provider_name: c.surgeon_contact_id ? caseProviderBy.get(String(c.surgeon_contact_id)) ?? null : null,
    case_date: c.case_date ? String(c.case_date).slice(0, 10) : null,
    case_time: c.case_time ? String(c.case_time) : null,
    procedure_type: c.procedure_type ? String(c.procedure_type) : null,
    status: String(c.status || ""),
    case_type: c.case_type ? String(c.case_type) : null,
  }));

  let recent_activities: Array<{
    id: string;
    case_id: string;
    activity_type: string;
    body: string;
    created_at: string;
    case_number: string;
    account_name: string;
  }> = [];

  if (caseIds.length > 0) {
    const { data: acts, error: aErr } = await supabaseAdmin
      .from("surgical_sales_case_activities")
      .select("id, case_id, activity_type, body, created_at")
      .in("case_id", caseIds)
      .order("created_at", { ascending: false })
      .limit(20);
    if (aErr) {
      return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 });
    }
    const caseById = new Map(cases.map((c) => [c.id, c]));
    recent_activities = (acts || []).map((a) => {
      const row = a as { id: string; case_id: string; activity_type: string; body: string; created_at: string };
      const meta = caseById.get(String(row.case_id));
      return {
        id: row.id,
        case_id: row.case_id,
        activity_type: row.activity_type,
        body: row.body,
        created_at: row.created_at,
        case_number: meta?.case_number ?? "",
        account_name: meta ? accountNameBy.get(meta.account_id) || "—" : "—",
      };
    });
  }

  const activityDaysUtc = new Set<string>();
  if (caseIds.length > 0) {
    const sinceIso = new Date(Date.now() - 150 * 86400000).toISOString();
    for (let i = 0; i < caseIds.length; i += CHUNK) {
      const slice = caseIds.slice(i, i + CHUNK);
      if (slice.length === 0) break;
      const { data: actRows, error: actErr } = await supabaseAdmin
        .from("surgical_sales_case_activities")
        .select("created_at")
        .in("case_id", slice)
        .gte("created_at", sinceIso);
      if (actErr) {
        return NextResponse.json({ ok: false, error: actErr.message }, { status: 500 });
      }
      for (const row of actRows || []) {
        const ts = String((row as { created_at: string }).created_at);
        activityDaysUtc.add(ts.slice(0, 10));
      }
    }
  }
  const activity_streak_days = consecutiveActivityStreakUtc(activityDaysUtc);

  const { data: engagementRows, error: engErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select(
      "id, engagement_type, status, title, provider_id, organization_id, engagement_date, scheduled_at, updated_at",
    )
    .is("archived_at", null)
    .limit(200);

  if (engErr) {
    return NextResponse.json({ ok: false, error: engErr.message }, { status: 500 });
  }

  const upcomingEngRaw = (engagementRows || []).filter((r) =>
    isUpcomingEngagementStatus(String((r as { status?: string }).status ?? "")),
  );

  const engProviderIds = [
    ...new Set(upcomingEngRaw.map((r) => String((r as { provider_id: string }).provider_id))),
  ];
  const engOrgIds = [
    ...new Set(
      upcomingEngRaw
        .map((r) => String((r as { organization_id?: string | null }).organization_id || ""))
        .filter(Boolean),
    ),
  ];

  const engProviderBy = new Map<string, string>();
  if (engProviderIds.length > 0) {
    const { data: contacts } = await supabaseAdmin
      .from("surgical_sales_contacts")
      .select("id, first_name, last_name, email")
      .in("id", engProviderIds);
    for (const c of contacts || []) {
      engProviderBy.set(
        String((c as { id: string }).id),
        contactDisplayName(c as Parameters<typeof contactDisplayName>[0]),
      );
    }
  }

  const engOrgBy = new Map<string, string>();
  if (engOrgIds.length > 0) {
    const { data: accounts } = await supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").in("id", engOrgIds);
    for (const a of accounts || []) {
      engOrgBy.set(String((a as { id: string }).id), String((a as { name?: string | null }).name ?? ""));
    }
  }

  function engagementSortKey(row: Record<string, unknown>): string {
    const d = row.engagement_date ? String(row.engagement_date) : "";
    const s = row.scheduled_at ? String(row.scheduled_at) : "";
    return d || s || "9999-12-31";
  }

  const upcoming_engagements = upcomingEngRaw
    .map((r) => {
      const row = r as Record<string, unknown>;
      const providerId = String(row.provider_id ?? "");
      const orgId = row.organization_id ? String(row.organization_id) : null;
      const preCall = countPreCallPlanFilled(row);
      return {
        id: String(row.id),
        title: row.title ? String(row.title) : null,
        engagement_type_label: formatEngagementType(String(row.engagement_type)),
        status_label: formatEngagementStatus(String(row.status)),
        provider_id: providerId,
        provider_name: engProviderBy.get(providerId) ?? "Provider",
        organization_name: orgId ? engOrgBy.get(orgId) ?? null : null,
        engagement_date: row.engagement_date ? String(row.engagement_date) : null,
        scheduled_at: row.scheduled_at ? String(row.scheduled_at) : null,
        pre_call_filled: preCall.filled,
        pre_call_total: preCall.total,
        pre_call_complete: preCall.total > 0 && preCall.filled >= preCall.total,
      };
    })
    .sort((a, b) => engagementSortKey(a).localeCompare(engagementSortKey(b)))
    .slice(0, 8);

  const execution = buildSalesExecutionDashboardAlertCounts(cases, todayStr);

  return NextResponse.json({
    ok: true,
    week_range: { start: weekStart, end: weekEnd },
    month_range: { start: monthStart, end: monthEnd },
    upcoming_this_week: upcomingThisWeek,
    cases_by_status: statusCounts,
    cases_needing_documents: needingDocuments,
    completed_this_week: completedThisWeek,
    cases_this_month: casesThisMonth,
    completed_this_month: completedThisMonth,
    activity_streak_days,
    product_usage_by_family,
    recent_activities,
    upcoming_engagements,
    upcoming_cases,
    execution,
    operational: {
      missing_po: missing_po_active,
      missing_invoice: missing_invoice_active,
      upcoming_48h: upcoming_48h,
      billing_review: billing_review_count,
      no_surgeon: no_surgeon_active,
      upcoming_robotic_week: upcoming_robotic_week,
      active_accounts: active_accounts_set.size,
      surgeons_engaged_month: surgeons_engaged_month_set.size,
      cases_missing_support_contact,
      docs_needed_cases: statusCounts["docs_needed"] ?? 0,
    },
  });
}
