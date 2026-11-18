import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";

import type {
  DebriefCompletionContext,
  DebriefHypothesisValidationResult,
  DebriefNextStepSnapshot,
  DebriefOpportunityStrength,
  DebriefPatternValidationResult,
  DebriefPatternValidationStatus,
  DebriefProviderInterest,
  DebriefValidationDebugPayload,
} from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";

import {
  canonicalizeDebriefFindingKey,
  mergeDebriefPatternValidationsByCanonicalKey,
  narrativeExpressesMeaningfulCommercialInterest,
  normalizeDebriefPatternKey,
  patternTopicTerms,
  resolveCommercialFindingStatus,
} from "@/lib/surgical-sales/engagements/debriefCompletionFindingStatus";

import {
  NARRATIVE_EVALUATION_DECLINED,
  NARRATIVE_EVALUATION_REQUESTED,
  NARRATIVE_FUTURE_CONDITIONAL_INTEREST,
  NARRATIVE_NO_MAJOR_ISSUES,
} from "@/lib/surgical-sales/engagements/postObservationDebriefCompletion";

const REJECTION_NEAR_TOPIC =
  /\b(not a (problem|concern|issue)|doesn['']?t matter|no issue|not really|not meaningful|dismiss(ed|es|ing)?|fine with|without concern|no action needed|not worth|not interested|not actively looking|not looking to change|comfortable with the current|no major workflow|workflow is acceptable|generally go smoothly)\b/i;

const VALIDATED_PAIN_SIGNALS =
  /\b(worth addressing|needs to be addressed|should address|major workflow|significant problem|slows (him|her|them|me) down enough|would (want|like) to (change|improve|address)|affects (efficiency|workflow|outcomes|confidence|satisfaction)|real issue|valid concern|needs to be improved)\b/i;

const QUALIFICATION_NEAR_TOPIC =
  /\b(only in|only on|only for|specifically|large|complex|awr|abdominal wall reconstruction|bigger cases|some cases|not on small|not in small|limited to|case[- ]type|when it['']?s|occasionally|not a significant|not significant|doesn['']?t typically slow|open to reviewing|in the future|would consider|when it makes sense)\b/i;

const NEXT_STEP_FOLLOW_UP =
  /\b(follow[- ]?up|schedule|check back|next step|revisit|circle back|touch base)\b/i;

const NEXT_STEP_360 = /\b360 experience\b/i;

const NEXT_STEP_PRODUCT_TRIAL =
  /\b(product trial|trial case|pilot case|test drive)\b/i;

const NEXT_STEP_OPPORTUNITY =
  /\b(opportunity creation|create an opportunity|new opportunity)\b/i;

export { normalizeDebriefPatternKey, resolveCommercialFindingStatus };

function excerptAroundMatch(text: string, index: number, radius = 120): string {
  const start = Math.max(0, index - radius);

  const end = Math.min(text.length, index + radius);

  const slice = text.slice(start, end).trim();

  if (start > 0) return `…${slice}`;

  if (end < text.length) return `${slice}…`;

  return slice;
}

function firstMatchingSentence(text: string, terms: string[]): string | null {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    if (terms.some((term) => lower.includes(term))) return sentence;
  }

  return null;
}

function validationReason(
  status: DebriefPatternValidationStatus,
  patternLabel: string,
): string {
  switch (status) {
    case "confirmed":
      return `Provider confirmed "${patternLabel}" is meaningful and worth addressing.`;

    case "rejected":
      return `Provider did not treat "${patternLabel}" as a meaningful issue.`;

    case "qualified":
      return `Provider acknowledged "${patternLabel}" with limits, occasional impact, or future-only interest.`;

    default:
      return `Provider did not clearly confirm "${patternLabel}" during the debrief.`;
  }
}

