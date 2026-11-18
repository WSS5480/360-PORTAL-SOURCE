/**
 * Approval modal checkbox defaults — confidence and category rules (no UI routing).
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { textHasUncertaintyMarkers } from "@/lib/surgical-sales/intelligenceClassificationGuardrails";
import type {
  ConfidenceLevel,
  StructuredIntelligenceAnalysis,
} from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

const UNCERTAINTY_PRESERVED_WORDING =
  /\b(?:partially\s+mapped|still\s+needs\s+confirmation|mentioned\s+but\s+not\s+validated|not\s+validated\s+yet|needs\s+validation|still\s+needs|without\s+(?:a\s+)?(?:clear|good|detailed)|no\s+(?:clear|good|detailed)\s+breakdown)\b/i;

export type ReviewFieldBucket = "recommended" | "needs_review";

function confidenceForFieldUpdate(
  field: LogUpdateRoutedFieldUpdate,
  aiMapping: StructuredIntelligenceAnalysis | null | undefined,
): ConfidenceLevel | undefined {
  if (!aiMapping) return undefined;
  const confirmed = aiMapping.confirmed_updates.find((_, i) => field.id === `ai-confirmed-${i}`);
  if (confirmed) return confirmed.confidence;
  const partial = aiMapping.partial_updates.find((_, i) => field.id === `ai-partial-${i}`);
  if (partial) return partial.confidence;
  return undefined;
}

/** Medium partial updates pre-check only when copy preserves open uncertainty. */
export function wordingPreservesUncertainty(parts: Array<string | null | undefined>): boolean {
  const blob = parts
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(" ");
  if (!blob) return false;
  if (UNCERTAINTY_PRESERVED_WORDING.test(blob)) return true;
  return textHasUncertaintyMarkers(blob);
}

export function reviewFieldBucket(
  field: LogUpdateRoutedFieldUpdate,
  aiMapping: StructuredIntelligenceAnalysis | null | undefined,
): ReviewFieldBucket {
  const confidence = confidenceForFieldUpdate(field, aiMapping) ?? "medium";
  const partialRow = aiMapping?.partial_updates.find((_, i) => field.id === `ai-partial-${i}`);
  const stillNeeds = partialRow?.still_needs ?? [];
  const blob = [field.label, field.proposedValue, ...stillNeeds];

  if (field.id.startsWith("ai-partial-")) {
    return "recommended";
  }

  if (confidence === "low") return "needs_review";

  if (field.id.startsWith("ai-confirmed-")) {
    return "recommended";
  }

  if (!aiMapping) {
    return confidence === "high" ? "recommended" : "needs_review";
  }

  return "needs_review";
}

export function defaultAcceptedForReviewField(
  field: LogUpdateRoutedFieldUpdate,
  _aiMapping: StructuredIntelligenceAnalysis | null | undefined,
): boolean {
  if (field.conflict && !field.conflict.resolution) return false;
  // Outcome extraction is suggested until the rep explicitly accepts it.
  return false;
}

export function partitionReviewFieldUpdates(review: LogUpdateParseResult): {
  recommended: LogUpdateRoutedFieldUpdate[];
  needsReview: LogUpdateRoutedFieldUpdate[];
} {
  const fields = review.usesProviderIntelligence
    ? review.fieldUpdates
    : review.suggestedUpdates.map((u) => ({
        id: u.id,
        label: u.label,
        proposedValue: "",
        accepted: u.accepted,
        conflict: null,
        proposedScope: "provider" as const,
        scopeReason: "",
        proposedDestination: "provider" as const,
        destinationReason: "",
        dbKey: u.id,
      }));

  const ai = review.aiMapping;
  const recommended: LogUpdateRoutedFieldUpdate[] = [];
  const needsReview: LogUpdateRoutedFieldUpdate[] = [];

  for (const field of fields) {
    if (reviewFieldBucket(field, ai) === "recommended") {
      recommended.push(field);
    } else {
      needsReview.push(field);
    }
  }

  return { recommended, needsReview };
}

/** Apply modal checkbox defaults from confidence + category rules. */
export function applyReviewSelectionDefaults(review: LogUpdateParseResult): LogUpdateParseResult {
  const ai = review.aiMapping;

  if (!review.usesProviderIntelligence) {
    return {
      ...review,
      saveAsNoteAccepted: false,
      suggestedUpdates: review.suggestedUpdates.map((u) => ({
        ...u,
        accepted: defaultAcceptedForReviewField(
          {
            id: u.id,
            label: u.label,
            proposedValue: "",
            accepted: u.accepted,
            conflict: null,
            proposedScope: "provider",
            scopeReason: "",
            proposedDestination: "provider",
            destinationReason: "",
            dbKey: u.id,
          },
          ai,
        ),
      })),
    };
  }

  return {
    ...review,
    saveAsNoteAccepted: false,
    fieldUpdates: review.fieldUpdates.map((field) => ({
      ...field,
      accepted: defaultAcceptedForReviewField(field, ai),
    })),
  };
}
