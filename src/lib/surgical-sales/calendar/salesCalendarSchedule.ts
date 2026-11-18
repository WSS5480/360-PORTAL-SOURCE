/**
 * Date/time resolution for Sales Command calendar events.
 */

export type ResolvedCalendarSchedule = {
  start: string;
  end?: string;
  allDay?: boolean;
};

const DEFAULT_TIMED_DURATION_MS = 60 * 60 * 1000;
const CASE_TIMED_DURATION_MS = 2 * 60 * 60 * 1000;
const TASK_TIMED_DURATION_MS = 30 * 60 * 1000;

function parseYmd(date: string): { y: number; m: number; d: number } | null {
  const trimmed = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  if (![y, m, d].every((n) => Number.isFinite(n))) return null;
  return { y, m, d };
}

function parseTimeParts(time: string): { hh: number; mm: number } | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return { hh, mm };
}

function localDateToIso(y: number, m: number, d: number, hh = 12, mm = 0): string {
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString();
}

function addMs(iso: string, deltaMs: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  return new Date(t + deltaMs).toISOString();
}

/** Combine YYYY-MM-DD + optional HH:MM(:SS) into a timed start, or all-day when time absent. */
export function resolveCalendarScheduleFromDateAndTime(input: {
  date: string | null | undefined;
  time?: string | null;
  timedDurationMs?: number;
  fallbackStart?: string;
}): ResolvedCalendarSchedule | null {
  const date = String(input.date ?? "").trim();
  if (!date) {
    if (input.fallbackStart) {
      return { start: input.fallbackStart, allDay: false };
    }
    return null;
  }

  const parts = parseYmd(date);
  if (!parts) return null;

  const time = String(input.time ?? "").trim();
  if (!time) {
    const noon = localDateToIso(parts.y, parts.m, parts.d, 12, 0);
    if (!noon) return null;
    return { start: noon, allDay: true };
  }

  const tp = parseTimeParts(time);
  if (!tp) {
    const noon = localDateToIso(parts.y, parts.m, parts.d, 12, 0);
    if (!noon) return null;
    return { start: noon, allDay: true };
  }

  const start = localDateToIso(parts.y, parts.m, parts.d, tp.hh, tp.mm);
  if (!start) return null;
  const duration = input.timedDurationMs ?? DEFAULT_TIMED_DURATION_MS;
  return { start, end: addMs(start, duration), allDay: false };
}

/** Prefer scheduled_at; fall back to engagement_date (all-day). */
export function resolveEngagementCalendarSchedule(input: {
  scheduled_at?: string | null;
  engagement_date?: string | null;
}): ResolvedCalendarSchedule | null {
  const scheduled = String(input.scheduled_at ?? "").trim();
  if (scheduled) {
    const d = new Date(scheduled);
    if (!Number.isNaN(d.getTime())) {
      return {
        start: d.toISOString(),
        end: addMs(d.toISOString(), DEFAULT_TIMED_DURATION_MS),
        allDay: false,
      };
    }
  }

  return resolveCalendarScheduleFromDateAndTime({
    date: input.engagement_date,
    timedDurationMs: DEFAULT_TIMED_DURATION_MS,
  });
}

export function resolveCaseCalendarSchedule(input: {
  case_date?: string | null;
  case_time?: string | null;
}): ResolvedCalendarSchedule | null {
  return resolveCalendarScheduleFromDateAndTime({
    date: input.case_date,
    time: input.case_time,
    timedDurationMs: CASE_TIMED_DURATION_MS,
  });
}

export function resolveTaskCalendarSchedule(dueDate: string): ResolvedCalendarSchedule | null {
  const schedule = resolveCalendarScheduleFromDateAndTime({
    date: dueDate,
    timedDurationMs: TASK_TIMED_DURATION_MS,
  });
  if (!schedule) return null;
  return { ...schedule, allDay: true };
}

/** Approved time-off spans start_date through end_date (inclusive, all-day). */
export function resolveTimeOffCalendarSchedule(input: {
  start_date: string;
  end_date: string;
}): ResolvedCalendarSchedule | null {
  const startParts = parseYmd(String(input.start_date).slice(0, 10));
  const endParts = parseYmd(String(input.end_date).slice(0, 10));
  if (!startParts || !endParts) return null;

  const start = localDateToIso(startParts.y, startParts.m, startParts.d, 12, 0);
  const end = localDateToIso(endParts.y, endParts.m, endParts.d, 12, 0);
  if (!start || !end) return null;

  return { start, end: end < start ? start : end, allDay: true };
}

export function buildSalesCalendarEventId(
  sourceType: string,
  sourceId: string,
  suffix?: string,
): string {
  const base = `${sourceType}:${sourceId}`;
  return suffix ? `${base}:${suffix}` : base;
}
