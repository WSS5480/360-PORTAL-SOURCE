/**
 * Field time waste prevention — proactive guard on failed OR / field visits.
 */

export const FIELD_TIME_WASTE_PREVENTION_TITLE = "Field time waste prevention";
export const FIELD_TIME_WASTE_PREVENTION_KICKER =
  "Proactive scan before you book travel or OR time";
export const FIELD_TIME_WASTE_PREVENTION_QUESTION = "What could make this field visit fail?";

export const FIELD_TIME_WASTE_CATEGORY_IDS = [
  "failed_observation",
  "missing_access_pathway",
  "low_quality_cases",
  "wrong_procedure_targeting",
  "weak_scheduling_pathway",
] as const;

export type FieldTimeWasteCategoryId = (typeof FIELD_TIME_WASTE_CATEGORY_IDS)[number];

export type FieldTimeWasteRiskLevel = "clear" | "watch" | "elevated" | "high" | "critical";

export const FIELD_TIME_WASTE_CATEGORY_LABELS: Record<FieldTimeWasteCategoryId, string> = {
  failed_observation: "Likely failed observation",
  missing_access_pathway: "Access pathway still learning",
  low_quality_cases: "Low-quality case opportunity",
  wrong_procedure_targeting: "Wrong procedure targeting",
  weak_scheduling_pathway: "Weak scheduling pathway",
};

export const FIELD_TIME_WASTE_LEVEL_LABELS: Record<FieldTimeWasteRiskLevel, string> = {
  clear: "Clear",
  watch: "Watch",
  elevated: "Elevated",
  high: "High",
  critical: "Critical",
};

export const FIELD_TIME_WASTE_POSTURE_LABELS = {
  protected: "Field time protected",
  validate_first: "Validate before deploying",
  hold_visit: "Hold field visit",
  do_not_deploy: "Do not deploy field time",
} as const;

export type FieldTimeWastePosture = keyof typeof FIELD_TIME_WASTE_POSTURE_LABELS;
