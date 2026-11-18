import { surgicalCaseRequiresBillingWorkflow } from "@/lib/surgical-sales/billingReadiness";
import {
  normalizeCaseDateYmd,
  resolvedBookedRevenueForCase,
} from "@/lib/surgical-sales/casePerformedStatus";

export const BOOKED_REVENUE_CASE_STATUSES = new Set([
  "completed",
  "docs_needed",
  "billing_review",
  "invoiced",
  "closed",
]);

export const UPCOMING_PIPELINE_CASE_STATUSES = new Set(["scheduled", "confirmed", "rescheduled"]);

export type RevenuePipelineCaseInput = {
  id: string;
  case_number?: string | null;
  account_id?: string | null;
  account_name?: string | null;
  surgeon_display?: string | null;
  procedure_type?: string | null;
  product_name?: string | null;
  case_date: string | null;
  status: string;
  case_type?: string | null;
  product_id?: string | null;
  expected_revenue?: number | null;
  actual_revenue?: number | null;
  archived_at?: string | null;
  requires_billing_workflow?: boolean;
  product_line_count?: number;
  sales_rep_display?: string | null;
};

export type RevenuePipelineLane = "booked" | "upcoming";

export type RevenuePipelineCaseRow = {
  id: string;
  case_number: string;
  account_name: string | null;
  surgeon_display: string | null;
  procedure_type: string | null;
  product_name: string | null;
  case_date: string | null;
  status: string;
  expected_revenue: number;
  actual_revenue: number | null;
  amount: number;
  revenue_source: "actual" | "expected" | "none";
  href: string;
  sales_rep_display: string | null;
};

export type RevenuePipelineSummary = {
  booked_month: number;
  booked_quarter: number;
  booked_ytd: number;
  upcoming: number;
  booked_month_case_count: number;
  upcoming_case_count: number;
  missing_revenue_count: number;
};

function statusOf(c: RevenuePipelineCaseInput): string {
  return String(c.status || "").trim().toLowerCase();
}

function expectedAmount(c: RevenuePipelineCaseInput): number {
  const n = Number(c.expected_revenue ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function actualAmount(c: RevenuePipelineCaseInput): number | null {
  if (c.actual_revenue === null || c.actual_revenue === undefined) return null;
  const n = Number(c.actual_revenue);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function caseIsRevenueEligible(c: RevenuePipelineCaseInput): boolean {
  if (c.archived_at) return false;
  const st = statusOf(c);
  if (st === "cancelled" || st === "draft") return false;
  if (typeof c.requires_billing_workflow === "boolean") return c.requires_billing_workflow;
  return surgicalCaseRequiresBillingWorkflow({
    caseType: c.case_type,
    productId: c.product_id,
    productLineCount: c.product_line_count ?? 0,
  });
}

export function classifyRevenuePipelineLane(
  c: RevenuePipelineCaseInput,
  todayYmd: string,
): RevenuePipelineLane | null {
  if (!caseIsRevenueEligible(c)) return null;
  const st = statusOf(c);
  if (BOOKED_REVENUE_CASE_STATUSES.has(st)) return "booked";
  if (UPCOMING_PIPELINE_CASE_STATUSES.has(st)) {
    const ymd = normalizeCaseDateYmd(c.case_date);
    if (ymd && ymd < todayYmd) return null;
    return "upcoming";
  }
  return null;
}

export function revenueSourceForLane(
  lane: RevenuePipelineLane,
  expected: number,
  actual: number | null,
): "actual" | "expected" | "none" {
  if (lane === "upcoming") return expected > 0 ? "expected" : "none";
  if (actual != null) return "actual";
  if (expected > 0) return "expected";
  return "none";
}

export function toRevenuePipelineCaseRow(
  c: RevenuePipelineCaseInput,
  lane: RevenuePipelineLane,
): RevenuePipelineCaseRow {
  const expected = expectedAmount(c);
  const actual = actualAmount(c);
  const amount = lane === "booked" ? resolvedBookedRevenueForCase(expected, actual) : expected;
  return {
    id: String(c.id),
    case_number: String(c.case_number || "").trim(),
    account_name: c.account_name?.trim() ? String(c.account_name) : null,
    surgeon_display: c.surgeon_display?.trim() ? String(c.surgeon_display) : null,
    procedure_type: c.procedure_type?.trim() ? String(c.procedure_type) : null,
    product_name: c.product_name?.trim() ? String(c.product_name) : null,
    case_date: normalizeCaseDateYmd(c.case_date),
    status: statusOf(c),
    expected_revenue: expected,
    actual_revenue: actual,
    amount,
    revenue_source: revenueSourceForLane(lane, expected, actual),
    href: `/portal/sales/cases/${encodeURIComponent(String(c.id))}`,
    sales_rep_display: c.sales_rep_display?.trim() ? String(c.sales_rep_display) : null,
  };
}

export function utcMonthStartYmd(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function utcQuarterStartYmd(ymd: string): string {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(5, 7));
  const qStart = Math.floor((month - 1) / 3) * 3 + 1;
  return `${year}-${String(qStart).padStart(2, "0")}-01`;
}

export function utcYearStartYmd(ymd: string): string {
  return `${ymd.slice(0, 4)}-01-01`;
}

function inRange(caseDate: string | null, start: string, end: string): boolean {
  if (!caseDate) return false;
  return caseDate >= start && caseDate <= end;
}

export function buildRevenuePipelineView(
  cases: RevenuePipelineCaseInput[],
  todayYmd: string,
): {
  summary: RevenuePipelineSummary;
  upcoming_cases: RevenuePipelineCaseRow[];
  booked_cases: RevenuePipelineCaseRow[];
} {
  const monthStart = utcMonthStartYmd(todayYmd);
  const quarterStart = utcQuarterStartYmd(todayYmd);
  const yearStart = utcYearStartYmd(todayYmd);

  const upcoming: RevenuePipelineCaseRow[] = [];
  const booked: RevenuePipelineCaseRow[] = [];

  for (const c of cases) {
    const lane = classifyRevenuePipelineLane(c, todayYmd);
    if (!lane) continue;
    const row = toRevenuePipelineCaseRow(c, lane);
    if (lane === "upcoming") upcoming.push(row);
    else booked.push(row);
  }

  upcoming.sort((a, b) => String(a.case_date || "9999").localeCompare(String(b.case_date || "9999")));
  booked.sort((a, b) => String(b.case_date || "").localeCompare(String(a.case_date || "")));

  const bookedMonth = booked.filter((r) => inRange(r.case_date, monthStart, todayYmd));
  const bookedQuarter = booked.filter((r) => inRange(r.case_date, quarterStart, todayYmd));
  const bookedYtd = booked.filter((r) => inRange(r.case_date, yearStart, todayYmd));

  const sum = (rows: RevenuePipelineCaseRow[]) => rows.reduce((n, r) => n + r.amount, 0);

  return {
    summary: {
      booked_month: sum(bookedMonth),
      booked_quarter: sum(bookedQuarter),
      booked_ytd: sum(bookedYtd),
      upcoming: sum(upcoming),
      booked_month_case_count: bookedMonth.length,
      upcoming_case_count: upcoming.length,
      missing_revenue_count: [...upcoming, ...bookedMonth].filter((r) => r.revenue_source === "none").length,
    },
    upcoming_cases: upcoming,
    booked_cases: bookedYtd,
  };
}
