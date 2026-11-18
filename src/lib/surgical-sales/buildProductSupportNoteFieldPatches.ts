import { appendObservationLiveFieldLine } from "@/lib/surgical-sales/appendObservationLiveFieldLine";
import type { ProductSupportObservationExtraction } from "@/lib/surgical-sales/extractProductSupportObservation";
import { productSupportObservationCaseField } from "@/lib/surgical-sales/extractProductSupportObservation";
import type { ProductSupportOutcomesExtraction } from "@/lib/surgical-sales/extractProductSupportOutcomesFromNote";
import {
  buildProductSupportCaseResultPatch,
  buildProductSupportNextStepPatch,
  buildProductSupportProviderReactionPatch,
} from "@/lib/surgical-sales/productSupportCaseMoments";

export function buildProductSupportClassificationFieldPatch(
  extraction: ProductSupportObservationExtraction,
  caseRow: Record<string, unknown>,
): Record<string, string> {
  const fieldKey = productSupportObservationCaseField(extraction.primaryClassification);
  if (!fieldKey) return {};

  const line = extraction.summary.trim();
  if (!line) return {};

  return {
    [fieldKey]: appendObservationLiveFieldLine(caseRow[fieldKey], line),
  };
}

export function buildProductSupportOutcomePatches(
  outcomes: ProductSupportOutcomesExtraction,
): Record<string, unknown> {
  const patches: Record<string, unknown> = {};

  if (outcomes.providerReaction) {
    Object.assign(patches, buildProductSupportProviderReactionPatch(outcomes.providerReaction));
  }
  if (outcomes.caseResult) {
    Object.assign(patches, buildProductSupportCaseResultPatch(outcomes.caseResult));
  }
  if (outcomes.nextStep) {
    Object.assign(patches, buildProductSupportNextStepPatch(outcomes.nextStep));
  }

  return patches;
}
