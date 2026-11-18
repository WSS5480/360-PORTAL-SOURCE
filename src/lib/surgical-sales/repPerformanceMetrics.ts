/** UTC date YYYY-MM-DD from Date */
export function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday of the ISO week containing `d` (UTC). */
export function startOfIsoWeekMondayUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const dow = d.getUTCDay();
  const fromMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(Date.UTC(y, m, day + fromMon));
  return utcYmd(mon);
}

export function endOfIsoWeekFromMonday(mondayYmd: string): string {
  const [y, mo, da] = mondayYmd.split("-").map(Number);
  const sun = new Date(Date.UTC(y, (mo || 1) - 1, (da || 1) + 6));
  return utcYmd(sun);
}

export function startOfUtcMonth(d: Date): string {
  return utcYmd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

export function endOfUtcMonth(d: Date): string {
  return utcYmd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

function ymdInRange(ymd: string | null | undefined, start: string, end: string): boolean {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return false;
  const d = ymd.slice(0, 10);
  return d >= start && d <= end;
}

function tsInUtcMonth(isoTs: string, monthStart: string, monthEnd: string): boolean {
  const d = isoTs.slice(0, 10);
  return d >= monthStart && d <= monthEnd;
}

export type PerfCaseRow = {
  id: string;
  sales_rep_id: string;
  product_id: string | null;
  case_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type PerfActivityRow = {
  case_id: string;
  created_at: string;
  metadata_json: Record<string, unknown> | null;
};

function parseToStatus(meta: Record<string, unknown> | null | undefined): string | null {
  if (!meta || typeof meta !== "object") return null;
  const t = meta.to_status ?? meta["to_status"];
  return typeof t === "string" ? t.toLowerCase().trim() : null;
}

export function caseHasDocumentGap(status: string, docTypes: Set<string>): boolean {
  const s = String(status || "").toLowerCase();
  if (s === "cancelled") return false;
  const hasPo = docTypes.has("purchase_order");
  const hasInv = docTypes.has("invoice");
  if (["completed", "docs_needed", "billing_review", "invoiced", "closed"].includes(s) && !hasPo) return true;
  if (["invoiced", "closed"].includes(s) && !hasInv) return true;
  return false;
}

export type RepProductMix = { product_id: string; name: string; count: number };

export type RepPerformanceRow = {
  user_id: string;
  display_name: string;
  email: string | null;
  scheduled_this_week: number;
  scheduled_this_month: number;
  cases_completed_snapshot: number;
  closed_this_month: number;
  missing_docs_count: number;
  avg_days_completed_to_closed: number | null;
  samples_completed_to_closed: number;
  product_mix_top: RepProductMix[];
  activity_cases_last_30d: number;
  composite_score: number;
};

export type RepPerformanceHighlights = {
  top_performers: Array<{ user_id: string; display_name: string; reason: string }>;
  doc_risk: Array<{ user_id: string; display_name: string; reason: string }>;
  low_activity: Array<{ user_id: string; display_name: string; reason: string }>;
};

function compositeScore(r: RepPerformanceRow): number {
  return (
    r.closed_this_month * 10 +
    r.scheduled_this_month * 3 +
    r.scheduled_this_week * 2 +
    r.activity_cases_last_30d * 0.4 -
    r.missing_docs_count * 6
  );
}

/**
 * @param closedCaseActivities — status_change rows for cases that are currently `closed`, ordered by created_at ascending per case.
 */
export function buildRepPerformance(args: {
  now: Date;
  internalReps: Array<{ user_id: string; display_name: string; email: string | null }>;
  cases: PerfCaseRow[];
  docTypesByCase: Map<string, Set<string>>;
  /** status_change activities for closed cases only */
  closedCaseActivities: PerfActivityRow[];
  productNameBy: Map<string, string>;
}): { reps: RepPerformanceRow[]; highlights: RepPerformanceHighlights } {
  const { now, internalReps, cases, docTypesByCase, closedCaseActivities, productNameBy } = args;

  const weekStart = startOfIsoWeekMondayUtc(now);
  const weekEnd = endOfIsoWeekFromMonday(weekStart);
  const monthStart = startOfUtcMonth(now);
  const monthEnd = endOfUtcMonth(now);

  const repIds = new Set(internalReps.map((r) => r.user_id));
  const repById = new Map(internalReps.map((r) => [r.user_id, r]));

  const completedToCloseSamples = new Map<string, number[]>(); // rep_id -> day deltas

  const eventsByCase = new Map<string, PerfActivityRow[]>();
  for (const a of closedCaseActivities) {
    const cid = a.case_id;
    if (!eventsByCase.has(cid)) eventsByCase.set(cid, []);
    eventsByCase.get(cid)!.push(a);
  }
  for (const [, arr] of eventsByCase) {
    arr.sort((x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime());
  }

  const caseRep = new Map<string, string>();
  for (const c of cases) {
    caseRep.set(c.id, c.sales_rep_id);
  }

  for (const c of cases) {
    if (String(c.status).toLowerCase() !== "closed") continue;
    const repId = c.sales_rep_id;
    if (!repIds.has(repId)) continue;
    const evs = eventsByCase.get(c.id);
    if (!evs?.length) continue;
    let firstCompleted: string | null = null;
    let firstClosed: string | null = null;
    for (const a of evs) {
      const to = parseToStatus(a.metadata_json);
      if (!to) continue;
      if (to === "completed" && !firstCompleted) firstCompleted = a.created_at;
      if (to === "closed" && !firstClosed) firstClosed = a.created_at;
    }
    if (!firstCompleted || !firstClosed) continue;
    const t0 = new Date(firstCompleted).getTime();
    const t1 = new Date(firstClosed).getTime();
    if (!(t1 > t0)) continue;
    const days = (t1 - t0) / 86_400_000;
    if (!Number.isFinite(days) || days < 0 || days > 730) continue;
    if (!completedToCloseSamples.has(repId)) completedToCloseSamples.set(repId, []);
    completedToCloseSamples.get(repId)!.push(days);
  }

  const reps: RepPerformanceRow[] = [];

  for (const rep of internalReps) {
    const uid = rep.user_id;
    const own = cases.filter((c) => c.sales_rep_id === uid);

    let scheduled_this_week = 0;
    let scheduled_this_month = 0;
    let cases_completed_snapshot = 0;
    let closed_this_month = 0;
    let missing_docs_count = 0;
    const productCounts = new Map<string, number>();
    const activityCut = new Date(now.getTime() - 30 * 86_400_000).toISOString();
    const activityCaseIds = new Set<string>();

    for (const c of own) {
      const st = String(c.status || "").toLowerCase();
      const types = docTypesByCase.get(c.id) ?? new Set();

      if (st !== "cancelled" && ymdInRange(c.case_date, weekStart, weekEnd) && (st === "scheduled" || st === "confirmed")) {
        scheduled_this_week++;
      }
      if (st !== "cancelled" && ymdInRange(c.case_date, monthStart, monthEnd) && (st === "scheduled" || st === "confirmed")) {
        scheduled_this_month++;
      }
      if (st === "completed") cases_completed_snapshot++;
      if (st === "closed" && tsInUtcMonth(c.updated_at, monthStart, monthEnd)) {
        closed_this_month++;
      }
      if (caseHasDocumentGap(st, types)) missing_docs_count++;

      if (st !== "cancelled" && c.product_id) {
        const pid = String(c.product_id);
        productCounts.set(pid, (productCounts.get(pid) || 0) + 1);
      }

      if (c.updated_at >= activityCut || c.created_at >= activityCut) {
        activityCaseIds.add(c.id);
      }
    }

    const deltas = completedToCloseSamples.get(uid) || [];
    const samples_completed_to_closed = deltas.length;
    const avg_days_completed_to_closed =
      samples_completed_to_closed > 0 ? Math.round((deltas.reduce((a, b) => a + b, 0) / samples_completed_to_closed) * 10) / 10 : null;

    const product_mix_top = [...productCounts.entries()]
      .map(([product_id, count]) => ({
        product_id,
        name: productNameBy.get(product_id) || product_id,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5);

    const row: RepPerformanceRow = {
      user_id: uid,
      display_name: rep.display_name,
      email: rep.email,
      scheduled_this_week,
      scheduled_this_month,
      cases_completed_snapshot,
      closed_this_month,
      missing_docs_count,
      avg_days_completed_to_closed,
      samples_completed_to_closed,
      product_mix_top,
      activity_cases_last_30d: activityCaseIds.size,
      composite_score: 0,
    };
    row.composite_score = Math.round(compositeScore(row) * 10) / 10;
    reps.push(row);
  }

  reps.sort((a, b) => b.composite_score - a.composite_score || a.display_name.localeCompare(b.display_name));

  const withActivity = reps.filter((r) => r.activity_cases_last_30d > 0);
  const topPool = withActivity.length ? withActivity : reps;
  const top_performers = [...topPool]
    .sort((a, b) => b.composite_score - a.composite_score)
    .slice(0, 3)
    .map((r) => ({
      user_id: r.user_id,
      display_name: r.display_name,
      reason: `Score ${r.composite_score.toFixed(1)} · ${r.closed_this_month} closed (MTD) · ${r.scheduled_this_month} scheduled (case month)`,
    }));

  const docCandidates = [...reps].filter((r) => r.missing_docs_count >= 2).sort((a, b) => b.missing_docs_count - a.missing_docs_count);
  const doc_risk = docCandidates.slice(0, 8).map((r) => ({
    user_id: r.user_id,
    display_name: r.display_name,
    reason: `${r.missing_docs_count} case(s) missing PO or invoice for their current status — review document workflow.`,
  }));

  const acts = reps.map((r) => r.activity_cases_last_30d).sort((a, b) => a - b);
  const medianActivity = acts.length ? acts[Math.floor(acts.length / 2)]! : 0;
  const low_activity: RepPerformanceHighlights["low_activity"] = [];
  for (const r of reps) {
    const lifetime = cases.filter((c) => c.sales_rep_id === r.user_id).length;
    if (r.activity_cases_last_30d <= 1 && (lifetime >= 3 || medianActivity >= 3)) {
      low_activity.push({
        user_id: r.user_id,
        display_name: r.display_name,
        reason: `${r.activity_cases_last_30d} case(s) with updates in the last 30 days (median team: ${medianActivity}).`,
      });
    }
  }
  low_activity.sort((a, b) => a.display_name.localeCompare(b.display_name));

  return {
    reps,
    highlights: { top_performers, doc_risk, low_activity },
  };
}