function classifyPatternStatus(input: {
  narrative: string;

  patternLabel: string;
}): {
  status: DebriefPatternValidationStatus;
  evidence: string | null;
  reason: string;
  topicMentioned: boolean;
} {
  const narrative = input.narrative.trim();

  const patternLabel = input.patternLabel.trim();

  if (!narrative) {
    return {
      status: "unmentioned",

      evidence: null,

      reason: validationReason("unmentioned", patternLabel),

      topicMentioned: false,
    };
  }

  const canonical = canonicalizeDebriefFindingKey(patternLabel);

  if (canonical === "staff_workflow_comfort") {
    if (
      /\b(staff appeared comfortable|comfortable with the current|generally go smoothly|no major workflow|workflow is acceptable)\b/i.test(
        narrative,
      )
    ) {
      const evidence =
        firstMatchingSentence(narrative, [
          "comfortable",
          "smoothly",
          "staff",
          "workflow",
        ]) ?? "Provider described current workflow as acceptable.";

      return {
        status: "rejected",

        evidence,

        reason:
          "Positive staff/workflow signal should not become a friction hypothesis.",

        topicMentioned: true,
      };
    }
  }

  const terms = patternTopicTerms(patternLabel);

  if (terms.length === 0) {
    return {
      status: "unmentioned",

      evidence: null,

      reason: validationReason("unmentioned", patternLabel),

      topicMentioned: false,
    };
  }

  const lower = narrative.toLowerCase();

  const topicMentioned = terms.some((term) => lower.includes(term));

  if (!topicMentioned) {
    return {
      status: "unmentioned",

      evidence: null,

      reason: validationReason("unmentioned", patternLabel),

      topicMentioned: false,
    };
  }

  const topicIndex = terms.reduce((best, term) => {
    const idx = lower.indexOf(term);

    if (idx < 0) return best;

    if (best < 0 || idx < best) return idx;

    return best;
  }, -1);

  const topicSentence = firstMatchingSentence(narrative, terms);

  const localWindow =
    topicSentence ??
    narrative.slice(
      Math.max(0, topicIndex - 100),

      Math.min(narrative.length, topicIndex + 140),
    );

  const evidence =
    topicSentence ?? excerptAroundMatch(narrative, Math.max(topicIndex, 0));

  if (REJECTION_NEAR_TOPIC.test(localWindow)) {
    const status: DebriefPatternValidationStatus = "rejected";

    return {
      status,
      evidence,
      reason: validationReason(status, patternLabel),
      topicMentioned: true,
    };
  }

  const hasQualification = QUALIFICATION_NEAR_TOPIC.test(localWindow);

  const hasDownplay =
    /\b(not a significant|not significant|doesn['']?t typically slow|occasionally|minor|not a major)\b/i.test(
      localWindow,
    );

  if (hasQualification || hasDownplay) {
    const status: DebriefPatternValidationStatus = "qualified";

    return {
      status,
      evidence,
      reason: validationReason(status, patternLabel),
      topicMentioned: true,
    };
  }

  if (VALIDATED_PAIN_SIGNALS.test(localWindow)) {
    const status: DebriefPatternValidationStatus = "confirmed";

    return {
      status,
      evidence,
      reason: validationReason(status, patternLabel),
      topicMentioned: true,
    };
  }

  if (NARRATIVE_NO_MAJOR_ISSUES.test(localWindow)) {
    return {
      status: "rejected",

      evidence,

      reason: validationReason("rejected", patternLabel),

      topicMentioned: true,
    };
  }

  return {
    status: "unmentioned",

    evidence,

    reason: validationReason("unmentioned", patternLabel),

    topicMentioned: true,
  };
}

function statusLabel(status: DebriefPatternValidationStatus): string {
  switch (status) {
    case "confirmed":
      return "Confirmed";

    case "rejected":
      return "Rejected";

    case "qualified":
      return "Qualified";

    default:
      return "Unmentioned";
  }
}

function classifyProviderInterest(narrative: string): DebriefProviderInterest {
  const lower = narrative.toLowerCase();

  if (NARRATIVE_EVALUATION_REQUESTED.test(lower)) return "interested";

  if (NARRATIVE_EVALUATION_DECLINED.test(lower)) return "not_interested";

  if (/\b(not interested|declined|no evaluat)\b/i.test(lower))
    return "not_interested";

  if (/\bnot actively looking to change products\b/i.test(lower))
    return "not_interested";

  if (
    NARRATIVE_FUTURE_CONDITIONAL_INTEREST.test(lower) &&
    !NARRATIVE_NO_MAJOR_ISSUES.test(lower) &&
    narrativeExpressesMeaningfulCommercialInterest(narrative)
  ) {
    return "curious";
  }

  if (
    /\b(open to|would consider|when it makes sense)\b/i.test(lower) &&
    !NARRATIVE_NO_MAJOR_ISSUES.test(lower)
  ) {
    return "curious";
  }

  return "neutral";
}

