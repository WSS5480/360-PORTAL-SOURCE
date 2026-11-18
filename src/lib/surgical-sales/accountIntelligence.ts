export type AccountIntelCase = {
  id: string;
  case_number: string;
  case_date: string | null;
  status: string;
  product_id: string | null;
  surgeon_contact_id: string | null;
  expected_revenue: number | null;
  created_at: string;
  updated_at: string;
};

export type AccountIntelligence = {
  total_cases: number;
  cases_by_product: Array<{ product_id: string; name: string; count: number }>;
  top_surgeon: { contact_id: string; name: string; case_count: number } | null;
  last_case_date: string | null;
  upcoming_cases: Array<{
    id: string;
    case_number: string;
    case_date: string;
    status: string;
    product_name: string | null;
  }>;
  revenue_estimate_expected_total: number;
  /** All future non-terminal cases (not truncated). */
  upcoming_case_count: number;
  /** Short bullet strings for UI */
  insights: string[];
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseYmd(s: string | null | undefined): string | null {
  if (!s || typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  return s.slice(0, 10);
}

function st(s: string) {
  return String(s || "").toLowerCase();
}

export function buildAccountIntelligence(params: {
  totalCaseCount: number;
  cases: AccountIntelCase[];
  contactNameById: Map<string, string>;
  productNameById: Map<string, string>;
  now?: Date;
}): AccountIntelligence {
  const now = params.now ?? new Date();
  const today = ymd(now);
  const t30 = ymd(new Date(now.getTime() - 30 * 86_400_000));
  const t90 = ymd(new Date(now.getTime() - 90 * 86_400_000));
  const t180 = ymd(new Date(now.getTime() - 180 * 86_400_000));

  const rows = params.cases;
  const cancelled = (r: AccountIntelCase) => st(r.status) === "cancelled";

  const productCounts = new Map<string, number>();
  const surgeonCounts = new Map<string, number>();
  let revenueSum = 0;
  /** Most recent case date on or before today (non-cancelled). */
  let lastPastCaseYmd: string | null = null;

  for (const r of rows) {
    if (cancelled(r)) continue;
    const er = Number(r.expected_revenue ?? 0);
    if (Number.isFinite(er) && er > 0) revenueSum += er;

    const cd = parseYmd(r.case_date);
    if (cd && cd <= today && (!lastPastCaseYmd || cd > lastPastCaseYmd)) lastPastCaseYmd = cd;

    if (r.product_id) {
      const pid = String(r.product_id);
      productCounts.set(pid, (productCounts.get(pid) || 0) + 1);
    }
    if (r.surgeon_contact_id) {
      const sid = String(r.surgeon_contact_id);
      surgeonCounts.set(sid, (surgeonCounts.get(sid) || 0) + 1);
    }
  }

  const cases_by_product = [...productCounts.entries()]
    .map(([product_id, count]) => ({
      product_id,
      name: params.productNameById.get(product_id) || product_id,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  let top_surgeon: AccountIntelligence["top_surgeon"] = null;
  for (const [contact_id, case_count] of surgeonCounts) {
    if (!top_surgeon || case_count > top_surgeon.case_count) {
      top_surgeon = {
        contact_id,
        name: params.contactNameById.get(contact_id) || contact_id,
        case_count,
      };
    }
  }

  const terminal = new Set(["closed", "cancelled", "complete", "completed", "invoiced"]);
  const scheduleActive = new Set(["scheduled", "rescheduled", "confirmed"]);
  const upcomingAll = rows.filter((r) => {
    if (cancelled(r)) return false;
    const cd = parseYmd(r.case_date);
    if (!cd || cd < today) return false;
    return !terminal.has(st(r.status)) && scheduleActive.has(st(r.status));
  });
  const upcoming_case_count = upcomingAll.length;

  const upcoming_cases = upcomingAll
    .sort((a, b) => {
      const da = parseYmd(a.case_date)!;
      const db = parseYmd(b.case_date)!;
      return da.localeCompare(db);
    })
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      case_number: r.case_number,
      case_date: parseYmd(r.case_date)!,
      status: r.status,
      product_name: r.product_id ? params.productNameById.get(String(r.product_id)) ?? null : null,
    }));

  const insights: string[] = [];

  let maxRecentUpdate = "";
  let hadPastCaseDateInRolling30 = false;
  let anyNonCancelledCaseDate = false;
  for (const r of rows) {
    if (cancelled(r)) continue;
    const u = String(r.updated_at || "").slice(0, 10);
    if (u && u > maxRecentUpdate) maxRecentUpdate = u;
    const cd = parseYmd(r.case_date);
    if (cd) {
      anyNonCancelledCaseDate = true;
      if (cd <= today && cd >= t30) hadPastCaseDateInRolling30 = true;
    }
  }
  if (params.totalCaseCount > 0) {
    if (anyNonCancelledCaseDate && !hadPastCaseDateInRolling30) {
      insights.push("No cases in last 30 days — time to re-engage this organization.");
    } else if (!anyNonCancelledCaseDate && maxRecentUpdate && maxRecentUpdate < t30) {
      insights.push("No cases in last 30 days — time to re-engage this organization.");
    }
  }

  if (params.totalCaseCount >= 12) {
    insights.push("High volume account — prioritize retention and documentation hygiene.");
  }

  const productsLast90 = new Set<string>();
  const productsPrev90 = new Set<string>();
  for (const r of rows) {
    if (cancelled(r) || !r.product_id) continue;
    const pid = String(r.product_id);
    const cd = parseYmd(r.case_date);
    const anchor = cd || String(r.created_at).slice(0, 10);
    if (anchor >= t90) productsLast90.add(pid);
    if (anchor < t90 && anchor >= t180) productsPrev90.add(pid);
  }
  if (productsLast90.size > productsPrev90.size && productsPrev90.size > 0) {
    insights.push("Growing product adoption — more product lines in play vs the prior 90 days.");
  }

  return {
    total_cases: params.totalCaseCount,
    cases_by_product,
    top_surgeon,
    last_case_date: lastPastCaseYmd,
    upcoming_cases,
    upcoming_case_count,
    revenue_estimate_expected_total: Math.round(revenueSum * 100) / 100,
    insights,
  };
}
