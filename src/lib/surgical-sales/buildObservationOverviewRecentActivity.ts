import {
  groupObservationActivities,
  type GroupedObservationActivity,
} from "@/lib/surgical-sales/buildObservationGroupedActivity";

export const OBSERVATION_OVERVIEW_ACTIVITY_MAX = 3;

export type ObservationOverviewActivityItem = GroupedObservationActivity;

type ActivityInput = {
  id: string;
  activity_type: string;
  body: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
  actor_display_name?: string;
};

export function buildObservationOverviewRecentActivity(
  activities: ActivityInput[] | undefined,
  defaultActor: string,
  limit = OBSERVATION_OVERVIEW_ACTIVITY_MAX,
): ObservationOverviewActivityItem[] {
  return groupObservationActivities(activities, defaultActor, limit);
}
export function formatObservationOverviewActivityTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
