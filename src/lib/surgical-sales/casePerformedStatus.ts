/** Calendar date in the viewer's local timezone (YYYY-MM-DD). */
export function localCalendarYmd(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function normalizeCaseDateYmd(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  return s.slice(0, 10);
}

/** True when the case date is strictly before today (local calendar). */
export function isCaseDateInThePast(caseDate: unknown, todayYmd = localCalendarYmd()): boolean {
  const ymd = normalizeCaseDateYmd(caseDate);
  if (!ymd) return false;
  return ymd < todayYmd;
}

/** Final (non-draft) save status: past dates are logged as already performed. */
export function resolveNewCaseFinalSaveStatus(
  caseDate: unknown,
  todayYmd = localCalendarYmd(),
): "scheduled" | "completed" {
  return isCaseDateInThePast(caseDate, todayYmd) ? "completed" : "scheduled";
}

/**
 * When marking a case completed, use the entered actual quantity, otherwise
 * treat expected quantity as “happened as planned”.
 */
export function resolvedActualQuantityForCompletedLine(expected: unknown, actual: unknown): number | null {
  if (actual !== null && actual !== undefined && actual !== "") {
    const n = Number(actual);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  if (expected !== null && expected !== undefined && expected !== "") {
    const n = Number(expected);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

function parseNonNegativeMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Booked amount for a performed case: actual if entered, otherwise expected
 * (so “revenue per case” rolls into booked without a second entry).
 */
export function resolvedBookedRevenueForCase(expected: unknown, actual: unknown): number {
  const act = parseNonNegativeMoney(actual);
  if (act != null) return act;
  return parseNonNegativeMoney(expected) ?? 0;
}

/** Persist expected as actual when completing, unless actual is already set. */
export function actualRevenueToPersistOnComplete(expected: unknown, actual: unknown): number | null {
  const act = parseNonNegativeMoney(actual);
  if (act != null) return act;
  const exp = parseNonNegativeMoney(expected);
  if (exp != null && exp > 0) return exp;
  return null;
}
