import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  deriveMissionBoardDebriefCardPrimaryCta,
  providerDebriefNotesComplete,
} from "@/lib/surgical-sales/missionBoardDebriefCardStatus";

export type ProviderDebriefEngagementPreview = {
  id: string;
  status: string;
  debrief_completed?: boolean;
  prepared_at?: string | null;
  planning_status?: string | null;
};

export function providerHasActiveDebriefEngagement(provider: Record<string, unknown>): boolean {
  const debrief = resolveProviderDebriefEngagementPreview(provider as ProviderDirectoryRow);
  if (!debrief) return false;
  const status = debrief.status.trim().toLowerCase();
  if (debrief.debrief_completed || status === "completed" || status === "cancelled") return false;
  return status === "planned" || status === "in_progress" || status === "active" || status === "scheduled";
}

export function resolveProviderDebriefEngagementPreview(
  provider: ProviderDirectoryRow,
): ProviderDebriefEngagementPreview | null {
  const dedicated = provider.provider_debrief_engagement;
  if (dedicated?.id) {
    return {
      id: String(dedicated.id),
      status: String(dedicated.status ?? "planned"),
      debrief_completed: Boolean(dedicated.debrief_completed),
      prepared_at: dedicated.prepared_at ?? null,
      planning_status: dedicated.planning_status ?? null,
    };
  }

  const upcoming = provider.upcoming_engagement;
  if (upcoming?.id && isProviderDebriefEngagement(String(upcoming.engagement_type ?? ""))) {
    return {
      id: String(upcoming.id),
      status: String(upcoming.status ?? "planned"),
      debrief_completed: Boolean(upcoming.debrief_completed),
      prepared_at: (upcoming as { prepared_at?: string | null }).prepared_at ?? null,
      planning_status: (upcoming as { planning_status?: string | null }).planning_status ?? null,
    };
  }

  return null;
}

export function deriveMissionBoardDebriefCardLabel(
  debrief: ProviderDebriefEngagementPreview | null,
): string {
  return deriveMissionBoardDebriefCardPrimaryCta(debrief).label;
}

export function providerDebriefEngagementIsComplete(debrief: ProviderDebriefEngagementPreview | null): boolean {
  return providerDebriefNotesComplete(debrief);
}
