import {
  formatEngagementDisplayStatus,
  formatEngagementDisplayStatusForRow,
} from "@/lib/surgical-sales/engagements/engagementStatusDisplay";

/**
 * Surgical sales engagements — interaction-scoped object that owns planning workflow.
 * A case may be linked later; planning can happen before any case exists.
 */

/** All types allowed in DB (includes legacy values for backward compatibility). */
export const ENGAGEMENT_TYPES = [
  "intro_call",
  "observation_request",
  "follow_up",
  "product_demo",
  "evaluation_planning",
  "evaluation_follow_up",
  "or_visit",
  "or_observation",
  "office_visit_360",
  "in_service_training",
  "preference_card_discussion",
  "post_case_follow_up",
  "provider_debrief",
  "reactivation",
  "peer_discussion",
] as const;

export type EngagementType = (typeof ENGAGEMENT_TYPES)[number];

/** MVP types shown in create/edit pickers (strategic + lightweight). */
export const MVP_STRATEGIC_ENGAGEMENT_TYPES = [
  "intro_call",
  "product_demo",
  "office_visit_360",
] as const satisfies readonly EngagementType[];

export const MVP_LIGHTWEIGHT_ENGAGEMENT_TYPES = [
  "follow_up",
  "in_service_training",
  "provider_debrief",
  "reactivation",
] as const satisfies readonly EngagementType[];

export const MVP_ENGAGEMENT_TYPES = [
  ...MVP_STRATEGIC_ENGAGEMENT_TYPES,
  ...MVP_LIGHTWEIGHT_ENGAGEMENT_TYPES,
] as const satisfies readonly EngagementType[];

export type MvpEngagementType = (typeof MVP_ENGAGEMENT_TYPES)[number];

/** Hidden from create/edit UI; existing records keep these values. */
export const HIDDEN_ENGAGEMENT_TYPES = [
  "evaluation_planning",
  "evaluation_follow_up",
  "preference_card_discussion",
  "observation_request",
  "or_visit",
  "post_case_follow_up",
] as const satisfies readonly EngagementType[];

export type HiddenEngagementType = (typeof HIDDEN_ENGAGEMENT_TYPES)[number];

/** @deprecated Renamed CRM values — normalized at read/write boundaries. */
export const LEGACY_ENGAGEMENT_TYPE_ALIASES: Record<string, EngagementType> = {
  follow_up_meeting: "follow_up",
  evaluation_discussion: "evaluation_planning",
  or_access_discussion: "or_visit",
  business_review: "office_visit_360",
};

/** Short picker / helper copy for MVP engagement types */
export const ENGAGEMENT_TYPE_DESCRIPTIONS: Partial<Record<EngagementType, string>> = {
  intro_call:
    "Map OR workflow, qualify observation candidacy, and surface access barriers — not a generic discovery call.",
  observation_request: "Secure access to observe a case with clear learning goals.",
  provider_debrief:
    "Prepare a provider conversation using observation intelligence.",
  product_demo: "Focused hands-on demo tied to evaluation criteria.",
  office_visit_360:
    "Structured 360 Medical hands-on evaluation — sim lab, demo, or provider office before OR commitment.",
  peer_discussion:
    "Surgeon-to-surgeon education touchpoint within the evaluation pathway.",
};

export const ENGAGEMENT_TYPE_LABELS: Record<EngagementType, string> = {
  intro_call: "Intro Call",
  observation_request: "Observation Access Request",
  follow_up: "Follow-Up",
  product_demo: "Product Demo",
  evaluation_planning: "Evaluation Planning",
  evaluation_follow_up: "Evaluation Follow-Up",
  or_visit: "Observation",
  or_observation: "Observation",
  office_visit_360: "360 Experience",
  in_service_training: "In-Service / Training",
  preference_card_discussion: "Preference Card Discussion",
  post_case_follow_up: "Case Review",
  provider_debrief: "Observation Debrief",
  reactivation: "Reactivation",
  peer_discussion: "Surgeon Education",
};

export const ENGAGEMENT_STATUSES = ["planned", "in_progress", "completed", "cancelled"] as const;

export type EngagementStatus = (typeof ENGAGEMENT_STATUSES)[number];

export const ENGAGEMENT_STATUS_LABELS: Record<EngagementStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Completed",
};

export function isHiddenEngagementType(type: EngagementType): type is HiddenEngagementType {
  return (HIDDEN_ENGAGEMENT_TYPES as readonly string[]).includes(type);
}

export function isSelectableEngagementType(raw: string | null | undefined): raw is MvpEngagementType {
  const normalized = normalizeEngagementType(raw);
  return Boolean(normalized && (MVP_ENGAGEMENT_TYPES as readonly string[]).includes(normalized));
}

export function normalizeEngagementType(raw: string | null | undefined): EngagementType | "" {
  const key = String(raw ?? "").trim();
  if (!key) return "";
  if ((ENGAGEMENT_TYPES as readonly string[]).includes(key)) return key as EngagementType;
  return LEGACY_ENGAGEMENT_TYPE_ALIASES[key] ?? "";
}

export function isEngagementType(raw: string | null | undefined): raw is EngagementType {
  return normalizeEngagementType(raw) !== "";
}

export function formatEngagementType(raw: string | null | undefined): string {
  const normalized = normalizeEngagementType(raw);
  if (normalized) return ENGAGEMENT_TYPE_LABELS[normalized];
  const key = String(raw ?? "").trim();
  if (key === "business_review") return ENGAGEMENT_TYPE_LABELS.office_visit_360;
  return key ? key.replace(/_/g, " ") : "Engagement";
}

export function formatEngagementStatus(
  raw: string | null | undefined,
  row?: Record<string, unknown>,
): string {
  if (row) return formatEngagementDisplayStatusForRow(row);
  const key = String(raw ?? "").trim() as EngagementStatus;
  if ((ENGAGEMENT_STATUSES as readonly string[]).includes(key)) {
    return formatEngagementDisplayStatus(key);
  }
  return key ? key.replace(/_/g, " ") : "—";
}

export function defaultEngagementTypeForCaseType(caseType: string | null | undefined): EngagementType {
  void caseType;
  return "follow_up";
}
