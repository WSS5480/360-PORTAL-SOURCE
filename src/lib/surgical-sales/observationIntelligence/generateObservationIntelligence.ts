import type { ObservationLearningCategoryId } from "./observationLearningTypes";
import type { ObservationFact } from "./observationFactTypes";
import { normalizeFactsToFindings } from "./normalizedObservationFindings";

export type GeneratedIntelligenceFinding = {
  categoryId: ObservationLearningCategoryId;
  label: string;
  normalizedFindingId: string;
};

/** Step 2 — collapse facts into deduplicated normalized findings. */
export function generateObservationIntelligenceFromFacts(
  facts: ObservationFact[],
): GeneratedIntelligenceFinding[] {
  return normalizeFactsToFindings(facts).map((finding) => ({
    categoryId: finding.categoryId,
    label: finding.label,
    normalizedFindingId: finding.normalizedFindingId,
  }));
}

export function groupIntelligenceFindingsByCategory(
  findings: GeneratedIntelligenceFinding[],
): Record<ObservationLearningCategoryId, Array<{ label: string; normalizedFindingId: string }>> {
  const buckets: Record<ObservationLearningCategoryId, Array<{ label: string; normalizedFindingId: string }>> = {
    competitor_products: [],
    workflow_findings: [],
    provider_pain_points: [],
    staff_pain_points: [],
    staff_workflow: [],
    product_fit_signals: [],
    current_products: [],
  };

  const seenByCategory = new Map<ObservationLearningCategoryId, Set<string>>();

  for (const finding of findings) {
    const seen = seenByCategory.get(finding.categoryId) ?? new Set<string>();
    if (seen.has(finding.normalizedFindingId)) continue;
    seen.add(finding.normalizedFindingId);
    seenByCategory.set(finding.categoryId, seen);
    buckets[finding.categoryId].push({
      label: finding.label,
      normalizedFindingId: finding.normalizedFindingId,
    });
  }

  // Legacy competitor_products bucket: mirror product findings for downstream consumers.
  for (const finding of buckets.current_products) {
    if (finding.normalizedFindingId.startsWith("product_in_use:")) {
      const seen = seenByCategory.get("competitor_products") ?? new Set<string>();
      if (!seen.has(finding.normalizedFindingId)) {
        seen.add(finding.normalizedFindingId);
        seenByCategory.set("competitor_products", seen);
        buckets.competitor_products.push(finding);
      }
    }
  }

  return buckets;
}
