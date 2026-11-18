/**
 * DIP review cards retained when UF is primary — workflow-owned sections only.
 */

import type { DebriefActionableReviewCard } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import type { DebriefReviewCardCategory } from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import type { DebriefIntelligenceCategory } from "@/lib/surgical-sales/debriefIntelligenceCategories";
import type { DebriefIntelligenceUpdateItem } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { CATEGORY_AWARE_MERGE_DB_KEYS } from "@/lib/surgical-sales/debriefIntelligenceMergeCategories";
import type { DebriefAtomicFactType } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";

/** Card categories owned by DIP when UF is review-primary. */
export const DIP_WORKFLOW_REVIEW_CARD_CATEGORIES: DebriefReviewCardCategory[] = [
  "workflow_participant",
  "observation_access",
  "organization_intelligence",
];

/** Card categories built from UF when review-primary flag is on. */
export const UF_PRIMARY_REVIEW_CARD_CATEGORIES: DebriefReviewCardCategory[] = [
  "clinical_focus",
  "product_intelligence",
];

const DIP_WORKFLOW_INTELLIGENCE_CATEGORIES = new Set<DebriefIntelligenceCategory>([
  "access_intelligence",
  "people_contacts",
  "workflow_intelligence",
]);

export function filterDipReviewCardsToWorkflowOnly(
  cards: DebriefActionableReviewCard[],
): DebriefActionableReviewCard[] {
  return cards.filter((card) => DIP_WORKFLOW_REVIEW_CARD_CATEGORIES.includes(card.category));
}

export function filterDipIntelligenceUpdatesToWorkflowOnly(
  updates: DebriefIntelligenceUpdateItem[],
): DebriefIntelligenceUpdateItem[] {
  return updates.filter((update) => DIP_WORKFLOW_INTELLIGENCE_CATEGORIES.has(update.primaryCategory));
}

/** Clinical/product/procedure intelligence rows — UF-owned when authority is on. */
export function filterDipIntelligenceUpdatesToIntelligenceOnly(
  updates: DebriefIntelligenceUpdateItem[],
): DebriefIntelligenceUpdateItem[] {
  return updates.filter((update) => !DIP_WORKFLOW_INTELLIGENCE_CATEGORIES.has(update.primaryCategory));
}

export const DIP_INTELLIGENCE_ATOMIC_FACT_TYPES = new Set<DebriefAtomicFactType>([
  "clinical_focus",
  "current_product",
  "product_fit",
]);

/** Provider/org CRM fields owned by UF projection — not DIP DebriefAtomicFact SoR. */
export const UF_INTELLIGENCE_FIELD_DB_KEYS = new Set<string>([
  ...CATEGORY_AWARE_MERGE_DB_KEYS,
  "provider_competitive_products",
  "provider_current_vendors",
  "provider_product_interests",
  "provider_observation_access_path",
  "provider_observation_credentialing_needed",
  "provider_scheduling_contact",
  "provider_communication_style",
  "provider_future_opportunity_signals",
  "provider_evaluation_openness",
]);

export function filterDipFieldUpdatesToWorkflowOnly(
  fieldUpdates: LogUpdateRoutedFieldUpdate[],
): LogUpdateRoutedFieldUpdate[] {
  return fieldUpdates.filter((update) => !UF_INTELLIGENCE_FIELD_DB_KEYS.has(update.dbKey));
}

export function filterDipFieldUpdatesToIntelligenceOnly(
  fieldUpdates: LogUpdateRoutedFieldUpdate[],
): LogUpdateRoutedFieldUpdate[] {
  return fieldUpdates.filter((update) => UF_INTELLIGENCE_FIELD_DB_KEYS.has(update.dbKey));
}

/** Strip DIP clinical/product atomic facts and field updates — retain DWP workflow only. */
export function stripDipLogUpdateToWorkflowOnly(logUpdate: LogUpdateParseResult): LogUpdateParseResult {
  const fieldUpdates = filterDipFieldUpdatesToWorkflowOnly(logUpdate.fieldUpdates);
  return {
    ...logUpdate,
    fieldUpdates,
    suggestedUpdates: fieldUpdates.map((update) => ({
      id: update.id,
      label: update.label,
      accepted: update.accepted,
    })),
    atomicFacts:
      logUpdate.atomicFacts?.filter((fact) => !DIP_INTELLIGENCE_ATOMIC_FACT_TYPES.has(fact.fact_type)) ??
      [],
  };
}
