import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  formatEngagementMissionWhenLabel,
} from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";
import {
  normalizeEngagementType,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import { missionEngagementTypeLabel } from "@/lib/surgical-sales/missionEngagementTypeLabels";
import { buildProviderMissionOpenSignals } from "@/lib/surgical-sales/providerDirectoryOperations";
import { assessEngagementSalesExecutionNeedsAction } from "@/lib/surgical-sales/salesExecutionNeedsAction";

export type ProviderUpcomingEngagementSource = {
  id: string;
  engagement_type?: string | null;
  status?: string | null;
  engagement_date?: string | null;
  scheduled_at?: string | null;
  observation_goal?: string | null;
  pre_call_hospital_name?: string | null;
  organization_id?: string | null;
  organization_name?: string | null;
  case_id?: string | null;
  prepared_at?: string | null;
  planning_status?: string | null;
};

export type ProviderMissionEngagementOpenItem = {
  id: string;
  label: string;
};

export type ProviderMissionEngagementPreview = {
  id: string;
  href: string;
  /** Canonical engagement type for pathway next-action logic. */
  engagement_type?: string | null;
  status?: string | null;
  debrief_completed?: boolean;
  prepared_at?: string | null;
  planning_status?: string | null;
  type_label: string;
  datetime_label: string;
  location_label: string;
  primary_goal: string;
  open_items: ProviderMissionEngagementOpenItem[];
};

const MISSION_ENGAGEMENT_DEFAULT_GOALS: Partial<Record<EngagementType, string>> = {
  intro_call: "Validate workflow fit",
  observation_request: "Schedule observation",
  or_visit: "Observe fixation technique",
  follow_up: "Confirm next step",
  product_demo: "Confirm product interest",
  evaluation_planning: "Confirm product interest",
  evaluation_follow_up: "Confirm product interest",
  office_visit_360: "Structured hands-on evaluation",
  in_service_training: "Confirm training outcomes",
  post_case_follow_up: "Close post-case follow-up",
  reactivation: "Re-engage provider relationship",
};

const FACILITY_ENGAGEMENT_TYPES = new Set<EngagementType>([
  "observation_request",
  "or_visit",
  "in_service_training",
]);

const VIRTUAL_ENGAGEMENT_TYPES = new Set<EngagementType>([
  "intro_call",
  "follow_up",
  "product_demo",
  "evaluation_planning",
  "evaluation_follow_up",
  "reactivation",
]);

function trimOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

export { missionEngagementTypeLabel } from "@/lib/surgical-sales/missionEngagementTypeLabels";

export function deriveMissionEngagementPrimaryGoal(engagement: ProviderUpcomingEngagementSource): string {
  const explicit = trimOrNull(engagement.observation_goal);
  if (explicit) return explicit;

  const normalized = normalizeEngagementType(engagement.engagement_type);
  if (normalized && MISSION_ENGAGEMENT_DEFAULT_GOALS[normalized]) {
    return MISSION_ENGAGEMENT_DEFAULT_GOALS[normalized];
  }
  return "Advance pathway execution";
}

export function deriveMissionEngagementLocation(
  engagement: ProviderUpcomingEngagementSource,
  provider: Pick<ProviderDirectoryRow, "primary_organization_name">,
): string {
  const hospital = trimOrNull(engagement.pre_call_hospital_name);
  if (hospital) return hospital;

  const organization =
    trimOrNull(engagement.organization_name) || trimOrNull(provider.primary_organization_name);
  if (organization) return organization;

  const normalized = normalizeEngagementType(engagement.engagement_type);
  if (normalized === "office_visit_360") return "360 Experience site";
  if (normalized && VIRTUAL_ENGAGEMENT_TYPES.has(normalized)) return "Virtual";
  return "Location TBD";
}

function observationSectionIncomplete(provider: ProviderDirectoryRow): boolean {
  const obs = provider.planning_completion?.sections?.find((s) => s.id === "observation_readiness");
  if (!obs) return true;
  return obs.status !== "complete" && obs.confidence !== "validated" && obs.confidence !== "confirmed";
}

function schedulingOwnerUnknown(provider: ProviderDirectoryRow): boolean {
  const obs = provider.planning_completion?.sections?.find((s) => s.id === "observation_readiness");
  if (!obs) return true;
  if (obs.status === "complete" || obs.confidence === "validated" || obs.confidence === "confirmed") {
    return false;
  }
  return true;
}

function credentialingUnknown(provider: ProviderDirectoryRow): boolean {
  const obs = provider.planning_completion?.sections?.find((s) => s.id === "observation_readiness");
  if (!obs) return true;
  return obs.status !== "complete" && obs.confidence !== "validated";
}

export function buildProviderMissionEngagementOpenItems(
  engagement: ProviderUpcomingEngagementSource,
  provider: ProviderDirectoryRow,
): ProviderMissionEngagementOpenItem[] {
  const normalized = normalizeEngagementType(engagement.engagement_type);
  const candidates: ProviderMissionEngagementOpenItem[] = [];

  if (!engagement.engagement_date && !engagement.scheduled_at) {
    candidates.push({ id: "date", label: "Engagement date not set" });
  }

  if (normalized === "observation_request" && !trimOrNull(engagement.case_id)) {
    candidates.push({ id: "obs", label: "Observation not scheduled" });
  }

  if (!trimOrNull(engagement.observation_goal)) {
    candidates.push({ id: "goal", label: "Primary goal not set" });
  }

  const seen = new Set(candidates.map((item) => item.id));
  for (const signal of buildProviderMissionOpenSignals(provider)) {
    if (candidates.length >= 2) break;
    if (seen.has(signal.id)) continue;
    candidates.push(signal);
    seen.add(signal.id);
  }

  const engagementItems = assessEngagementSalesExecutionNeedsAction({
    engagement_type: engagement.engagement_type ?? undefined,
    status: engagement.status ?? undefined,
  }).items.map((item) => ({
    id: item.id,
    label: item.label,
  }));

  for (const item of engagementItems) {
    if (candidates.length >= 2) break;
    if (seen.has(item.id)) continue;
    candidates.push(item);
    seen.add(item.id);
  }

  return candidates.slice(0, 2);
}

export function buildProviderMissionEngagementPreview(
  engagement: ProviderUpcomingEngagementSource,
  provider: ProviderDirectoryRow,
): ProviderMissionEngagementPreview {
  const id = String(engagement.id);
  return {
    id,
    href: `/portal/sales/engagements/${encodeURIComponent(id)}`,
    engagement_type: engagement.engagement_type ?? null,
    status: engagement.status ?? null,
    prepared_at: engagement.prepared_at ?? null,
    planning_status: engagement.planning_status ?? null,
    type_label: missionEngagementTypeLabel(engagement.engagement_type),
    datetime_label: formatEngagementMissionWhenLabel({
      engagement_date: engagement.engagement_date,
      scheduled_at: engagement.scheduled_at,
    }),
    location_label: deriveMissionEngagementLocation(engagement, provider),
    primary_goal: deriveMissionEngagementPrimaryGoal(engagement),
    open_items: buildProviderMissionEngagementOpenItems(engagement, provider),
  };
}

export function providerHasUpcomingEngagement(provider: ProviderDirectoryRow): boolean {
  return (provider.upcoming_engagement_count ?? 0) > 0 || Boolean(provider.upcoming_engagement);
}
