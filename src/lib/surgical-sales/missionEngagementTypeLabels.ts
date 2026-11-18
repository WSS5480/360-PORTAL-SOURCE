import {
  formatEngagementType,
  normalizeEngagementType,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";

/** Mission-board / card labels — may differ from generic engagement type labels. */
const MISSION_ENGAGEMENT_TYPE_LABELS: Partial<Record<EngagementType, string>> = {
  intro_call: "Intro Meeting",
  observation_request: "Observation Access Request",
  or_visit: "Observation",
  follow_up: "Follow-Up",
  product_demo: "Product Evaluation",
  evaluation_planning: "Product Evaluation",
  evaluation_follow_up: "Product Evaluation",
  office_visit_360: "360 Experience",
  in_service_training: "In-Service / Training",
  post_case_follow_up: "Case Review",
  reactivation: "Reactivation",
  preference_card_discussion: "Preference Card Discussion",
  peer_discussion: "Surgeon Education",
};

export function missionEngagementTypeLabel(rawType: string | null | undefined): string {
  const normalized = normalizeEngagementType(rawType);
  if (normalized && MISSION_ENGAGEMENT_TYPE_LABELS[normalized]) {
    return MISSION_ENGAGEMENT_TYPE_LABELS[normalized];
  }
  return formatEngagementType(rawType) || "Engagement";
}
