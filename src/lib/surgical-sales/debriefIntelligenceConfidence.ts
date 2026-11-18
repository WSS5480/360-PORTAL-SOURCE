/**
 * Global debrief intelligence confidence — explicit (High), implication (Medium), assumption (Low).
 * Only Medium and High may be pre-selected in review.
 */

import type { DebriefPersonMentionLevel } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import {
  hasClearOperationalRoleForName,
  isWeakMentionOnly,
} from "@/lib/surgical-sales/debriefContactLeadExtraction";
import type { DebriefFactKey } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefFactKeys";
import type { DebriefFactConfidence } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import type { ConfidenceLevel } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

const WEAK_ASSUMPTION_RE =
  /\b(?:might|maybe|possibly|perhaps|seems?|appears?|think\s+(?:he|she|they)|could\s+be|not\s+clear|unclear|unknown|unsure|wasn'?t\s+sure|was not sure|don't know|do not know|probably|likely\s+uses?)\b/i;

const UNCERTAINTY_RE =
  /\b(?:could be wrong|not sure|unsure|wasn'?t\s+sure|was not sure|don't know|do not know|unclear|unknown|maybe|probably|possibly|whether\s+that)\b/i;

/** Explicit statement — direct attribution or confirmed fact. */
const EXPLICIT_STATEMENT_RE =
  /\b(?:said|told\s+me|stated|confirmed|approved|cleared|email\s+is|phone\s+is|normally\s+required|is\s+required|handles?|schedules?|coordinates?|manages?|runs?|owns?|oversees?|gets?\s+involved\s+in)\b/i;

/** Strong implication — actionable but not a direct role statement. */
const STRONG_IMPLICATION_RE =
  /\b(?:talk\s+to|check\s+with|reach\s+out\s+to|go\s+through|work\s+with|usually\s+handles?|involved\s+in|not\s+opposed|open\s+to|interested|wants?\s+us\s+to|need\s+to\s+work\s+through|suggested\s+i|mentioned\s+that)\b/i;

const MENTION_ONLY_RE = /\b(?:mentioned|brought\s+up|came\s+up|name(?:d)?)\b/i;

const IMPLICATION_ABOUT_RE = /\b(?:talk\s+to|check\s+with|ask|about\s+scheduling|regarding\s+scheduling)\b/i;

const FACT_KEY_CONFIDENCE: Partial<Record<DebriefFactKey, DebriefFactConfidence>> = {
  observation_approved_explicit: "High",
  observation_denied: "High",
  observation_interest_without_approval: "Medium",
  observation_mentioned: "Low",
  credentialing_platform_confirmed: "High",
  credentialing_platform_mentioned_unconfirmed: "Medium",
  credentialing_required_platform_unknown: "Medium",
  credentialing_discussed: "Medium",
  clinical_robotic_ventral_hernia_increasing: "High",
  clinical_abdominal_wall_reconstruction_increasing: "High",
  clinical_robotic_ventral_hernia: "Medium",
  clinical_abdominal_wall_reconstruction: "Medium",
  clinical_procedure_discussed: "Medium",
  facility_access_partial: "Medium",
  facility_credentialing_partial: "Medium",
  follow_up_stated: "Medium",
  scheduling_discussed: "Medium",
  workflow_coordination_mentioned: "Medium",
};

const CONFIDENCE_RANK: Record<DebriefFactConfidence, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export function shouldPreselectDebriefFinding(confidence: DebriefFactConfidence): boolean {
  return confidence === "High" || confidence === "Medium";
}

export function toStructuredConfidence(confidence: DebriefFactConfidence): ConfidenceLevel {
  switch (confidence) {
    case "High":
      return "high";
    case "Medium":
      return "medium";
    default:
      return "low";
  }
}

export function debriefConfidenceFromStructured(
  confidence: ConfidenceLevel | undefined,
): DebriefFactConfidence {
  switch (confidence) {
    case "high":
      return "High";
    case "low":
      return "Low";
    default:
      return "Medium";
  }
}

/** Prefer the more conservative (lower) confidence tier when blending sources. */
export function mergeDebriefConfidence(
  ...values: Array<DebriefFactConfidence | undefined>
): DebriefFactConfidence {
  let best: DebriefFactConfidence = "High";
  let rank = CONFIDENCE_RANK.High;
  for (const value of values) {
    if (!value) continue;
    const next = CONFIDENCE_RANK[value];
    if (next < rank) {
      rank = next;
      best = value;
    }
  }
  return best;
}

