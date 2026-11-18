/**
 * Staged debrief guidance intelligence — typed pipeline stages.
 * Generated outputs must never be fed back in as raw findings.
 */

import type { DebriefPrioritizedPattern } from "@/lib/surgical-sales/engagements/debriefIntelligencePrioritization";

export type DebriefGuidanceIntelligenceStage =
  | "observation_finding"
  | "validation_question"
  | "commercial_qualification"
  | "recommended_next_step";

export type DebriefGuidanceIntelligenceItem = {
  /** Stage 1 — rep-facing observation finding (display only). */
  finding: string;
  /** Commercial meaning derived from the raw pattern (not from generated questions). */
  meaning: string;
  /** Stage 2 — provider validation check. */
  validationQuestion: string;
  /** Stage 3 — commercial qualification if validation is positive. */
  qualificationQuestion: string;
  /** Stage 4 — next-step probe aligned to pathway options. */
  nextStepQuestion: string;
  /** Source pattern label — raw observation text only. */
  sourcePatternLabel: string | null;
};

/** Layer A — observed pattern plus its validation question. Never includes information gaps. */
export type DebriefFindingToValidate = {
  displayFinding: string;
  meaning: string;
  validationQuestion: string;
  sourcePatternLabel: string;
};

/** Layer B — things not yet known from observation; discovery questions only. */
export type DebriefInformationGap = {
  discoveryQuestion: string;
  gapKind: string;
};

export type DebriefGuidanceIntelligence = {
  /** Layer A — observation findings with validation probes. */
  findingsToValidate: DebriefFindingToValidate[];
  /** Layer B — unresolved observation prompts as discovery questions. */
  informationGaps: DebriefInformationGap[];
  /** Layer C — gated commercial qualification tied to primary high-priority issue. */
  commercialQualification: string[];
  /** @deprecated Pattern-only items for backward compatibility; gaps are excluded. */
  items: DebriefGuidanceIntelligenceItem[];
  primaryHypothesis: string;
  recommendedOutcome: string;
  /** Render fields — derived once from layers, never re-transformed. */
  whatWeObserved: string[];
  whatToValidate: string[];
  conversationStarters: string[];
};

export type DebriefGuidanceIntelligenceInput = {
  patterns: DebriefPrioritizedPattern[];
  unresolvedObservationPrompts?: string[];
  providerName?: string | null;
  procedureLabel?: string | null;
  desiredOutcome?: import("@/lib/surgical-sales/engagements/debriefPrepareWorkspace").DebriefPrepareDesiredOutcome | null;
};

export function flattenDebriefGuidanceIntelligence(intelligence: DebriefGuidanceIntelligence): {
  whatWeObserved: string[];
  whatToValidate: string[];
  conversationStarters: string[];
} {
  return {
    whatWeObserved: intelligence.whatWeObserved,
    whatToValidate: intelligence.whatToValidate,
    conversationStarters: intelligence.conversationStarters,
  };
}

export function intelligenceContainsRecursiveQuestions(intelligence: DebriefGuidanceIntelligence): boolean {
  const combined = [
    ...intelligence.whatToValidate,
    ...intelligence.conversationStarters,
    intelligence.primaryHypothesis,
    ...intelligence.items.flatMap((item) => [
      item.validationQuestion,
      item.qualificationQuestion,
      item.nextStepQuestion,
    ]),
  ].join(" ");

  return /\bDoes Ask whether\b/i.test(combined) || /\bAsk whether Ask whether\b/i.test(combined);
}
