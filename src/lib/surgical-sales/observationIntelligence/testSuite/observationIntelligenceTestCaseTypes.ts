import type { ObservationFactType } from "../observationFactTypes";
import type { ObservationLearningCategoryId } from "../observationLearningTypes";
import type { EvidencePillarId } from "../scoreObservationEvidence";

export type ObservationIntelligenceTestCategory =
  | "competitor_product_discovery"
  | "workflow_bottlenecks"
  | "provider_frustrations"
  | "staff_frustrations"
  | "staff_efficiency"
  | "product_fit_opportunities"
  | "negative_observations"
  | "ambiguous_observations"
  | "mixed_observations"
  | "dedupe_observations";

export type ObservationIntelligenceTestCase = {
  id: string;
  name: string;
  category: ObservationIntelligenceTestCategory;
  note: string;
  expectedFactTypes: ObservationFactType[];
  forbiddenFactTypes?: ObservationFactType[];
  expectedIntelligenceCategories: ObservationLearningCategoryId[];
  forbiddenCategories?: ObservationLearningCategoryId[];
  expectedNormalizedFindingIds?: string[];
  forbiddenNormalizedFindingIds?: string[];
  maxFindingsPerCategory?: Partial<Record<ObservationLearningCategoryId, number>>;
  requiresLlmFallback?: boolean;
  crossCaseNotes?: Array<{ caseId: string; note: string }>;
  expectedObservationCount?: Record<string, number>;
  expectedEvidence: Record<EvidencePillarId, boolean>;
  expectedEvidenceCount: number;
};

export const OBSERVATION_INTELLIGENCE_TEST_CATEGORY_LABELS: Record<
  ObservationIntelligenceTestCategory,
  string
> = {
  competitor_product_discovery: "Competitor Product Discovery",
  workflow_bottlenecks: "Workflow Bottlenecks",
  provider_frustrations: "Provider Frustrations",
  staff_frustrations: "Staff Frustrations",
  staff_efficiency: "Staff Efficiency",
  product_fit_opportunities: "Product Fit Opportunities",
  negative_observations: "Negative Observations",
  ambiguous_observations: "Ambiguous Observations",
  mixed_observations: "Mixed Observations",
  dedupe_observations: "Dedupe Observations",
};

export const NO_EVIDENCE: Record<EvidencePillarId, boolean> = {
  provider_pain_points: false,
  staff_pain_points: false,
  workflow_findings: false,
  current_products: false,
  product_fit_signals: false,
};
