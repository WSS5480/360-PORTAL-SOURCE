/**
 * Calendar UI labels, badge tones, and recommended actions.
 */

import { buildEngagementDebriefHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { formatSurgicalCaseType, isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import type { SalesCalendarEvent, SalesCalendarEventSourceType } from "@/lib/surgical-sales/calendar/salesCalendarTypes";
import { eventYmdLocal, eventEndYmdLocal, formatEventTimeShort } from "@/lib/surgical-sales/calendar/salesCalendarDateUtils";

export type CalendarEventChip = {
  key: string;
  label: string;
  variant: "type" | "debrief" | "prep" | "follow" | "status";
};

export function uniqueCalendarChips(chips: CalendarEventChip[]): CalendarEventChip[] {
  const seen = new Set<string>();
  return chips.filter((chip) => {
    const token = `${chip.variant}:${chip.label.trim().toLowerCase()}`;
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
}

export function calendarEventTypeClass(
  event: SalesCalendarEvent,
): "engagement" | "observation" | "product_support" | "time_off" {
  const recordType = event.metadata?.recordType;
  if (recordType === "time_off" || event.sourceType === "time_off") return "time_off";
  if (recordType === "observation") return "observation";
  if (recordType === "case") return "product_support";
  return "engagement";
}

export function calendarEventTypeLabel(event: SalesCalendarEvent): string {
  const recordType = event.metadata?.recordType;
  if (recordType === "time_off" || event.sourceType === "time_off") return "Time off";
  if (recordType === "engagement" && event.metadata?.engagementType) {
    return formatEngagementType(String(event.metadata.engagementType ?? ""));
  }
  if (recordType === "observation") return "Observation";
  if (recordType === "case" && event.metadata?.caseType) {
    return isSurgicalObservationCase(event.metadata.caseType)
      ? "Observation"
      : formatSurgicalCaseType(event.metadata.caseType);
  }
  if (event.needsFollowUp || event.sourceType === "follow_up") return "Follow-up";
  if (
    (event.sourceType === "debrief" || event.sourceType === "prep") &&
    recordType === "engagement" &&
    event.metadata?.engagementType
  ) {
    return formatEngagementType(String(event.metadata.engagementType ?? ""));
  }
  return calendarSourceTypeLabel(event.sourceType);
}

export function buildCalendarEventChips(
  event: SalesCalendarEvent,
  options?: { includeStatus?: boolean },
): CalendarEventChip[] {
  const chips: CalendarEventChip[] = [
    { key: "type", label: calendarEventTypeLabel(event), variant: "type" },
  ];

  if (event.requiresDebrief) {
    chips.push({
      key: "debrief-needed",
      label: calendarDebriefStatusLabel(event),
      variant: "debrief",
    });
  }

  if (event.requiresPrep) {
    chips.push({
      key: "prep-needed",
      label: calendarPrepStatusLabel(event),
      variant: "prep",
    });
  }

  if (event.needsFollowUp) {
    chips.push({ key: "follow-up", label: "Follow-up", variant: "follow" });
  }

  if (options?.includeStatus && event.status?.trim()) {
    chips.push({
      key: `status-${event.status}`,
      label: event.status.trim(),
      variant: "status",
    });
  }

  return uniqueCalendarChips(chips);
}

export function calendarSourceTypeLabel(sourceType: SalesCalendarEventSourceType): string {
  const map: Record<SalesCalendarEventSourceType, string> = {
    engagement: "Engagement",
    observation: "Observation",
    case: "Case",
    follow_up: "Follow-up",
    prep: "Prep",
    debrief: "Debrief",
    time_off: "Time off",
  };
  return map[sourceType] ?? sourceType;
}

export type CalendarBadgeTone = "engagement" | "observation" | "case" | "follow_up" | "prep" | "debrief" | "time_off" | "muted";

export function calendarEventBadgeTone(event: SalesCalendarEvent): CalendarBadgeTone {
  if (event.metadata?.recordType === "time_off" || event.sourceType === "time_off") return "time_off";
  if (event.requiresDebrief) return "debrief";
  if (event.requiresPrep) return "prep";
  if (event.needsFollowUp || event.sourceType === "follow_up") return "follow_up";
  const recordType = event.metadata?.recordType;
  if (recordType === "observation" || event.sourceType === "observation") return "observation";
  if (recordType === "case" || event.sourceType === "case") return "case";
  return "engagement";
}

export function calendarEventSubtitle(event: SalesCalendarEvent): string | null {
  const parts = [event.providerName, event.organizationName].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function calendarEventWhenLabel(event: SalesCalendarEvent): string {
  const d = new Date(event.start);
  if (Number.isNaN(d.getTime())) return "";

  const startYmd = eventYmdLocal(event);
  const endYmd = eventEndYmdLocal(event);
  if (event.allDay && startYmd && endYmd && startYmd !== endYmd) {
    const fmt = (ymd: string) =>
      new Date(`${ymd}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    return `${fmt(startYmd)} – ${fmt(endYmd)} · All day`;
  }

  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (event.allDay) return `${date} · All day`;
  return `${date} · ${formatEventTimeShort(event)}`;
}

export function calendarNextRecommendedAction(event: SalesCalendarEvent): string {
  if (event.metadata?.recordType === "time_off") {
    return "You're marked out — coordinate coverage for any field work on these dates.";
  }
  if (event.requiresDebrief) return "Debrief while details are fresh.";
  if (event.requiresPrep) return "Complete prep before the touch.";
  if (event.needsFollowUp) return "Close the loop on this follow-up.";
  const st = String(event.status ?? "").toLowerCase();
  if (st.includes("pending") || st === "planned" || st === "scheduled") {
    return "Confirm logistics and ownership before the date.";
  }
  if (st === "confirmed") return "Run the touch and document outcomes.";
  if (st === "completed") return "Review the record and plan the next step.";
  return "Open the source record for full context.";
}

export function calendarPrepStatusLabel(event: SalesCalendarEvent): string {
  if (event.requiresPrep) return "Prep needed";
  if (event.metadata?.preparedAt || event.metadata?.debriefCompleted === false) {
    /* noop */
  }
  if (!event.requiresPrep && (event.metadata?.recordType === "engagement" || event.metadata?.recordType === "case")) {
    return "Prep complete";
  }
  return event.requiresPrep ? "Prep needed" : "No prep flag";
}

export function calendarDebriefStatusLabel(event: SalesCalendarEvent): string {
  if (event.requiresDebrief) return "Debrief needed";
  if (event.metadata?.debriefCompleted) return "Debrief complete";
  return "No debrief flag";
}

export function eventRecordHref(event: SalesCalendarEvent): string {
  const href = event.metadata?.href;
  return typeof href === "string" ? href : "/portal/sales";
}

export function eventPrepareHref(event: SalesCalendarEvent): string | null {
  const href = event.metadata?.prepareHref;
  if (typeof href === "string") return href;
  if (event.metadata?.recordType === "engagement") {
    return `/portal/sales/engagements/${encodeURIComponent(event.sourceId)}/prepare`;
  }
  return null;
}

export function eventDebriefHref(event: SalesCalendarEvent): string | null {
  const prepare = eventPrepareHref(event);
  if (!prepare) return null;
  const reviewMode = Boolean(event.metadata?.debriefCompleted);
  const engagementId = prepare.match(/\/engagements\/([^/]+)/)?.[1];
  if (!engagementId) {
    return reviewMode ? `${prepare}?panel=debrief&mode=review` : `${prepare}?panel=debrief`;
  }
  return buildEngagementDebriefHref(engagementId, reviewMode);
}
