import { schedulingContactReplacementNamed } from "@/lib/surgical-sales/schedulingContactOwnership";

export { schedulingContactReplacementNamed };

/**
 * Contradiction / reversal detection for observation-access intelligence.
 *
 * When a note negates an existing rule ("credentialing is no longer required"),
 * the review screen must show ONE conflict-resolution item (Replace / Keep existing),
 * not separate positive and negative facts.
 *
 * Covered domains: credentialing requirements, observation approval status,
 * observation allowance, scheduling-contact identification.
 */

export type IntelligenceReversalDomain =
  | "credentialing_requirement"
  | "approval_status"
  | "observation_allowance"
  | "scheduling_contact";

export type DetectedIntelligenceReversal = {
  domain: IntelligenceReversalDomain;
  dbKey: string;
  label: string;
  /** Canonical negated fact saved when the rep chooses Replace. */
  negatedValue: string;
  /** Positive-direction updates for these dbKeys are dropped when the reversal fires. */
  suppressedDbKeys: string[];
};

/** Correction framing: "previously believed", "clarified that", "actually", "instead"… */
const CORRECTION_CUE_RE =
  /\b(?:no\s+longer|previously\s+(?:believed|told|thought|understood|said)|clarified|correction|corrected|actually|instead|turns\s+out)\b/i;

/** required → not required: "no longer required", "not needed", "not necessary", "waived". */
const NEGATED_REQUIREMENT_RE =
  /\b(?:no\s+longer|not|isn'?t|is\s+not|never|won'?t\s+be)\s+(?:be\s+)?(?:required|needed|necessary)\b|\bwaived\b|\bnot\s+a\s+requirement\b/i;

/** "can attend cases immediately", "can observe right away" — implies no gate remains. */
const IMMEDIATE_ACCESS_RE =
  /\b(?:can|may)\s+(?:attend|observe)\s+(?:cases?\s+)?(?:immediately|right\s+away|now)\b|\battend\s+cases?\s+immediately\b/i;

