/**
 * Deterministic presentation helpers for structured intelligence review UI.
 * OpenAI outputs drive content only — never tab/modal/button/layout routing.
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateOpenAiMapping } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { reviewDestinationBadgeLabel } from "@/lib/surgical-sales/logUpdateReviewScopeDisplay";
import type { IntelligenceSaveDestination } from "@/lib/surgical-sales/intelligenceSaveDestination";
import { sanitizeFieldIntelligenceText } from "@/lib/surgical-sales/fieldIntelligenceLanguage";
import type { ConfidenceLevel } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

export {
  applyReviewSelectionDefaults,
  defaultAcceptedForReviewField,
  partitionReviewFieldUpdates,
  reviewFieldBucket,
  wordingPreservesUncertainty,
  type ReviewFieldBucket,
} from "@/lib/surgical-sales/logUpdateReviewSelection";

/** True when structured intelligence is available for review (independent of save path). */
export function hasStructuredIntelligenceReview(
  review: LogUpdateParseResult | null | undefined,
): boolean {
  if (!review) return false;
  if (review.aiMapping) return true;
  if ((review.debriefUniversalFactsRuns?.length ?? 0) > 0) return true;
  if ((review.atomicFacts?.length ?? 0) > 0) return true;
  return Boolean(review.usesProviderIntelligence);
}

function reviewHasProviderIntelligencePayload(review: LogUpdateParseResult): boolean {
  if (review.usesProviderIntelligence) return true;
  if ((review.atomicFacts?.length ?? 0) > 0) return true;
  if ((review.debriefUniversalFactsRuns?.length ?? 0) > 0) return true;
  return review.fieldUpdates.some(
    (field) =>
      field.proposedDestination === "provider" ||
      field.dbKey.startsWith("provider_"),
  );
}

/** Backfill provider-intelligence flag on legacy persisted snapshots. */
export function normalizeLogUpdateProviderIntelligenceFlag(
  review: LogUpdateParseResult,
): LogUpdateParseResult {
  if (review.usesProviderIntelligence || !reviewHasProviderIntelligencePayload(review)) {
    return review;
  }
  return { ...review, usesProviderIntelligence: true };
}

/** Route to intelligence-brief review (not legacy DebriefApprovalReview). */
export function shouldUseAiDebriefIntelligenceReview(
  review: LogUpdateParseResult | null | undefined,
): boolean {
  if (!review) return false;
  return hasStructuredIntelligenceReview(review) && reviewHasProviderIntelligencePayload(review);
}

export function structuredAnalysisFromReview(
  review: LogUpdateParseResult | null | undefined,
): LogUpdateOpenAiMapping | null {
  return review?.aiMapping ?? null;
}

/** Scope label shown in review cards (Facility / Provider / Engagement / Case). */
export function reviewScopeDisplayLabel(destination: IntelligenceSaveDestination): string {
  return reviewDestinationBadgeLabel(destination);
}

export {
  formatReviewSaveScopeDisplay,
  formatReviewSaveScopeHeadline,
  reviewDestinationBadgeLabel,
  type ReviewScopeDisplayContext,
  type ReviewSaveScopeDisplay,
} from "@/lib/surgical-sales/logUpdateReviewScopeDisplay";

/** @deprecated Use defaultAcceptedForReviewField */
export function confidencePreselectsByDefault(confidence: ConfidenceLevel | string | undefined): boolean {
  return confidence === "high";
}

/** @deprecated Debrief approval UI no longer shows coaching-style confidence hints. */
export function reviewConfidenceHint(_confidence: ConfidenceLevel | string | undefined): string | null {
  return null;
}

export function recommendedUpdateHeadline(field: LogUpdateRoutedFieldUpdate): string {
  return field.label.trim() || "Field update";
}

export function recommendedUpdateDetail(
  field: LogUpdateRoutedFieldUpdate,
  aiMapping: LogUpdateOpenAiMapping | null,
): string {
  const value = field.proposedValue.trim();
  const partial = aiMapping?.partial_updates.find((_, i) => field.id === `ai-partial-${i}`);
  const confirmed = aiMapping?.confirmed_updates.find((_, i) => field.id === `ai-confirmed-${i}`);
  const reasoning = (partial?.reasoning ?? confirmed?.reasoning ?? "").trim();
  const stillNeeds = partial?.still_needs?.filter(Boolean) ?? [];

  const parts: string[] = [];
  if (value) parts.push(value);
  if (reasoning && reasoning !== value) parts.push(reasoning);
  if (stillNeeds.length > 0) {
    parts.push(
      stillNeeds.length === 1
        ? stillNeeds[0]!
        : `${stillNeeds.slice(0, -1).join("; ")}; ${stillNeeds[stillNeeds.length - 1]}`,
    );
  }
  const joined = parts.length > 0 ? parts.join(" ") : field.destinationReason || field.scopeReason || "";
  return sanitizeFieldIntelligenceText(joined, { maxLen: 500 });
}

