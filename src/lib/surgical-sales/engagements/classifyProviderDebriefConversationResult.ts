/**
 * Classify provider debrief visit outcome from post-meeting dictation.
 * Maps to touch_* outcomes used on the engagement record.
 */

import type { StartMissionOutcomeId } from "@/lib/surgical-sales/engagements/startMissionConfig";
import type { DebriefNextStepSnapshot } from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";

export const PROVIDER_DEBRIEF_TOUCH_OUTCOME_LABELS = {
  touch_success: "Objective Met",
  touch_follow_up: "Follow Up Needed",
  touch_no_progress: "No Progress",
} as const;

export type ProviderDebriefTouchOutcomeId = keyof typeof PROVIDER_DEBRIEF_TOUCH_OUTCOME_LABELS;

export type ProviderDebriefClassifiedOutcome = {
  outcomeId: ProviderDebriefTouchOutcomeId;
  label: string;
  rationale: string;
  /** Supporting quote from dictation when available. */
  evidence?: string;
};

const NO_PROGRESS_RE =
  /\b(?:not interested|no interest|declined|pushed back|won'?t consider|not ready|no next step|dead end|too busy|no time)\b/i;

const CLEAR_WIN_RE =
  /\b(?:agreed to|scheduled|schedule an|set up an|booked|committed to|signed off on|approved an evaluation|evaluation case|trial case|in-?service|sim360|360 experience|clinical advancement center)\b/i;

const INTEREST_RE =
  /\b(?:interested|open to|wants to|would like to|moving forward|next step|follow up|circle back|send info|evaluation)\b/i;

const MEANINGFUL_RE =
  /\b(?:visualization|fixation|mesh|acsis|workflow|frustrat|case|observation|product|trial|debrief)\b/i;

function firstMatchingSentence(text: string, patterns: RegExp[]): string | null {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    if (patterns.some((pattern) => pattern.test(sentence))) return sentence;
  }

  return null;
}

function resolveSpecificSuccessLabel(text: string): string {
  if (/\b(?:evaluation case|schedule(?:d)? (?:an )?evaluat)/i.test(text)) {
    return "Evaluation Case Agreed";
  }
  if (/\b(?:product trial|trial case|pilot case)\b/i.test(text)) {
    return "Product Trial Agreed";
  }
  if (/\b360 experience\b/i.test(text)) {
    return "360 Experience Agreed";
  }
  if (/\b(?:in-?service|sim360|clinical advancement center)\b/i.test(text)) {
    return "Training Agreed";
  }
  return PROVIDER_DEBRIEF_TOUCH_OUTCOME_LABELS.touch_success;
}

function resolveLabelFromNextStep(
  recommendation: string | undefined,
  fallback: string,
): string {
  switch (recommendation) {
    case "evaluation":
      return "Evaluation Case Agreed";
    case "product_trial":
      return "Product Trial Agreed";
    case "360_experience":
      return "360 Experience Agreed";
    case "follow_up":
      return "Follow Up Needed";
    case "no_action":
      return "No Progress";
    default:
      return fallback;
  }
}

export function classifyProviderDebriefConversationResult(
  note: string,
): ProviderDebriefClassifiedOutcome {
  const text = note.trim();

  if (!text || text.length < 24) {
    return {
      outcomeId: "touch_no_progress",
      label: PROVIDER_DEBRIEF_TOUCH_OUTCOME_LABELS.touch_no_progress,
      rationale: "Not enough debrief content to classify a meaningful result.",
    };
  }

  if (NO_PROGRESS_RE.test(text)) {
    return {
      outcomeId: "touch_no_progress",
      label: PROVIDER_DEBRIEF_TOUCH_OUTCOME_LABELS.touch_no_progress,
      rationale: "Debrief indicates resistance or no clear path forward.",
    };
  }

  if (CLEAR_WIN_RE.test(text)) {
    const evidence =
      firstMatchingSentence(text, [
        /\bagreed to\b/i,
        /\bschedule(?:d)?\b/i,
        /\bcommitted\b/i,
        /\bevaluat/i,
        /\btrial\b/i,
      ]) ?? undefined;

    return {
      outcomeId: "touch_success",
      label: resolveSpecificSuccessLabel(text),
      rationale: evidence ?? "Debrief captures a concrete next step such as evaluation, trial, or training.",
      evidence,
    };
  }

  if (INTEREST_RE.test(text) && MEANINGFUL_RE.test(text)) {
    const evidence =
      firstMatchingSentence(text, [/\binterested\b/i, /\bfollow[- ]?up\b/i, /\bnext step\b/i]) ??
      undefined;

    return {
      outcomeId: "touch_follow_up",
      label: PROVIDER_DEBRIEF_TOUCH_OUTCOME_LABELS.touch_follow_up,
      rationale:
        evidence ?? "Interest or follow-up captured without a firm commitment yet.",
      evidence,
    };
  }

  if (text.length >= 80 && MEANINGFUL_RE.test(text)) {
    return {
      outcomeId: "touch_follow_up",
      label: PROVIDER_DEBRIEF_TOUCH_OUTCOME_LABELS.touch_follow_up,
      rationale: "Substantive debrief captured — follow-up still required.",
    };
  }

  return {
    outcomeId: "touch_no_progress",
    label: PROVIDER_DEBRIEF_TOUCH_OUTCOME_LABELS.touch_no_progress,
    rationale: "No actionable next step or commercial movement captured.",
  };
}

/** Rep-facing result card — prefers completion validation next step when available. */
export function buildProviderDebriefConversationResultDisplay(input: {
  narrative: string;
  nextStep?: DebriefNextStepSnapshot | null;
}): ProviderDebriefClassifiedOutcome {
  const classified = classifyProviderDebriefConversationResult(input.narrative);
  const nextStep = input.nextStep;
  if (!nextStep) return classified;

  const evidence =
    nextStep.evidence?.trim() ||
    classified.evidence ||
    firstMatchingSentence(input.narrative, [/\bagreed to\b/i, /\bschedule(?:d)?\b/i, /\bevaluat/i]);

  if (classified.outcomeId === "touch_success") {
    return {
      ...classified,
      label: resolveLabelFromNextStep(nextStep.recommendation, classified.label),
      rationale: nextStep.reason?.trim() || classified.rationale,
      evidence: evidence ?? undefined,
    };
  }

  if (classified.outcomeId === "touch_follow_up" && nextStep.recommendation === "follow_up") {
    return {
      ...classified,
      rationale: nextStep.reason?.trim() || classified.rationale,
      evidence: evidence ?? undefined,
    };
  }

  return classified;
}

export function providerDebriefClassifiedToVisitOutcome(
  classified: ProviderDebriefClassifiedOutcome,
): {
  outcomeId: StartMissionOutcomeId;
  label: string;
  rationale: string;
} {
  return {
    outcomeId: classified.outcomeId,
    label: classified.label,
    rationale: classified.rationale,
  };
}

/** Example dictation for Mark Onion — evaluation case agreed after visualization friction debrief. */
export const MARK_ONION_PROVIDER_DEBRIEF_EXAMPLE_DICTATION = `Met with Dr. Onion after five completed observation cases at Pilot Hospital. He acknowledged extra visualization time before mesh fixation shows up on larger complex cases — frustrating maybe three out of five times, not every case. Bard mesh is still his standard product.

We walked through how ACSIS could help on the visualization workflow. He is interested and agreed to schedule an evaluation case next month. His team will coordinate timing. Strong conversation overall — clear next step.`;