function explicitOwnershipForPerson(name: string, blob: string): boolean {
  const first = name.trim().split(/\s+/)[0] ?? "";
  if (!first) return false;
  const escaped = first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `\\b${escaped}\\s+(?:handles?|schedules?|coordinates?|manages?|runs?|owns?|oversees?)\\b`,
    "i",
  ).test(blob);
}

/**
 * Score confidence from dictation evidence.
 * High = explicit statement; Medium = strong implication; Low = weak assumption.
 */
export function scoreConfidenceFromEvidence(
  evidence: string,
  options?: { factKey?: DebriefFactKey; personName?: string },
): DebriefFactConfidence {
  const blob = String(evidence ?? "").trim();
  if (!blob || blob.length < 8) return "Low";

  if (options?.factKey && FACT_KEY_CONFIDENCE[options.factKey] === "Low") {
    return "Low";
  }

  if (WEAK_ASSUMPTION_RE.test(blob) && !explicitOwnershipForPerson(options?.personName ?? "", blob)) {
    return "Low";
  }

  if (options?.personName) {
    return scorePersonMentionConfidence(options.personName, blob);
  }

  if (options?.factKey && FACT_KEY_CONFIDENCE[options.factKey]) {
    const keyDefault = FACT_KEY_CONFIDENCE[options.factKey]!;
    if (keyDefault === "Low") return "Low";
    const fromText = scoreConfidenceFromEvidence(blob);
    return mergeDebriefConfidence(keyDefault, fromText);
  }

  if (UNCERTAINTY_RE.test(blob) && !EXPLICIT_STATEMENT_RE.test(blob)) {
    return "Medium";
  }

  if (EXPLICIT_STATEMENT_RE.test(blob)) {
    return "High";
  }

  if (STRONG_IMPLICATION_RE.test(blob) || IMPLICATION_ABOUT_RE.test(blob)) {
    return "Medium";
  }

  if (MENTION_ONLY_RE.test(blob) && !EXPLICIT_STATEMENT_RE.test(blob)) {
    return "Low";
  }

  return "Medium";
}

export function scorePersonMentionConfidence(
  name: string,
  evidence: string,
  debriefText?: string,
): DebriefFactConfidence {
  const blob = `${evidence} ${debriefText ?? ""}`.trim();
  if (!blob) return "Low";

  if (isWeakMentionOnly(name, evidence, debriefText ?? "")) {
    return "Low";
  }

  if (explicitOwnershipForPerson(name, blob) || hasClearOperationalRoleForName(name, blob)) {
    if (WEAK_ASSUMPTION_RE.test(blob) && !explicitOwnershipForPerson(name, blob)) {
      return "Medium";
    }
    if (IMPLICATION_ABOUT_RE.test(blob) && !explicitOwnershipForPerson(name, blob)) {
      return "Medium";
    }
    return "High";
  }

  if (IMPLICATION_ABOUT_RE.test(blob) || STRONG_IMPLICATION_RE.test(blob)) {
    return "Medium";
  }

  if (MENTION_ONLY_RE.test(blob)) {
    return "Low";
  }

  return "Medium";
}

export function scorePersonMentionConfidenceFromLevel(input: {
  name: string;
  quote: string;
  debriefText?: string;
  mentionLevel: DebriefPersonMentionLevel;
}): DebriefFactConfidence {
  const fromEvidence = scorePersonMentionConfidence(input.name, input.quote, input.debriefText);
  if (input.mentionLevel === "mentioned_person") {
    return mergeDebriefConfidence(fromEvidence, "Low");
  }
  if (input.mentionLevel === "confirmed_support_contact") {
    return mergeDebriefConfidence(fromEvidence, "High");
  }
  return fromEvidence;
}

export function scoreFactKeyConfidence(
  factKey: DebriefFactKey,
  evidence: string,
  namedPeople: string[] = [],
): DebriefFactConfidence {
  const person = namedPeople[0];
  const fromEvidence = scoreConfidenceFromEvidence(evidence, {
    factKey,
    personName: person,
  });
  const keyDefault = FACT_KEY_CONFIDENCE[factKey];
  return keyDefault ? mergeDebriefConfidence(keyDefault, fromEvidence) : fromEvidence;
}