function classifyOpportunityStrength(input: {
  narrative: string;

  patternValidations: DebriefPatternValidationResult[];

  providerInterest: DebriefProviderInterest;
}): DebriefOpportunityStrength {
  const narrative = input.narrative.toLowerCase();

  if (
    NARRATIVE_EVALUATION_DECLINED.test(narrative) &&
    !NARRATIVE_EVALUATION_REQUESTED.test(narrative)
  ) {
    return "none";
  }

  if (NARRATIVE_EVALUATION_REQUESTED.test(narrative)) {
    const confirmedPain = input.patternValidations.some(
      (row) => row.commercial_status === "validated_pain_point",
    );
    return confirmedPain ? "high" : "medium";
  }

  if (
    NARRATIVE_NO_MAJOR_ISSUES.test(narrative) ||
    input.providerInterest === "not_interested"
  ) {
    return "none";
  }

  const confirmedPain = input.patternValidations.some(
    (row) => row.commercial_status === "validated_pain_point",
  );

  if (confirmedPain && NARRATIVE_EVALUATION_REQUESTED.test(narrative))
    return "high";

  if (confirmedPain) return "medium";

  const activeOpportunity = input.patternValidations.some(
    (row) => row.commercial_status === "active_opportunity",
  );

  if (activeOpportunity) return "medium";

  return "none";
}

function buildNextStep(input: {
  narrative: string;

  facts: DebriefAtomicFact[];

  completionContext: DebriefCompletionContext;

  patternValidations: DebriefPatternValidationResult[];

  recordedAt: string;
}): DebriefNextStepSnapshot {
  const narrative = input.narrative.trim();

  const lower = narrative.toLowerCase();

  const providerInterest = classifyProviderInterest(narrative);

  const opportunityStrength = classifyOpportunityStrength({
    narrative,

    patternValidations: input.patternValidations,

    providerInterest,
  });

  const evaluationExplicitlyRequested =
    NARRATIVE_EVALUATION_REQUESTED.test(lower);

  const evaluationExplicitlyDeclined =
    NARRATIVE_EVALUATION_DECLINED.test(lower) && !evaluationExplicitlyRequested;

  let recommendation: DebriefNextStepSnapshot["recommendation"] = "unknown";

  let label = "Unknown";

  let reason = "No clear next step was stated in the debrief narrative.";

  if (evaluationExplicitlyDeclined) {
    recommendation = "no_action";

    label = "No Action";

    reason = "Provider declined evaluation or product change in this debrief.";
  } else if (evaluationExplicitlyRequested) {
    recommendation = NEXT_STEP_PRODUCT_TRIAL.test(lower)
      ? "product_trial"
      : "evaluation";

    label = NEXT_STEP_PRODUCT_TRIAL.test(lower)
      ? "Product Trial"
      : "Evaluation";

    reason = "Provider agreed to schedule evaluation or product trial.";
  } else if (opportunityStrength === "none") {
    if (NEXT_STEP_FOLLOW_UP.test(lower)) {
      recommendation = "follow_up";

      label = "Follow Up";

      reason =
        "Provider agreed to a follow-up conversation without committing to evaluation.";
    } else {
      recommendation = "no_action";

      label = "No Action";

      reason =
        "No meaningful commercial issue or active evaluation interest was established.";
    }
  } else if (NEXT_STEP_OPPORTUNITY.test(lower)) {
    recommendation = "opportunity_creation";

    label = "Opportunity Creation";

    reason = "Provider discussed creating a commercial opportunity.";
  } else if (NEXT_STEP_360.test(lower)) {
    recommendation = "360_experience";

    label = "360 Experience";

    reason = "Provider discussed a 360 experience next step.";
  } else if (
    NEXT_STEP_FOLLOW_UP.test(lower) ||
    input.completionContext.desiredOutcome === "follow_up"
  ) {
    recommendation = "follow_up";

    label = "Follow Up";

    reason =
      "Provider agreed to a follow-up conversation without committing to evaluation.";
  } else if (input.completionContext.desiredOutcome === "360_experience") {
    recommendation = "360_experience";

    label = "360 Experience";

    reason = "Prepare workspace desired outcome was 360 Experience.";
  } else if (
    input.completionContext.desiredOutcome === "evaluation_case" &&
    evaluationExplicitlyRequested
  ) {
    recommendation = "evaluation";

    label = "Evaluation";

    reason =
      "Prepare desired evaluation and provider explicitly requested trial.";
  } else if (input.completionContext.desiredOutcome === "no_action") {
    recommendation = "no_action";

    label = "No Action";

    reason = "Prepare workspace desired outcome was No Action.";
  } else if (providerInterest === "curious") {
    recommendation = "follow_up";

    label = "Follow Up";

    reason =
      "Provider expressed meaningful future interest without requesting evaluation now.";
  }

  if (recommendation === "evaluation" && !evaluationExplicitlyRequested) {
    recommendation = providerInterest === "curious" ? "follow_up" : "no_action";

    label = providerInterest === "curious" ? "Follow Up" : "No Action";

    reason =
      "Evaluation was not explicitly requested in the debrief narrative.";
  }

  return {
    recommendation,

    label,

    detail:
      firstMatchingSentence(narrative, [
        "follow",
        "evaluat",
        "trial",
        "future",
        "no evaluation",
      ]) ?? undefined,

    evidence:
      firstMatchingSentence(narrative, [
        "follow",
        "evaluat",
        "trial",
        "future",
        "no evaluation",
      ]) ?? undefined,

    opportunity_strength: opportunityStrength,

    provider_interest: providerInterest,

    reason,

    recorded_at: input.recordedAt,
  };
}

