import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerHasUpcomingEngagement } from "@/lib/surgical-sales/buildProviderMissionEngagementPreview";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { deriveEvidenceBasedProviderFieldMission } from "@/lib/surgical-sales/relationshipStageProgression";
import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";
import { providerNeedsDebrief } from "@/lib/surgical-sales/salesExecutionNeedsAction";
import { providerDebriefReady } from "@/lib/surgical-sales/providerObservationProgress";

/** Mission health colors — action urgency, not metadata completeness. */
export type ProviderMissionHealth = "green" | "yellow" | "blue" | "red" | "neutral";

export type ProviderMissionHealthView = {
  health: ProviderMissionHealth;
  /** Short label for tooltips and screen readers. */
  label: string;
};

export const PROVIDER_MISSION_HEALTH_RANK: Record<ProviderMissionHealth, number> = {
  red: 0,
  blue: 1,
  yellow: 2,
  green: 3,
  neutral: 4,
};

export const PROVIDER_MISSION_HEALTH_LABEL: Record<ProviderMissionHealth, string> = {
  green: "On track",
  yellow: "Waiting on provider",
  blue: "Rep action needed",
  red: "Urgent",
  neutral: "Inactive",
};

const OBSERVATION_PREP_ENGAGEMENT_TYPES = new Set(["or_visit", "observation_request", "in_service_training"]);
const FOLLOW_UP_ENGAGEMENT_TYPES = new Set(["follow_up", "post_case_follow_up"]);
const PREP_URGENCY_DAYS = 2;

function trimOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return dt.toISOString().slice(0, 10);
}

export function isObservationFieldEngagementType(raw: string | null | undefined): boolean {
  const normalized = normalizeEngagementType(raw);
  return normalized !== null && OBSERVATION_PREP_ENGAGEMENT_TYPES.has(normalized);
}

export function isFollowUpEngagementType(raw: string | null | undefined): boolean {
  const normalized = normalizeEngagementType(raw);
  return normalized !== null && FOLLOW_UP_ENGAGEMENT_TYPES.has(normalized);
}

/** Execution prep gaps for the next field engagement — excludes admin metadata. */
export function computeUpcomingObservationPrepIncomplete(
  engagement: {
    engagement_type?: string | null;
    observation_goal?: string | null;
    case_id?: string | null;
  },
  provider: ProviderDirectoryRow,
): boolean {
  if (!isObservationFieldEngagementType(engagement.engagement_type)) return false;

  if (!trimOrNull(engagement.observation_goal)) return true;

  if (normalizeEngagementType(engagement.engagement_type) === "observation_request" && !trimOrNull(engagement.case_id)) {
    return true;
  }

  if (providerNeedsDebrief(provider)) return true;

  return false;
}

export function computeUpcomingObservationImminent(
  engagement: {
    engagement_date?: string | null;
    scheduled_at?: string | null;
    engagement_type?: string | null;
  },
  todayYmd: string,
): boolean {
  if (!isObservationFieldEngagementType(engagement.engagement_type)) return false;

  const scheduled = String(engagement.scheduled_at ?? "").trim();
  let targetYmd: string | null = null;
  if (scheduled) {
    targetYmd = scheduled.slice(0, 10);
  } else {
    const dateOnly = String(engagement.engagement_date ?? "").trim();
    if (dateOnly) targetYmd = dateOnly.slice(0, 10);
  }
  if (!targetYmd) return false;

  const horizonEnd = addDaysYmd(todayYmd, PREP_URGENCY_DAYS);
  return targetYmd >= todayYmd && targetYmd <= horizonEnd;
}

function providerFollowUpRequestedUnscheduled(p: ProviderDirectoryRow): boolean {
  return Boolean(p.pending_follow_up_unscheduled);
}

function providerObservationImminentMissingPrep(p: ProviderDirectoryRow): boolean {
  return Boolean(p.upcoming_observation_imminent && p.upcoming_observation_prep_incomplete);
}

function observationApproved(p: ProviderDirectoryRow): boolean {
  const obs = p.planning_completion?.sections?.find((s) => s.id === "observation_readiness");
  return obs?.status === "complete" || obs?.confidence === "validated" || obs?.confidence === "confirmed";
}

/** Field execution mission — kept local to avoid circular imports with providerDirectoryOperations. */
export function deriveProviderFieldMissionForHealth(p: ProviderDirectoryRow): string {
  return deriveEvidenceBasedProviderFieldMission(p);
}