/** approved → not approved: includes revoked / rescinded / withdrawn / reversed / suspended. */
const NEGATED_APPROVAL_RE =
  /\b(?:not|no\s+longer|isn'?t|is\s+not)\s+approved\b|\bapproval\s+(?:was\s+|has\s+been\s+|is\s+)?(?:revoked|rescinded|withdrawn|reversed|denied|(?:temporarily\s+)?suspended|(?:temporarily\s+)?paused|on\s+hold)\b/i;

/**
 * allowed → not allowed: "no longer allowed/available", "cannot observe",
 * "can't attend", "temporarily suspended", "paused", "on hold", "access revoked".
 * Suspension words must sit near an observation/access keyword (either order)
 * so "the product trial was paused" does not reverse observation access.
 */
const SUSPENSION_WORDS = "(?:temporarily\\s+)?(?:suspended|paused|halted|revoked|rescinded|removed|pulled|cut\\s+off)|on\\s+hold";
const ACCESS_WORDS = "(?:observ\\w*|access|attend\\w*|visits?)";
const NEGATED_ALLOWANCE_RE = new RegExp(
  [
    "\\b(?:not|no\\s+longer)\\s+(?:allowed|permitted|available)\\b",
    "\\bcan(?:not|'?t)\\s+(?:observe|attend)\\b",
    `\\b${ACCESS_WORDS}\\b[^.!?]{0,60}\\b(?:${SUSPENSION_WORDS})\\b`,
    `\\b(?:${SUSPENSION_WORDS})\\b[^.!?]{0,60}\\b${ACCESS_WORDS}\\b`,
  ].join("|"),
  "i",
);

/** identified → not identified: scheduler / coordinator no longer identified or applicable. */
const NEGATED_IDENTIFICATION_RE =
  /\b(?:not|no\s+longer|never)\s+identified\b|\bno\s+(?:scheduler|coordinator|scheduling\s+contact)\s+(?:is\s+)?(?:identified|in\s+place)\b|\b(?:scheduler|coordinator|scheduling\s+contact)\s+is\s+(?:not|no\s+longer)\s+(?:identified|known|in\s+place)\b|\bno\s+longer\s+(?:the|our|handling)\s+(?:scheduler|coordinator|scheduling)\b/i;

const CREDENTIALING_KEYWORD_RE = /\b(?:credential\w*|vendor\s+clearance)\b/i;
const ALLOWANCE_KEYWORD_RE = /\b(?:observ\w*|attend|allowed|permitted|access)\b/i;
const SCHEDULING_KEYWORD_RE = /\b(?:scheduler|scheduling|coordinator)\b/i;

const REVERSAL_SPECS: Record<
  IntelligenceReversalDomain,
  Omit<DetectedIntelligenceReversal, "domain">
> = {
  credentialing_requirement: {
    dbKey: "provider_observation_credentialing_needed",
    label: "Credentialing no longer required",
    negatedValue: "Not required — credentialing no longer required before observation.",
    suppressedDbKeys: [
      "provider_observation_credentialing_needed",
      "provider_credentialing_status",
    ],
  },
  approval_status: {
    dbKey: "provider_observation_feasibility",
    label: "Observation approval reversed",
    negatedValue: "Not approved — observation approval reversed.",
    suppressedDbKeys: ["provider_observation_feasibility"],
  },
  observation_allowance: {
    dbKey: "provider_observation_feasibility",
    label: "Observation no longer allowed",
    negatedValue: "Not allowed — observation access reversed.",
    suppressedDbKeys: ["provider_observation_feasibility"],
  },
  scheduling_contact: {
    dbKey: "provider_observation_coordinator_contact",
    label: "Scheduling contact no longer identified",
    negatedValue: "No scheduling contact identified — previous contact no longer applies.",
    suppressedDbKeys: [
      "provider_observation_coordinator_contact",
      "provider_scheduling_contact",
    ],
  },
};

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Detect reversal statements. Domain keyword and negation must occur in the
 * same sentence so "Credentialing is required. A contract is not necessary."
 * does not false-positive.
 */
export function detectIntelligenceReversals(text: string): DetectedIntelligenceReversal[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const byDbKey = new Map<string, DetectedIntelligenceReversal>();
  const add = (domain: IntelligenceReversalDomain) => {
    const spec = REVERSAL_SPECS[domain];
    if (byDbKey.has(spec.dbKey)) return;
    byDbKey.set(spec.dbKey, { domain, ...spec });
  };

  for (const sentence of splitSentences(trimmed)) {
    if (
      CREDENTIALING_KEYWORD_RE.test(sentence) &&
      (NEGATED_REQUIREMENT_RE.test(sentence) ||
        (CORRECTION_CUE_RE.test(sentence) && IMMEDIATE_ACCESS_RE.test(sentence)))
    ) {
      add("credentialing_requirement");
    }

    if (NEGATED_APPROVAL_RE.test(sentence)) {
      add("approval_status");
    }

    if (ALLOWANCE_KEYWORD_RE.test(sentence) && NEGATED_ALLOWANCE_RE.test(sentence)) {
      add("observation_allowance");
    }

    if (
      SCHEDULING_KEYWORD_RE.test(sentence) &&
      NEGATED_IDENTIFICATION_RE.test(sentence) &&
      // A named successor means replacement, not removal — keep the positive
      // update so the reviewer decides Replace vs Keep both.
      !schedulingContactReplacementNamed(trimmed)
    ) {
      add("scheduling_contact");
    }
  }

  return [...byDbKey.values()];
}

/**
 * Convenience predicate for the debrief review pipeline: does this text state
 * that credentialing is NOT (or no longer) required? Sentence-scoped via
 * detectIntelligenceReversals so "Credentialing is required. A contract is not
 * necessary." stays positive.
 */
export function textNegatesCredentialingRequirement(text: string): boolean {
  return detectIntelligenceReversals(text).some(
    (reversal) => reversal.domain === "credentialing_requirement",
  );
}

/**
 * Does this text state that observation access is no longer approved/allowed —
 * suspended, paused, revoked, unavailable, or otherwise reversed? Historical
 * references ("previously approved") must never outrank these signals.
 */
export function textNegatesObservationAccess(text: string): boolean {
  return detectIntelligenceReversals(text).some(
    (reversal) =>
      reversal.domain === "approval_status" || reversal.domain === "observation_allowance",
  );
}

/**
 * Whether an existing stored value asserts the positive direction the reversal
 * negates — when true, the review screen should show a conflict item.
 */
export function existingValueContradictsReversal(
  domain: IntelligenceReversalDomain,
  existingValue: string,
): boolean {
  const t = existingValue.trim();
  if (!t || /^unknown$/i.test(t)) return false;

  switch (domain) {
    case "credentialing_requirement":
      if (NEGATED_REQUIREMENT_RE.test(t)) return false;
      return (
        /\b(?:required|needed|necessary|must\s+(?:be\s+)?complete|pending|in\s+progress|before\s+observation)\b/i.test(t) ||
        /^(?:yes|true)$/i.test(t)
      );
    case "approval_status":
      if (NEGATED_APPROVAL_RE.test(t)) return false;
      return /\b(?:approved|approval\s+confirmed)\b/i.test(t) || /^(?:yes|approved)$/i.test(t);
    case "observation_allowance":
      if (NEGATED_ALLOWANCE_RE.test(t) || /\b(?:restricted|blocked|denied)\b/i.test(t)) return false;
      return /\b(?:allowed|permitted|approved|can\s+observe)\b/i.test(t);
    case "scheduling_contact":
      if (/\bno\s+(?:scheduler|coordinator|scheduling\s+contact)\b/i.test(t)) return false;
      return true;
  }
}