export function confidenceForFieldUpdate(
  field: LogUpdateRoutedFieldUpdate,
  aiMapping: LogUpdateOpenAiMapping | null,
): ConfidenceLevel | undefined {
  if (!aiMapping) return undefined;
  const confirmed = aiMapping.confirmed_updates.find((_, i) => field.id === `ai-confirmed-${i}`);
  if (confirmed) return confirmed.confidence;
  const partial = aiMapping.partial_updates.find((_, i) => field.id === `ai-partial-${i}`);
  if (partial) return partial.confidence;
  return undefined;
}

export type LogUpdateValidationItem = { id: string; text: string };

export function collectValidationItems(review: LogUpdateParseResult): LogUpdateValidationItem[] {
  const ai = review.aiMapping;
  if (ai) {
    return ai.still_to_validate.map((q, i) => ({
      id: `validate-${i}`,
      text: q.question.trim(),
    }));
  }
  return review.intelligenceReview.stillWorthConfirming.map((gap, i) => ({
    id: `gap-${i}`,
    text: gap.trim(),
  }));
}

export type LogUpdateNextMoveItem = {
  id: string;
  action: string;
  guidanceOnly: boolean;
};

const TASK_LIKE_ACTION_RE =
  /\b(follow[- ]?up\s+task|create\s+(a\s+)?task|add\s+task|schedule\s+follow|book\s+follow|dated\s+task|next\s+action)\b/i;

/** Next moves are guidance unless they clearly imply creating a follow-up task (no save path yet). */
export function nextMoveCreatesFollowUpTask(action: string): boolean {
  return TASK_LIKE_ACTION_RE.test(action);
}

export function collectNextMoveItems(review: LogUpdateParseResult): LogUpdateNextMoveItem[] {
  const ai = review.aiMapping;
  const raw = ai
    ? ai.recommended_next_moves
    : (review.intelligenceReview.suggestedNextActions ?? []).map((a) =>
        typeof a === "string" ? { action: a, owner_type: "rep" as const, priority: "medium" as const } : a,
      );

  return raw.map((move, i) => ({
    id: `next-${i}`,
    action: move.action.trim(),
    guidanceOnly: !nextMoveCreatesFollowUpTask(move.action),
  }));
}

export type LogUpdateReviewSaveCounts = {
  acceptedFieldUpdates: number;
  validationItems: number;
  includesRawDebrief: boolean;
};

export function logUpdateReviewSaveCounts(review: LogUpdateParseResult): LogUpdateReviewSaveCounts {
  const acceptedFieldUpdates = review.usesProviderIntelligence
    ? review.fieldUpdates.filter((u) => u.accepted).length
    : review.suggestedUpdates.filter((u) => u.accepted).length;

  return {
    acceptedFieldUpdates,
    validationItems: collectValidationItems(review).length,
    includesRawDebrief: review.saveAsNoteAccepted,
  };
}

export function buildLogUpdateReviewSaveSummary(
  review: LogUpdateParseResult,
  opts?: { rawDebriefLabel?: string },
): string {
  const { acceptedFieldUpdates, validationItems, includesRawDebrief } =
    logUpdateReviewSaveCounts(review);
  const parts: string[] = [];

  if (acceptedFieldUpdates > 0) {
    parts.push(
      `${acceptedFieldUpdates} recommended update${acceptedFieldUpdates === 1 ? "" : "s"}`,
    );
  }
  if (validationItems > 0) {
    parts.push(`${validationItems} validation item${validationItems === 1 ? "" : "s"}`);
  }
  if (includesRawDebrief) {
    parts.push(opts?.rawDebriefLabel ?? "raw debrief");
  }

  if (parts.length === 0) return "Nothing selected to save";
  return `Saving: ${parts.join(" · ")}`;
}
