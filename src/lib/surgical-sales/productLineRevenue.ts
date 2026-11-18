export const PRODUCT_LINE_REVENUE_REGIONS = ["RGV", "Laredo"] as const;
export const PRODUCT_LINE_REVENUE_SOURCES = ["manual", "import", "derived"] as const;
export const DEFAULT_PRODUCT_LINE_REVENUE_LINE = "BioTissue";
export const PRODUCT_LINE_REVENUE_MIGRATION = "db/migrations/20260921_sales_product_line_revenue.sql";

export type ProductLineRevenueRegion = (typeof PRODUCT_LINE_REVENUE_REGIONS)[number];
export type ProductLineRevenueSource = (typeof PRODUCT_LINE_REVENUE_SOURCES)[number];

export type ProductLineQuotaRow = {
  product_line: string;
  year: number;
  month: number;
  amount: number;
};

export type ProductLineClosedRow = {
  product_line: string;
  year: number;
  month: number;
  region: ProductLineRevenueRegion;
  amount: number;
  source: ProductLineRevenueSource;
  notes: string | null;
  updated_at?: string | null;
};

export type ProductLineMonthView = {
  year: number;
  month: number;
  label: string;
  quarterId: ProductLineQuarterId;
  quota: number | null;
  rgv: number | null;
  laredo: number | null;
  closed: number | null;
  variance: number | null;
  entered: boolean;
  source: ProductLineRevenueSource | null;
  isCurrent: boolean;
};

export type ProductLineQuarterId = "Q1" | "Q2" | "Q3" | "Q4";

export type ProductLineQuarterStatus = "no_data" | "no_quota" | "hit" | "missed" | "in_play";

export type ProductLineQuarterView = {
  id: ProductLineQuarterId;
  label: string;
  months: number[];
  quota: number | null;
  closed: number;
  enteredMonthCount: number;
  attainment: number | null;
  status: ProductLineQuarterStatus;
  /** 0.25 or 0.35 once the quarter can be scored; null while still in play or with no quota. */
  commissionRate: 0.25 | 0.35 | null;
  commissionEstimate: number | null;
  remainingToHit: number | null;
};

export type ProductLineYearView = {
  productLine: string;
  year: number;
  months: ProductLineMonthView[];
  quarters: ProductLineQuarterView[];
  closed: number;
  quota: number | null;
  quotaThroughEntered: number | null;
  varianceThroughEntered: number | null;
  availableYears: number[];
};

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const QUARTERS: Array<{ id: ProductLineQuarterId; label: string; months: number[] }> = [
  { id: "Q1", label: "Q1 · Jan–Mar", months: [1, 2, 3] },
  { id: "Q2", label: "Q2 · Apr–Jun", months: [4, 5, 6] },
  { id: "Q3", label: "Q3 · Jul–Sep", months: [7, 8, 9] },
  { id: "Q4", label: "Q4 · Oct–Dec", months: [10, 11, 12] },
];

/** 2026 BioTissue ISA plan: miss the quarter at 25%, hit 100% of quarterly quota at 35% back to dollar one. */
export const PRODUCT_LINE_ISA_MISS_RATE = 0.25;
export const PRODUCT_LINE_ISA_HIT_RATE = 0.35;

export function monthLabel(month: number): string {
  return MONTH_LABELS[month - 1] ?? `Month ${month}`;
}

export function quarterIdForMonth(month: number): ProductLineQuarterId {
  if (month <= 3) return "Q1";
  if (month <= 6) return "Q2";
  if (month <= 9) return "Q3";
  return "Q4";
}

function asAmount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
}

