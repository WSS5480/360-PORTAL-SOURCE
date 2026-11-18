import {
  buildProductFitEntries,
  type ProductFitEntry,
  type ProductFitStatus,
} from "@/lib/surgical-sales/opportunityPipelineView";

const RELATED_PRODUCT_FIT_STATUSES = new Set<ProductFitStatus>(["validated", "investigating", "possible_fit"]);

export function buildProductSupportRelatedProductFits(input: {
  providerContact?: Record<string, unknown> | null;
  hasObservationEvidence?: boolean;
}): ProductFitEntry[] {
  return buildProductFitEntries({
    contact: input.providerContact ?? null,
    hasObservationEvidence: input.hasObservationEvidence ?? true,
  }).filter((fit) => RELATED_PRODUCT_FIT_STATUSES.has(fit.status));
}
