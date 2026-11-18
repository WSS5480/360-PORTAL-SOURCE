/**
 * Calendar navigation and range helpers (local timezone).
 */

import type { SalesCalendarEvent, SalesCalendarViewMode } from "@/lib/surgical-sales/calendar/salesCalendarTypes";

export function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function addDaysLocal(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeekMondayLocal(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDayLocal(addDaysLocal(d, diff));
}

export function endOfWeekSundayLocal(weekStart: Date): Date {
  return startOfDayLocal(addDaysLocal(weekStart, 6));
}

export function startOfMonthLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonthLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function addMonthsLocal(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
}

export function eventYmdLocal(event: SalesCalendarEvent): string {
  const d = new Date(event.start);
  if (Number.isNaN(d.getTime())) return "";
  return ymdLocal(d);
}

export function eventOccursOnYmd(event: SalesCalendarEvent, ymd: string): boolean {
  const startYmd = eventYmdLocal(event);
  if (!startYmd) return false;
  if (startYmd === ymd) return true;
  const endYmd = eventEndYmdLocal(event);
  if (endYmd === startYmd) return false;
  return ymd >= startYmd && ymd <= endYmd;
}

export function eventsForYmd(events: SalesCalendarEvent[], ymd: string): SalesCalendarEvent[] {
  return events.filter((e) => eventOccursOnYmd(e, ymd));
}

export function eventEndYmdLocal(event: SalesCalendarEvent): string {
  if (event.end) {
    const endYmd = ymdLocal(new Date(event.end));
    if (endYmd) return endYmd;
  }
  return eventYmdLocal(event);
}

export function eventOverlapsYmdRange(event: SalesCalendarEvent, rangeStartYmd: string, rangeEndYmd: string): boolean {
  const startYmd = eventYmdLocal(event);
  if (!startYmd) return false;
  const endYmd = eventEndYmdLocal(event);
  return endYmd >= rangeStartYmd && startYmd <= rangeEndYmd;
}

export function eventsInRange(
  events: SalesCalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): SalesCalendarEvent[] {
  const startYmd = ymdLocal(rangeStart);
  const endYmd = ymdLocal(rangeEnd);
  return events.filter((e) => eventOverlapsYmdRange(e, startYmd, endYmd));
}

export function ymdsSpannedByEvent(event: SalesCalendarEvent): string[] {
  const startYmd = eventYmdLocal(event);
  if (!startYmd) return [];
  const endYmd = eventEndYmdLocal(event);
  if (!event.allDay || endYmd <= startYmd) return [startYmd];

  const days: string[] = [];
  let cursor = startYmd;
  while (cursor <= endYmd) {
    days.push(cursor);
    cursor = ymdLocal(addDaysLocal(new Date(`${cursor}T12:00:00`), 1));
  }
  return days;
}

export function getVisibleRange(
  viewMode: SalesCalendarViewMode,
  anchorDate: Date,
): { start: Date; end: Date } {
  if (viewMode === "today") {
    const start = startOfDayLocal(anchorDate);
    return { start, end: start };
  }
  if (viewMode === "week") {
    const start = startOfWeekMondayLocal(anchorDate);
    return { start, end: endOfWeekSundayLocal(start) };
  }
  if (viewMode === "month") {
    const start = startOfMonthLocal(anchorDate);
    return { start, end: endOfMonthLocal(anchorDate) };
  }
  const start = startOfDayLocal(anchorDate);
  const end = addDaysLocal(start, 60);
  return { start, end };
}

export function shiftAnchor(
  viewMode: SalesCalendarViewMode,
  anchorDate: Date,
  direction: -1 | 1,
): Date {
  if (viewMode === "today") {
    return addDaysLocal(anchorDate, direction);
  }
  if (viewMode === "week") {
    return addDaysLocal(anchorDate, direction * 7);
  }
  if (viewMode === "month") {
    return addMonthsLocal(anchorDate, direction);
  }
  return addDaysLocal(anchorDate, direction * 14);
}

export function formatCalendarRangeLabel(viewMode: SalesCalendarViewMode, anchorDate: Date): string {
  if (viewMode === "today") {
    const ymd = ymdLocal(anchorDate);
    const today = ymdLocal(new Date());
    const label = anchorDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return ymd === today ? `Today · ${label}` : label;
  }
  if (viewMode === "agenda") return "Upcoming";

  if (viewMode === "month") {
    return anchorDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  const weekStart = startOfWeekMondayLocal(anchorDate);
  const weekEnd = endOfWeekSundayLocal(weekStart);
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();
  const sameMonth = sameYear && weekStart.getMonth() === weekEnd.getMonth();

  const startFmt = weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endFmt = weekEnd.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startFmt}–${endFmt}`;
}

export function weekDayColumns(anchorDate: Date): Array<{ ymd: string; date: Date; label: string; dayNum: number }> {
  const weekStart = startOfWeekMondayLocal(anchorDate);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return labels.map((label, i) => {
    const date = addDaysLocal(weekStart, i);
    return {
      ymd: ymdLocal(date),
      date,
      label,
      dayNum: date.getDate(),
    };
  });
}

export function monthGridDays(anchorDate: Date): Array<{ ymd: string; date: Date; inMonth: boolean }> {
  const monthStart = startOfMonthLocal(anchorDate);
  const monthEnd = endOfMonthLocal(anchorDate);
  const gridStart = startOfWeekMondayLocal(monthStart);
  const cells: Array<{ ymd: string; date: Date; inMonth: boolean }> = [];
  let cursor = gridStart;
  while (cells.length < 42) {
    const inMonth = cursor >= monthStart && cursor <= monthEnd;
    cells.push({ ymd: ymdLocal(cursor), date: new Date(cursor), inMonth });
    cursor = addDaysLocal(cursor, 1);
    if (cells.length >= 35 && cursor > monthEnd && cursor.getDay() === 1) break;
  }
  while (cells.length < 42) {
    cells.push({ ymd: ymdLocal(cursor), date: new Date(cursor), inMonth: false });
    cursor = addDaysLocal(cursor, 1);
  }
  return cells;
}

export function formatEventTimeShort(event: SalesCalendarEvent): string {
  if (event.allDay) return "All day";
  const d = new Date(event.start);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatAgendaDateHeader(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  const today = ymdLocal(new Date());
  if (ymd === today) return "Today";
  const tomorrow = ymdLocal(addDaysLocal(new Date(), 1));
  if (ymd === tomorrow) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function groupEventsByYmd(events: SalesCalendarEvent[]): Map<string, SalesCalendarEvent[]> {
  const map = new Map<string, SalesCalendarEvent[]>();
  for (const event of events) {
    for (const ymd of ymdsSpannedByEvent(event)) {
      const list = map.get(ymd) ?? [];
      list.push(event);
      map.set(ymd, list);
    }
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.start.localeCompare(b.start));
  }
  return map;
}

export function isTodayYmd(ymd: string): boolean {
  return ymd === ymdLocal(new Date());
}
