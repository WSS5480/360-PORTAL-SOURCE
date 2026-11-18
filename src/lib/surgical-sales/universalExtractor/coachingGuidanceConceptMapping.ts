/**
 * Semantic topic groups for OIE ↔ UF coaching-input comparison (Phase A evaluation).
 * Not used for production guidance — shadow compare only.
 */

export const OIE_COMMERCIAL_NORMALIZED_FINDING_IDS = new Set([
  "product_interest",
  "product_fit_visualization_fixation_workflow",
  "visualization_fixation_workflow_opportunity",
  "product_fit_opportunity",
]);

export const COACHING_GUIDANCE_TOPIC_GROUPS: Array<{
  topic: string;
  oieNormalizedFindingIds: string[];
  ufConcepts: string[];
  notes?: string;
}> = [
  {
    topic: "visualization_before_fixation",
    oieNormalizedFindingIds: [
      "workflow_visualization_before_fixation",
      "visualization_challenge",
    ],
    ufConcepts: ["visualization_or_access_issue"],
  },
  {
    topic: "positive_staff_workflow",
    oieNormalizedFindingIds: [
      "staff_efficiency_coordinated",
      "staff_efficiency_organized",
      "staff_efficiency_comfortable",
    ],
    ufConcepts: ["staff_workflow", "case_outcome"],
  },
  {
    topic: "staff_friction_or_delay",
    oieNormalizedFindingIds: [
      "staff_friction",
      "staff_supply_delay",
      "staff_supply_setup_delay",
      "workflow_delay",
      "room_turnover_delay",
    ],
    ufConcepts: [
      "workflow_or_timing_issue",
      "inventory_availability_issue",
      "alternative_used",
    ],
    notes: "OIE often routes implant unavailability to staff_supply_delay; UF may use alternative_used.",
  },
  {
    topic: "implant_sizing_or_fit",
    oieNormalizedFindingIds: ["product_fit_opportunity", "product_interest"],
    ufConcepts: ["sizing_or_fit_issue"],
    notes: "OIE may commercialize sizing discussion; UF captures sizing_or_fit_issue directly.",
  },
  {
    topic: "current_product_usage",
    oieNormalizedFindingIds: ["product_in_use"],
    ufConcepts: ["current_product"],
  },
  {
    topic: "competitor_product",
    oieNormalizedFindingIds: ["competitor_product"],
    ufConcepts: ["competitor_product"],
  },
  {
    topic: "provider_frustration",
    oieNormalizedFindingIds: ["provider_frustration"],
    ufConcepts: ["provider_sentiment"],
  },
  {
    topic: "product_performance",
    oieNormalizedFindingIds: ["product_performance_issue"],
    ufConcepts: ["product_performance_issue"],
  },
  {
    topic: "placement_or_positioning",
    oieNormalizedFindingIds: ["placement_or_positioning"],
    ufConcepts: ["placement_or_positioning_issue"],
  },
  {
    topic: "training_or_familiarity",
    oieNormalizedFindingIds: ["training_gap"],
    ufConcepts: ["training_or_familiarity_issue"],
  },
];

export function topicForOieNormalizedFindingId(id: string): string | null {
  const normalized = id.trim().toLowerCase();
  if (normalized.startsWith("product_in_use:")) {
    return "current_product_usage";
  }
  if (normalized.startsWith("competitor_product:")) {
    return "competitor_product";
  }
  for (const group of COACHING_GUIDANCE_TOPIC_GROUPS) {
    if (group.oieNormalizedFindingIds.some((candidate) => candidate === normalized)) {
      return group.topic;
    }
  }
  return null;
}

export function topicForUfConcept(concept: string): string | null {
  const normalized = concept.trim().toLowerCase();
  for (const group of COACHING_GUIDANCE_TOPIC_GROUPS) {
    if (group.ufConcepts.some((candidate) => candidate === normalized)) {
      return group.topic;
    }
  }
  return null;
}
