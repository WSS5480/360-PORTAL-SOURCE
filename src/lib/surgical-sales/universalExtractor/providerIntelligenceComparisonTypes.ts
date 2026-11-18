export type ProviderIntelligenceComparisonTopicRow = {
  concept: string;
  label: string;
  observed_count: number;
  validated_count: number;
  evidence_snippet: string | null;
};

export type ProviderIntelligenceComparisonSnapshot = {
  topics: ProviderIntelligenceComparisonTopicRow[];
  has_data: boolean;
};

/** Stable display order for side-by-side provider intelligence comparison. */
export const PROVIDER_INTELLIGENCE_COMPARISON_CONCEPT_ORDER = [
  "visualization_or_access_issue",
  "sizing_or_fit_issue",
  "inventory_availability_issue",
  "workflow_or_timing_issue",
  "placement_or_positioning_issue",
  "training_or_familiarity_issue",
  "product_performance_issue",
  "staff_workflow",
  "case_outcome",
  "no_issue_or_routine",
  "current_product",
  "competitor_product",
  "provider_sentiment",
  "support_needed",
  "requested_item",
  "unavailable_item",
  "alternative_used",
  "next_action",
  "unknown",
] as const;

const PROVIDER_INTELLIGENCE_COMPARISON_LABELS: Record<string, string> = {
  visualization_or_access_issue: "Visualization & Access",
  sizing_or_fit_issue: "Sizing & Fit",
  inventory_availability_issue: "Inventory Availability",
  workflow_or_timing_issue: "Workflow & Timing",
  placement_or_positioning_issue: "Placement & Positioning",
  training_or_familiarity_issue: "Training & Familiarity",
  product_performance_issue: "Product Performance",
  staff_workflow: "Staff Workflow",
  case_outcome: "Case Outcome",
  no_issue_or_routine: "Routine Case",
  current_product: "Current Product",
  competitor_product: "Competitor Product",
  provider_sentiment: "Provider Sentiment",
  support_needed: "Support Needed",
  requested_item: "Requested Item",
  unavailable_item: "Unavailable Item",
  alternative_used: "Alternative Used",
  next_action: "Next Action",
  unknown: "Other",
};

export function formatProviderIntelligenceComparisonLabel(concept: string): string {
  return (
    PROVIDER_INTELLIGENCE_COMPARISON_LABELS[concept] ??
    concept
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function sortProviderIntelligenceComparisonTopics(
  topics: ProviderIntelligenceComparisonTopicRow[],
): ProviderIntelligenceComparisonTopicRow[] {
  const order = new Map(
    PROVIDER_INTELLIGENCE_COMPARISON_CONCEPT_ORDER.map((concept, index) => [concept, index]),
  );

  return [...topics].sort((left, right) => {
    const leftOrder = order.get(left.concept as (typeof PROVIDER_INTELLIGENCE_COMPARISON_CONCEPT_ORDER)[number]);
    const rightOrder = order.get(right.concept as (typeof PROVIDER_INTELLIGENCE_COMPARISON_CONCEPT_ORDER)[number]);
    if (leftOrder != null && rightOrder != null) return leftOrder - rightOrder;
    if (leftOrder != null) return -1;
    if (rightOrder != null) return 1;
    return left.label.localeCompare(right.label);
  });
}
