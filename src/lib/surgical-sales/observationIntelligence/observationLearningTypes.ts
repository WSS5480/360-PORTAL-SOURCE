export type ObservationLearningCategoryId =
  | "competitor_products"
  | "workflow_findings"
  | "provider_pain_points"
  | "staff_pain_points"
  | "staff_workflow"
  | "product_fit_signals"
  | "current_products";

export const OBSERVATION_LEARNING_CATEGORY_ORDER: ObservationLearningCategoryId[] = [
  "competitor_products",
  "workflow_findings",
  "provider_pain_points",
  "staff_pain_points",
  "staff_workflow",
  "product_fit_signals",
  "current_products",
];

export const OBSERVATION_LEARNING_CATEGORY_LABELS: Record<ObservationLearningCategoryId, string> = {
  competitor_products: "Competitor Products",
  workflow_findings: "Workflow Findings",
  provider_pain_points: "Provider Pain Points",
  staff_pain_points: "Staff Pain Points",
  staff_workflow: "Staff Workflow",
  product_fit_signals: "Product Fit Signals",
  current_products: "Current Products",
};

import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";

export type ObservationLearningFinding = AggregatedFindingEvidence;

export type ObservationLearningCategory = {
  id: ObservationLearningCategoryId;
  title: string;
  findings: ObservationLearningFinding[];
};
