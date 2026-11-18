/**
 * Legacy re-exports — staged guidance generation lives in buildDebriefGuidanceIntelligence.ts.
 */

export {
  formatDebriefObservedFact,
  resolveDebriefConversationRecommendedOutcome,
} from "@/lib/surgical-sales/engagements/debriefGuidanceFormatUtils";
export { buildDebriefGuidanceIntelligence, rebuildDebriefGuidanceIntelligenceFromWorkspaceDraft } from "@/lib/surgical-sales/engagements/buildDebriefGuidanceIntelligence";
export type { DebriefGuidanceIntelligence, DebriefGuidanceIntelligenceItem } from "@/lib/surgical-sales/engagements/debriefGuidanceIntelligenceTypes";

import type { DebriefPrioritizedPattern } from "@/lib/surgical-sales/engagements/debriefIntelligencePrioritization";
import type { DebriefPrepareDesiredOutcome } from "@/lib/surgical-sales/engagements/debriefPrepareWorkspace";
import { buildDebriefGuidanceIntelligence } from "@/lib/surgical-sales/engagements/buildDebriefGuidanceIntelligence";
import type { DebriefGuidanceIntelligence } from "@/lib/surgical-sales/engagements/debriefGuidanceIntelligenceTypes";

export type DebriefConversationGuideContext = {
  observationPatterns?: DebriefPrioritizedPattern[];
  providerName?: string | null;
  procedureLabel?: string | null;
};

/** @deprecated Use DebriefGuidanceIntelligence */
export type DebriefConversationGuide = {
  whatWeObserved: string[];
  whatToValidate: string[];
  conversationStarters: string[];
  recommendedOutcome: string;
  hypothesisText: string | null;
};

const TERSE_PLACEHOLDER_QUESTION = /^[A-Za-z][A-Za-z\s/-]{0,40}\?\s*$/;

function trimLine(text: string): string {
  return String(text ?? "").trim();
}

/** @deprecated Use buildDebriefGuidanceIntelligence */
export function buildProviderDebriefConversationGuide(input: {
  observationPatterns?: DebriefPrioritizedPattern[];
  knownFacts: string[];
  providerName?: string | null;
  procedureLabel?: string | null;
  desiredOutcome?: DebriefPrepareDesiredOutcome | null;
}): DebriefConversationGuide {
  const intelligence = buildDebriefGuidanceIntelligence({
    patterns: input.observationPatterns ?? [],
    unresolvedObservationPrompts: [],
    providerName: input.providerName,
    procedureLabel: input.procedureLabel,
    desiredOutcome: input.desiredOutcome ?? null,
  });
  return toLegacyConversationGuide(intelligence);
}

export function toLegacyConversationGuide(intelligence: DebriefGuidanceIntelligence): DebriefConversationGuide {
  return {
    whatWeObserved: intelligence.whatWeObserved,
    whatToValidate: intelligence.whatToValidate,
    conversationStarters: intelligence.conversationStarters,
    recommendedOutcome: intelligence.recommendedOutcome,
    hypothesisText: intelligence.primaryHypothesis,
  };
}

export function guideContainsObservationInstructions(guide: {
  whatToValidate: string[];
  conversationStarters: string[];
  hypothesisText?: string | null;
  primaryHypothesis?: string | null;
}): boolean {
  const combined = [
    ...guide.whatToValidate,
    ...guide.conversationStarters,
    guide.hypothesisText ?? guide.primaryHypothesis ?? "",
  ].join(" ");
  return /\blisten for\b.*\bduring the case\b/i.test(combined) || /^listen for\b/im.test(combined);
}

export function guideContainsTersePlaceholderQuestions(guide: {
  whatToValidate: string[];
  conversationStarters: string[];
}): boolean {
  return [...guide.whatToValidate, ...guide.conversationStarters].some((line) =>
    TERSE_PLACEHOLDER_QUESTION.test(trimLine(line)),
  );
}

/** @deprecated Generated strings must not be re-normalized. */
export function normalizeObservationGuidanceForDebriefConversation(text: string): string {
  return trimLine(text);
}

/** @deprecated Generated strings must not be re-normalized. */
export function normalizeDebriefHypothesis(text: string | null | undefined): string | null {
  return trimLine(text ?? "") || null;
}
