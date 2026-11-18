import { formatSurgicalCaseActivityType } from "@/lib/surgical-sales/caseActivityLabels";
import { observationCaseHasProductInterest } from "@/lib/surgical-sales/buildObservationOverviewBrief";

export type ObservationActivityInput = {
  id: string;
  activity_type: string;
  body: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
  actor_display_name?: string;
};

export type GroupedObservationActivity = {
  id: string;
  timestamp: string;
  actor: string;
  label: string;
  preview: string;
  count?: number;
};

const GROUPABLE_ACTIVITY_TYPES = new Set(["case_updated"]);

const NON_MEANINGFUL_ACTIVITY_TYPES = new Set(["billing_update"]);

const PRODUCT_LOGISTICS_ACTIVITY_TYPES = new Set(["product_updated"]);

function isMeaningfulActivity(
  activity: ObservationActivityInput,
  hasProductInterest: boolean,
): boolean {
  const rawType = String(activity.activity_type ?? "").trim().toLowerCase();
  if (NON_MEANINGFUL_ACTIVITY_TYPES.has(rawType)) return false;
  if (!hasProductInterest && PRODUCT_LOGISTICS_ACTIVITY_TYPES.has(rawType)) return false;
  return true;
}

function activityPreview(activity: ObservationActivityInput): string {
  const body = String(activity.body ?? "").trim();
  if (body) {
    return body.length > 140 ? `${body.slice(0, 137)}…` : body;
  }

  const meta = activity.metadata_json;
  if (meta && typeof meta === "object") {
    const next = (meta as { new_values?: { status?: unknown } }).new_values?.status;
    if (typeof next === "string" && next.trim()) {
      return `Status updated to ${next.replace(/_/g, " ")}`;
    }
  }

  return "";
}

function activityLabel(activity: ObservationActivityInput): string {
  const rawType = String(activity.activity_type ?? "").trim().toLowerCase();
  if (rawType === "note") return "Note";
  if (rawType === "case_updated") return "Case details updated";
  return formatSurgicalCaseActivityType(activity.activity_type);
}

function isGroupable(activity: ObservationActivityInput): boolean {
  return GROUPABLE_ACTIVITY_TYPES.has(String(activity.activity_type ?? "").trim().toLowerCase());
}

function toGroupedItem(
  activity: ObservationActivityInput,
  defaultActor: string,
  count?: number,
): GroupedObservationActivity {
  const baseLabel = activityLabel(activity);
  const label = count && count > 1 ? `${baseLabel} ${count} times` : baseLabel;
  return {
    id: count && count > 1 ? `group:${activity.id}:${count}` : activity.id,
    timestamp: activity.created_at,
    actor: activity.actor_display_name?.trim() || defaultActor || "Rep",
    label,
    preview: count && count > 1 ? "" : activityPreview(activity) || baseLabel,
    count: count && count > 1 ? count : undefined,
  };
}

/** Collapse duplicate system updates (e.g. repeated case_updated) into one summary row. */
export function groupObservationActivities(
  activities: ObservationActivityInput[] | undefined,
  defaultActor: string,
  limit = 3,
  options?: { caseRow?: Record<string, unknown> },
): GroupedObservationActivity[] {
  const hasProductInterest = observationCaseHasProductInterest(options?.caseRow ?? {});
  const sorted = [...(activities ?? [])]
    .filter((activity) => isMeaningfulActivity(activity, hasProductInterest))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const result: GroupedObservationActivity[] = [];
  const summarizedGroupTypes = new Set<string>();
  let index = 0;

  while (index < sorted.length && result.length < limit) {
    const current = sorted[index];
    if (!isGroupable(current)) {
      result.push(toGroupedItem(current, defaultActor));
      index += 1;
      continue;
    }

    const activityType = String(current.activity_type).trim().toLowerCase();
    if (summarizedGroupTypes.has(activityType)) {
      index += 1;
      continue;
    }

    const groupCount = sorted.filter(
      (activity) =>
        isGroupable(activity) && String(activity.activity_type).trim().toLowerCase() === activityType,
    ).length;

    result.push(toGroupedItem(current, defaultActor, groupCount > 1 ? groupCount : undefined));
    summarizedGroupTypes.add(activityType);

    while (
      index < sorted.length &&
      isGroupable(sorted[index]!) &&
      String(sorted[index]!.activity_type).trim().toLowerCase() === activityType
    ) {
      index += 1;
    }
  }

  return result;
}

export function formatObservationGroupedActivityTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