export function buildDebriefCompletionValidationModel(input: {
  completionContext: DebriefCompletionContext;

  narrative: string;

  facts?: DebriefAtomicFact[];

  recordedAt?: string;
}): {
  patternValidations: DebriefPatternValidationResult[];

  hypothesisValidation: DebriefHypothesisValidationResult | null;

  nextStep: DebriefNextStepSnapshot;

  debug: DebriefValidationDebugPayload;
} {
  const recordedAt = input.recordedAt ?? new Date().toISOString();

  const narrative = input.narrative.trim();

  const facts = input.facts ?? [];

  const { completionContext } = input;

  const rawPatternValidations = completionContext.observationPatterns.map(
    (pattern) => {
      const classified = classifyPatternStatus({
        narrative,

        patternLabel: pattern.label,
      });

      const canonicalKey = canonicalizeDebriefFindingKey(pattern.label);

      const commercialStatus = resolveCommercialFindingStatus({
        status: classified.status,

        patternLabel: pattern.label,

        narrative,

        topicMentioned: classified.topicMentioned,
      });

      return {
        normalized_pattern_key: normalizeDebriefPatternKey(pattern.label),

        canonical_finding_key: canonicalKey,

        pattern_label: pattern.label,

        count: pattern.count,

        total: pattern.total,

        status: classified.status,

        commercial_status: commercialStatus,

        provider_quote: classified.evidence ?? undefined,

        reason: classified.reason,

        rep_accepted: true,

        recorded_at: recordedAt,
      };
    },
  );

  const patternValidations = mergeDebriefPatternValidationsByCanonicalKey(
    rawPatternValidations,
  );

  const primaryPatternValidation =
    completionContext.primaryHypothesisPattern == null
      ? null
      : (patternValidations.find(
          (row) =>
            row.canonical_finding_key ===
            canonicalizeDebriefFindingKey(
              completionContext.primaryHypothesisPattern!.label,
            ),
        ) ?? null);

  const hypothesisValidation: DebriefHypothesisValidationResult | null =
    completionContext.hypothesisText
      ? {
          hypothesis_text: completionContext.hypothesisText,

          primary_pattern_label:
            completionContext.primaryHypothesisPattern?.label ?? null,

          status: primaryPatternValidation?.status ?? "unmentioned",

          evidence: primaryPatternValidation?.provider_quote,

          recorded_at: recordedAt,
        }
      : null;

  const nextStep = buildNextStep({
    narrative,

    facts,

    completionContext,

    patternValidations,

    recordedAt,
  });

  const debug: DebriefValidationDebugPayload = {
    patterns: patternValidations.map((row) => ({
      pattern: row.pattern_label,

      result: statusLabel(row.status),

      evidence: row.provider_quote ?? null,

      reason: row.reason ?? null,
    })),

    hypothesis: hypothesisValidation
      ? {
          pattern:
            completionContext.primaryHypothesisPattern?.label ?? "Hypothesis",

          result: statusLabel(hypothesisValidation.status),

          evidence: hypothesisValidation.evidence ?? null,

          reason: primaryPatternValidation?.reason ?? null,
        }
      : null,

    next_step: {
      recommendation: nextStep.label,

      detail: nextStep.detail ?? null,

      evidence: nextStep.evidence ?? null,

      opportunity_strength: nextStep.opportunity_strength,

      provider_interest: nextStep.provider_interest,

      reason: nextStep.reason,
    },
  };

  return {
    patternValidations,

    hypothesisValidation,

    nextStep,

    debug,
  };
}
