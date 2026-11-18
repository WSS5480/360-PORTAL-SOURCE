/** Rep-facing labels and grouping for Debrief Prepare timeline display only. */

export const DEBRIEF_PREP_POTENTIAL_TOPIC_CONCEPTS = [
  "visualization_or_access_issue",
  "sizing_or_fit_issue",
  "inventory_availability_issue",
  "workflow_or_timing_issue",
  "placement_or_positioning_issue",
  "training_or_familiarity_issue",
  "product_performance_issue",
] as const;

export const DEBRIEF_PREP_POSITIVE_CONTEXT_CONCEPTS = [
  "staff_workflow",
  "no_issue_or_routine",
  "case_outcome",
] as const;

const CONCEPT_REP_LABELS: Record<string, string> = {
  visualization_or_access_issue: "Visualization or access",
  sizing_or_fit_issue: "Sizing or fit",
  inventory_availability_issue: "Inventory availability",
  workflow_or_timing_issue: "Workflow or timing",
  placement_or_positioning_issue: "Placement or positioning",
  training_or_familiarity_issue: "Training or familiarity",
  product_performance_issue: "Product performance",
  staff_workflow: "Staff workflow",
  no_issue_or_routine: "Routine case — no issues noted",
  case_outcome: "Case outcome",
  current_product: "Current product",
  competitor_product: "Competitor product",
  provider_sentiment: "Provider sentiment",
  product_interest: "Product interest",
  access_pathway: "Access pathway",
  contact_role: "Contact role",
  credentialing_requirement: "Credentialing requirement",
  support_needed: "Support needed",
  next_action: "Next action",
  procedure_volume_trend: "Procedure volume trend",
  procedure_focus: "Procedure focus",
  technology_preference: "Technique / modality",
  requested_item: "Requested item",
  unavailable_item: "Unavailable item",
  alternative_used: "Alternative used",
  unknown: "Other note",
};

export function isDebriefPrepPotentialTopicConcept(concept: string): boolean {
  return (DEBRIEF_PREP_POTENTIAL_TOPIC_CONCEPTS as readonly string[]).includes(concept);
}

export function isDebriefPrepPositiveContextConcept(concept: string): boolean {
  return (DEBRIEF_PREP_POSITIVE_CONTEXT_CONCEPTS as readonly string[]).includes(concept);
}

export function formatDebriefPrepareConceptRepLabel(concept: string): string {
  return CONCEPT_REP_LABELS[concept] ?? humanizeConceptId(concept);
}

function humanizeConceptId(concept: string): string {
  return concept
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatDebriefPrepareCaseCount(count: number): string {
  return count === 1 ? "1 case" : `${count} cases`;
}