function lastDayOfMonthUtc(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

export function buildProductLineYearView(input: {
  productLine: string;
  year: number;
  quotas: ProductLineQuotaRow[];
  closed: ProductLineClosedRow[];
  availableYears?: number[];
  now?: Date;
}): ProductLineYearView {
  const now = input.now ?? new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  const quotaByMonth = new Map<number, number>();
  for (const row of input.quotas) {
    if (row.year !== input.year) continue;
    quotaByMonth.set(row.month, asAmount(row.amount));
  }

  const closedByMonth = new Map<number, { rgv: number | null; laredo: number | null; source: ProductLineRevenueSource | null }>();
  for (const row of input.closed) {
    if (row.year !== input.year) continue;
    const prev = closedByMonth.get(row.month) ?? { rgv: null, laredo: null, source: null };
    if (row.region === "RGV") prev.rgv = asAmount(row.amount);
    if (row.region === "Laredo") prev.laredo = asAmount(row.amount);
    prev.source = row.source;
    closedByMonth.set(row.month, prev);
  }

  const months: ProductLineMonthView[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const quota = quotaByMonth.has(month) ? (quotaByMonth.get(month) as number) : null;
    const closed = closedByMonth.get(month);
    const rgv = closed?.rgv ?? null;
    const laredo = closed?.laredo ?? null;
    const entered = rgv != null || laredo != null;
    const closedTotal = entered ? asAmount(rgv ?? 0) + asAmount(laredo ?? 0) : null;
    months.push({
      year: input.year,
      month,
      label: monthLabel(month),
      quarterId: quarterIdForMonth(month),
      quota,
      rgv,
      laredo,
      closed: closedTotal,
      variance: quota != null && closedTotal != null ? Math.round((closedTotal - quota) * 100) / 100 : null,
      entered,
      source: closed?.source ?? null,
      isCurrent: input.year === currentYear && month === currentMonth,
    });
  }

  const quarters = QUARTERS.map((q) => {
    const qMonths = months.filter((m) => q.months.includes(m.month));
    const quotaParts = qMonths.map((m) => m.quota).filter((n): n is number => n != null);
    const quota = quotaParts.length > 0 ? quotaParts.reduce((a, b) => a + b, 0) : null;
    const closed = qMonths.reduce((sum, m) => sum + (m.closed ?? 0), 0);
    const enteredMonthCount = qMonths.filter((m) => m.entered).length;
    const lastMonth = q.months[q.months.length - 1] ?? 3;
    const quarterEnded = now.getTime() > lastDayOfMonthUtc(input.year, lastMonth).getTime();
    const attainment = quota != null && quota > 0 && enteredMonthCount > 0 ? closed / quota : null;

    let status: ProductLineQuarterStatus = "no_data";
    if (enteredMonthCount === 0) status = "no_data";
    else if (quota == null) status = "no_quota";
    else if (closed >= quota) status = "hit";
    else if (quarterEnded) status = "missed";
    else status = "in_play";

    const commissionRate: 0.25 | 0.35 | null =
      quota == null || enteredMonthCount === 0 ? null : status === "hit" ? PRODUCT_LINE_ISA_HIT_RATE : status === "missed" ? PRODUCT_LINE_ISA_MISS_RATE : null;

    return {
      id: q.id,
      label: q.label,
      months: q.months,
      quota,
      closed: Math.round(closed * 100) / 100,
      enteredMonthCount,
      attainment,
      status,
      commissionRate,
      commissionEstimate: commissionRate != null ? Math.round(closed * commissionRate * 100) / 100 : null,
      remainingToHit: quota != null && status === "in_play" ? Math.max(0, Math.round((quota - closed) * 100) / 100) : null,
    };
  });

  const enteredMonths = months.filter((m) => m.entered);
  const closedYear = enteredMonths.reduce((sum, m) => sum + (m.closed ?? 0), 0);
  const quotaYearParts = months.map((m) => m.quota).filter((n): n is number => n != null);
  const quotaYear = quotaYearParts.length > 0 ? quotaYearParts.reduce((a, b) => a + b, 0) : null;
  const quotaThroughEnteredParts = enteredMonths.map((m) => m.quota).filter((n): n is number => n != null);
  const quotaThroughEntered =
    quotaThroughEnteredParts.length > 0 ? quotaThroughEnteredParts.reduce((a, b) => a + b, 0) : null;

  const years = new Set<number>([input.year, ...(input.availableYears ?? [])]);
  for (const row of input.quotas) years.add(row.year);
  for (const row of input.closed) years.add(row.year);

  return {
    productLine: input.productLine,
    year: input.year,
    months,
    quarters,
    closed: Math.round(closedYear * 100) / 100,
    quota: quotaYear,
    quotaThroughEntered,
    varianceThroughEntered:
      quotaThroughEntered != null ? Math.round((closedYear - quotaThroughEntered) * 100) / 100 : null,
    availableYears: [...years].sort((a, b) => a - b),
  };
}

const SHORT_MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type ProductLineChartPoint = {
  month: number;
  shortLabel: string;
  label: string;
  quota: number;
  closed: number;
  rgv: number;
  laredo: number;
  cumulativeClosed: number;
  cumulativeQuota: number;
};

/** Entered months only — blank months stay off plots so they do not look like $0. */
export function buildProductLineChartPoints(view: ProductLineYearView): ProductLineChartPoint[] {
  let cumulativeClosed = 0;
  let cumulativeQuota = 0;
  const points: ProductLineChartPoint[] = [];
  for (const month of view.months) {
    if (!month.entered) continue;
    const closed = month.closed ?? 0;
    const quota = month.quota ?? 0;
    cumulativeClosed = Math.round((cumulativeClosed + closed) * 100) / 100;
    cumulativeQuota = Math.round((cumulativeQuota + quota) * 100) / 100;
    points.push({
      month: month.month,
      shortLabel: SHORT_MONTH_LABELS[month.month - 1] ?? month.label.slice(0, 3),
      label: month.label,
      quota,
      closed,
      rgv: month.rgv ?? 0,
      laredo: month.laredo ?? 0,
      cumulativeClosed,
      cumulativeQuota,
    });
  }
  return points;
}

export function productLineTerritoryTotals(view: ProductLineYearView): { rgv: number; laredo: number } {
  return view.months.reduce(
    (sum, month) => {
      if (!month.entered) return sum;
      return {
        rgv: Math.round((sum.rgv + (month.rgv ?? 0)) * 100) / 100,
        laredo: Math.round((sum.laredo + (month.laredo ?? 0)) * 100) / 100,
      };
    },
    { rgv: 0, laredo: 0 },
  );
}
