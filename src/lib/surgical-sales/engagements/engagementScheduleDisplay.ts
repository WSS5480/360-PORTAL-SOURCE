/**
 * Engagement date/time display and persistence helpers.
 * Date-only engagements show "Time TBD"; scheduled_at is set only when a time is provided.
 */

export const ENGAGEMENT_TIME_TBD_LABEL = "Time TBD";
export const ENGAGEMENT_DATE_TBD_LABEL = "Date TBD";

const MS_PER_DAY = 86_400_000;

export type EngagementScheduleFields = {
  engagement_date?: string | null;
  scheduled_at?: string | null;
};

/** True when a concrete meeting time exists (not date-only). */
export function hasEngagementScheduledTime(row: EngagementScheduleFields): boolean {
  const scheduled = String(row.scheduled_at ?? "").trim();
  if (!scheduled) return false;
  const d = new Date(scheduled);
  if (Number.isNaN(d.getTime())) return false;
  return true;
}

export function formatEngagementDateLabel(row: EngagementScheduleFields): string | null {
  const dateOnly = String(row.engagement_date ?? "").trim();
  if (dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const d = new Date(`${dateOnly}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  const scheduled = String(row.scheduled_at ?? "").trim();
  if (scheduled) {
    const d = new Date(scheduled);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  return null;
}

export function formatEngagementTimeLabel(row: EngagementScheduleFields): string | null {
  if (!hasEngagementScheduledTime(row)) return null;
  const d = new Date(String(row.scheduled_at));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Primary "when" line for lists and cards. */
export function formatEngagementWhenLabel(row: EngagementScheduleFields): string {
  const dateLabel = formatEngagementDateLabel(row);
  if (!dateLabel) return ENGAGEMENT_DATE_TBD_LABEL;
  const timeLabel = formatEngagementTimeLabel(row);
  if (timeLabel) return `${dateLabel} · ${timeLabel}`;
  return `${dateLabel} · ${ENGAGEMENT_TIME_TBD_LABEL}`;
}

/** Compact date for tab rows (no time suffix). */
export function formatEngagementTabDateLabel(row: EngagementScheduleFields): string {
  return formatEngagementDateLabel(row) ?? ENGAGEMENT_DATE_TBD_LABEL;
}

/** Tactical overview touch line — date with time or Time TBD; no date → "Scheduled". */
export function formatEngagementTouchWhenLabel(row: EngagementScheduleFields): string {
  const dateLabel = formatEngagementDateLabel(row);
  if (!dateLabel) return "Scheduled";
  const timeLabel = formatEngagementTimeLabel(row);
  const today = new Date();
  const dateOnly = String(row.engagement_date ?? "").trim();
  const compareDate = dateOnly
    ? new Date(`${dateOnly}T12:00:00`)
    : new Date(String(row.scheduled_at ?? ""));
  const sameDay =
    !Number.isNaN(compareDate.getTime()) &&
    compareDate.getFullYear() === today.getFullYear() &&
    compareDate.getMonth() === today.getMonth() &&
    compareDate.getDate() === today.getDate();

  if (timeLabel) {
    if (sameDay) return `Today ${timeLabel}`;
    return `${dateLabel} · ${timeLabel}`;
  }
  if (sameDay) return `Today · ${ENGAGEMENT_TIME_TBD_LABEL}`;
  return `${dateLabel} · ${ENGAGEMENT_TIME_TBD_LABEL}`;
}

/** Rep-facing when line for mission cards — Today / Tomorrow / date. */
export function formatEngagementMissionWhenLabel(row: EngagementScheduleFields): string {
  const dateOnly = String(row.engagement_date ?? "").trim();
  const scheduled = String(row.scheduled_at ?? "").trim();
  const compareDate = dateOnly
    ? new Date(`${dateOnly}T12:00:00`)
    : scheduled
      ? new Date(scheduled)
      : null;

  if (!compareDate || Number.isNaN(compareDate.getTime())) {
    return ENGAGEMENT_DATE_TBD_LABEL;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(compareDate);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
  const timeLabel = formatEngagementTimeLabel(row);
  const fullDate = compareDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: compareDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });

  if (diffDays === 0) {
    return timeLabel ? `Today ${timeLabel}` : `Today · ${ENGAGEMENT_TIME_TBD_LABEL}`;
  }
  if (diffDays === 1) {
    return timeLabel ? `Tomorrow ${timeLabel}` : `Tomorrow · ${ENGAGEMENT_TIME_TBD_LABEL}`;
  }
  if (timeLabel) return `${fullDate} · ${timeLabel}`;
  return fullDate;
}

export function combineEngagementDateAndTimeToScheduledAt(
  engagementDate: string,
  engagementTime: string,
): string | null {
  const date = engagementDate.trim();
  const time = engagementTime.trim();
  if (!date || !time) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const timeMatch = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!timeMatch) return null;
  const [y, m, d] = date.split("-").map((n) => Number(n));
  const hh = Number(timeMatch[1]);
  const mm = Number(timeMatch[2]);
  if (![y, m, d, hh, mm].every((n) => Number.isFinite(n))) return null;
  const local = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

/** Schedule fields for an engagement starting immediately (today + now). */
export function buildEngagementScheduleFieldsForNow(): {
  engagement_date: string;
  scheduled_at: string;
} {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return {
    engagement_date: `${y}-${m}-${d}`,
    scheduled_at: now.toISOString(),
  };
}

export function buildEngagementScheduleFieldsFromBasics(input: {
  engagement_date: string;
  engagement_time: string;
}): { engagement_date: string | null; scheduled_at: string | null } {
  const date = input.engagement_date.trim();
  const time = input.engagement_time.trim();
  if (!date) {
    return { engagement_date: null, scheduled_at: null };
  }
  if (!time) {
    return { engagement_date: date, scheduled_at: null };
  }
  return {
    engagement_date: date,
    scheduled_at: combineEngagementDateAndTimeToScheduledAt(date, time),
  };
}

export function formatEngagementWhenLabelFromBasics(input: {
  engagement_date: string;
  engagement_time: string;
}): string {
  const fields = buildEngagementScheduleFieldsFromBasics(input);
  return formatEngagementWhenLabel(fields);
}