/** Canonical mission health for provider directory cards, tables, and priority dots. */
export function deriveProviderMissionHealth(p: ProviderDirectoryRow): ProviderMissionHealthView {
  if (p.archived_at) {
    return { health: "neutral", label: "Archived" };
  }
  if (p.onboarding_status === "draft") {
    return { health: "neutral", label: "Profile draft" };
  }

  if (isProviderSalesCustomer(p)) {
    if (providerFollowUpRequestedUnscheduled(p)) {
      return { health: "red", label: "Follow-up requested — not scheduled" };
    }
    if (providerObservationImminentMissingPrep(p)) {
      return { health: "red", label: "Observation approaching — prep incomplete" };
    }
    return { health: "green", label: "Customer" };
  }

  if (providerFollowUpRequestedUnscheduled(p)) {
    return { health: "red", label: "Follow-up requested — not scheduled" };
  }

  if (providerObservationImminentMissingPrep(p)) {
    return { health: "red", label: "Observation approaching — prep incomplete" };
  }

  const mission = deriveProviderFieldMissionForHealth(p);
  const hasUpcoming = providerHasUpcomingEngagement(p);

  if (mission === "Debrief Ready" || providerDebriefReady(p) || providerNeedsDebrief(p)) {
    return { health: "blue", label: "Debrief ready" };
  }

  if (mission === "Observation In Progress") {
    return { health: "green", label: "Observation in progress" };
  }

  if (mission === "Prospect Active") {
    return { health: "green", label: "Prospect active" };
  }

  if (mission === "Observation Complete") {
    return { health: "green", label: "Debrief completed" };
  }

  if (mission === "Observation Scheduled" && hasUpcoming && !p.upcoming_observation_prep_incomplete) {
    return { health: "green", label: "Observation scheduled" };
  }

  if (hasUpcoming || mission === "Discovery — Approved") {
    return { health: "blue", label: "Discovery milestone met" };
  }

  if (mission === "Discovery In Progress") {
    return { health: "yellow", label: "Discovery in progress" };
  }

  if (mission === "Intro Call Needed") {
    return { health: "yellow", label: "Waiting on provider response" };
  }

  return { health: "yellow", label: "Waiting on provider response" };
}

export function providerMissionHealthRank(p: ProviderDirectoryRow): number {
  return PROVIDER_MISSION_HEALTH_RANK[deriveProviderMissionHealth(p).health];
}

export type ProviderMissionBadge = {
  label: string;
  health: ProviderMissionHealth;
  healthLabel: string;
};

/** Scan-friendly mission badge for provider directory cards. */
export function deriveProviderMissionBadge(p: ProviderDirectoryRow): ProviderMissionBadge {
  const mission = deriveProviderFieldMissionForHealth(p);
  const { health, label: healthLabel } = deriveProviderMissionHealth(p);

  switch (mission) {
    case "Intro Call Needed":
      return { label: "Intro Call Needed", health, healthLabel };
    case "Discovery In Progress":
      return { label: "Discovery In Progress", health, healthLabel };
    case "Discovery — Approved":
      return { label: "Discovery — Approved", health, healthLabel };
    case "Observation Scheduled":
      return { label: "Observation Scheduled", health, healthLabel };
    case "Observation In Progress":
      return { label: "Observation In Progress", health, healthLabel };
    case "Observation Complete":
      return { label: "Observation Complete", health, healthLabel };
    case "Debrief Ready":
      return { label: "Debrief Ready", health, healthLabel };
    case "Prospect Active":
      return { label: "Prospect Active", health, healthLabel };
    case "Archived":
      return { label: "Archived", health, healthLabel };
    default:
      return { label: mission, health, healthLabel };
  }
}

export type ProviderOpsPriority = "overdue" | "waiting" | "progressing" | "action";

export const PROVIDER_OPS_PRIORITY_LABEL: Record<ProviderOpsPriority, string> = {
  overdue: "Urgent",
  action: "Rep action needed",
  waiting: "Waiting on provider",
  progressing: "On track",
};

/** Portfolio urgency indicator aligned with mission health colors. */
export function deriveProviderOpsPriority(p: ProviderDirectoryRow): ProviderOpsPriority {
  const { health } = deriveProviderMissionHealth(p);
  if (health === "red") return "overdue";
  if (health === "blue") return "action";
  if (health === "yellow") return "waiting";
  if (health === "green") return "progressing";
  return "waiting";
}
