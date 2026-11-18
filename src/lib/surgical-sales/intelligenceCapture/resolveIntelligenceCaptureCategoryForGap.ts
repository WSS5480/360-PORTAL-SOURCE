import { resolveStageMappingSignalForDbKey } from "@/lib/surgical-sales/discoveryMappingIntelligenceItem";
import {
  intelligenceCaptureCategoryForSignal,
  type IntelligenceCaptureCategoryId,
} from "@/lib/surgical-sales/intelligenceCaptureCategories";

const GAP_QUESTION_CATEGORY: Record<string, IntelligenceCaptureCategoryId> = {
  "gap-provider-pain": "clinical_challenges",
  "gap-staff-pain": "clinical_challenges",
  "gap-workflow-validation": "procedure_workflow",
  "gap-product-confirmation": "opportunity_signals",
};

const DB_KEY_CATEGORY_FALLBACK: Partial<Record<string, IntelligenceCaptureCategoryId>> = {
  provider_dissatisfaction_areas: "clinical_challenges",
  provider_workflow_pain_points: "procedure_workflow",
  provider_staff_frustrations: "clinical_challenges",
  provider_competitive_products: "opportunity_signals",
  provider_procedure_focus: "clinical_focus",
  provider_future_opportunity_signals: "opportunity_signals",
  provider_preference_card_signals: "product_fit_evaluation",
  provider_case_volume_estimate: "adoption_strategy",
};

export function resolveIntelligenceCaptureCategoryForDbKey(
  dbKey: string,
): IntelligenceCaptureCategoryId {
  const signalId = resolveStageMappingSignalForDbKey(dbKey);
  if (signalId) {
    const fromSignal = intelligenceCaptureCategoryForSignal(signalId);
    if (fromSignal) return fromSignal;
  }
  return DB_KEY_CATEGORY_FALLBACK[dbKey] ?? "clinical_challenges";
}

export function resolveIntelligenceCaptureCategoryForGapQuestion(
  questionId: string,
): IntelligenceCaptureCategoryId | null {
  const mapped = GAP_QUESTION_CATEGORY[questionId];
  if (mapped) return mapped;

  if (questionId.startsWith("gap-provider_")) {
    return resolveIntelligenceCaptureCategoryForDbKey(questionId.slice(4));
  }

  return null;
}
