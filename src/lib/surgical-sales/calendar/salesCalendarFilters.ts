/**
 * Client-side filter helpers for Sales Command calendar events.
 */

import type {
  SalesCalendarEvent,
  SalesCalendarFilters,
  SalesCalendarRecordType,
} from "@/lib/surgical-sales/calendar/salesCalendarTypes";

function matchesText(haystack: string | undefined, needle: string): boolean {
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  return String(haystack ?? "").toLowerCase().includes(q);
}

function recordType(event: SalesCalendarEvent): SalesCalendarRecordType {
  const rt = event.metadata?.recordType;
  if (rt === "engagement" || rt === "observation" || rt === "case" || rt === "task" || rt === "time_off") {
    return rt;
  }
  if (event.sourceType === "case") return "case";
  if (event.sourceType === "observation") return "observation";
  if (event.sourceType === "follow_up") return "task";
  return "engagement";
}

export function filterSalesCalendarEvents(
  events: SalesCalendarEvent[],
  filters: SalesCalendarFilters,
): SalesCalendarEvent[] {
  return events.filter((event) => {
    const rt = recordType(event);

    if (!filters.engagements && rt === "engagement") return false;
    if (!filters.observations && (rt === "observation" || event.sourceType === "observation")) {
      return false;
    }
    if (!filters.cases && rt === "case" && event.sourceType !== "observation") return false;
    if (!filters.followUps) {
      if (rt === "task" || event.needsFollowUp || event.sourceType === "follow_up") return false;
    }
    if (!filters.timeOff && (rt === "time_off" || event.sourceType === "time_off")) return false;
    if (!filters.debriefsNeeded && event.requiresDebrief) return false;
    if (!filters.prepNeeded && event.requiresPrep) return false;

    if (filters.productFocus && !matchesText(event.productFocus, filters.productFocus)) {
      return false;
    }
    if (filters.organization && !matchesText(event.organizationName, filters.organization)) {
      return false;
    }
    if (filters.provider && !matchesText(event.providerName, filters.provider)) {
      return false;
    }
    if (filters.status && !matchesText(event.status, filters.status)) {
      return false;
    }

    return true;
  });
}
