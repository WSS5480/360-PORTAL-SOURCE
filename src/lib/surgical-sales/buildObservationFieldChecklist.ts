import {
  buildObservationIntelligenceView,
  hasObservationIntelligenceContent,
} from "@/lib/surgical-sales/buildObservationIntelligenceView";

export type ObservationFieldChecklistItemId =
  | "products_identified"
  | "competitor_observed"
  | "workflow_issue_observed"
  | "provider_frustration_observed"
  | "staff_frustration_observed"
  | "opportunity_signal_identified";

export type ObservationFieldChecklistItem = {
  id: ObservationFieldChecklistItemId;
  label: string;
  checked: boolean;
};

export type ObservationFieldChecklistView = {
  title: string;
  items: ObservationFieldChecklistItem[];
  checkedCount: number;
  totalCount: number;
};

export const OBSERVATION_FIELD_CHECKLIST_TITLE = "Observation Checklist";

function fieldHasContent(value: unknown): boolean {
  return Boolean(String(value ?? "").trim());
}

function categoryCount(
  categories: Array<{ id: string; items: string[] }>,
  id: string,
): number {
  return categories.find((category) => category.id === id)?.items.length ?? 0;
}

export function buildObservationFieldChecklist(input: {
  caseRow: Record<string, unknown>;
}): ObservationFieldChecklistView {
  const intelligence = buildObservationIntelligenceView(input.caseRow);
  const categories = intelligence.categories;

  const productCount = categoryCount(categories, "product_fit_signals");
  const competitorCount = categoryCount(categories, "competitor_products");
  const workflowCount = categoryCount(categories, "workflow_friction");
  const providerCount =
    categoryCount(categories, "clinical_pain_points") +
    categoryCount(categories, "provider_behavior");
  const staffCount = categoryCount(categories, "staff_observations");
  const opportunityCount = categoryCount(categories, "growth_opportunities");

  const items: ObservationFieldChecklistItem[] = [
    {
      id: "products_identified",
      label: "Products identified",
      checked:
        productCount > 0 || fieldHasContent(input.caseRow.live_observation_product_fit),
    },
    {
      id: "competitor_observed",
      label: "Competitor observed",
      checked:
        competitorCount > 0 || fieldHasContent(input.caseRow.live_observation_competitors),
    },
    {
      id: "workflow_issue_observed",
      label: "Workflow issue observed",
      checked:
        workflowCount > 0 || fieldHasContent(input.caseRow.live_observation_workflow),
    },
    {
      id: "provider_frustration_observed",
      label: "Provider frustration observed",
      checked:
        providerCount > 0 ||
        fieldHasContent(input.caseRow.live_observation_clinical_pain_points) ||
        fieldHasContent(input.caseRow.live_observation_surgeon_reactions),
    },
    {
      id: "staff_frustration_observed",
      label: "Staff frustration observed",
      checked:
        staffCount > 0 || fieldHasContent(input.caseRow.live_observation_staff_process),
    },
    {
      id: "opportunity_signal_identified",
      label: "Opportunity signal identified",
      checked:
        opportunityCount > 0 ||
        fieldHasContent(input.caseRow.debrief_product_opportunity_identified) ||
        fieldHasContent(input.caseRow.observation_quick_finding_product_interest),
    },
  ];

  const checkedCount = items.filter((item) => item.checked).length;

  return {
    title: OBSERVATION_FIELD_CHECKLIST_TITLE,
    items,
    checkedCount,
    totalCount: items.length,
  };
}

export function observationFieldChecklistHasAnyCapture(caseRow: Record<string, unknown>): boolean {
  return hasObservationIntelligenceContent(caseRow);
}
