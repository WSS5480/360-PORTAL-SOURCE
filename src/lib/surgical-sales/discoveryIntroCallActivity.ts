/**
 * Discovery intro call activity — real engagements only (not intelligence fields).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

const INTRO_CALL_TYPES = new Set(["intro_call", "follow_up", "reactivation"]);
const SCHEDULED_TOUCH_STATUSES = new Set([
  "scheduled",
  "confirmed",
  "in_progress",
  "active",
  "booked",
  "planned",
]);
const COMPLETED_TOUCH_STATUSES = new Set(["completed", "done", "closed"]);

export function isIntroCallScheduled(input: {
  upcomingEngagementType?: string | null;
  engagements?: ProviderEngagementSummary[];
}): boolean {
  const upcomingType = String(input.upcomingEngagementType ?? "").trim();
  if (upcomingType) {
    const normalized = normalizeEngagementType(upcomingType);
    if (INTRO_CALL_TYPES.has(normalized)) return true;
  }

  return (input.engagements ?? []).some((engagement) => {
    const type = normalizeEngagementType(String(engagement.engagement_type ?? ""));
    if (!INTRO_CALL_TYPES.has(type)) return false;
    return SCHEDULED_TOUCH_STATUSES.has(String(engagement.status ?? "").toLowerCase());
  });
}

export function isIntroCallCompleted(input: {
  engagements?: ProviderEngagementSummary[];
  lastContactedAt?: string | null;
}): boolean {
  const completedIntro = (input.engagements ?? []).some((engagement) => {
    const type = normalizeEngagementType(String(engagement.engagement_type ?? ""));
    if (!INTRO_CALL_TYPES.has(type)) return false;
    return COMPLETED_TOUCH_STATUSES.has(String(engagement.status ?? "").toLowerCase());
  });
  if (completedIntro) return true;

  return Boolean(String(input.lastContactedAt ?? "").trim());
}

export function isIntroCallScheduledOnDirectoryRow(p: ProviderDirectoryRow): boolean {
  return isIntroCallScheduled({
    upcomingEngagementType: p.upcoming_engagement?.engagement_type ?? null,
  });
}

export function isIntroCallCompletedOnDirectoryRow(p: ProviderDirectoryRow): boolean {
  return isIntroCallCompleted({
    lastContactedAt: p.last_contacted_at,
  });
}
