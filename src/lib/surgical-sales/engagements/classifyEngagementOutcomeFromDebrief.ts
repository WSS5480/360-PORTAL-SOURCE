/**
 * Engagement visit outcome — separate from provider discovery stage.
 * Positive sentiment and conditional access must not classify as Observation Approved.
 */

import { CONTACT_INFO_MISSING_RE } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import {
  assessObservationAccessFromDebrief,
  debriefExplicitlyApprovesObservation,
} from "@/lib/surgical-sales/observationApprovalDebriefMapping";
import type { ObservationStatusChoice } from "@/lib/surgical-sales/observationStatus";
import type { StartMissionOutcomeId } from "@/lib/surgical-sales/engagements/startMissionConfig";

export const ENGAGEMENT_OUTCOME_LABELS = {
  observation_approved: "Observation Approved",
  follow_up_needed: "Follow Up Needed",
  observation_denied: "Observation Denied",
  no_meaningful_update: "No Meaningful Update",
} as const satisfies Record<string, string>;

export type ClassifiedEngagementOutcomeId = keyof typeof ENGAGEMENT_OUTCOME_LABELS;

export type ClassifiedEngagementOutcome = {
  outcomeId: ClassifiedEngagementOutcomeId;
  label: string;
  rationale: string;
};

const OBSERVATION_DENIED_RE = [
  /\b(?:won'?t|will\s+not)\s+allow\b[^.]{0,80}\bobservation\b/i,
  /\bnot\s+(?:allow|permit|approve)\b[^.]{0,80}\bobservation\b/i,
  /\b(?:won'?t|will\s+not|not)\s+(?:allow|permit|approve)\s+(?:us\s+)?(?:for\s+)?observation\b/i,
  /\bobservation\s+(?:is\s+)?not\s+(?:allowed|permitted|possible)\b/i,
  /\b(?:declined|refused|rejected)\s+(?:the\s+)?observation\b/i,
  /\b(?:blocked|blocking)\s+observation\b/i,
  /\bno\s+observation(?:s)?\s+(?:allowed|permitted)\b/i,
  /\bcannot\s+observe\b/i,
  /\bcan't\s+observe\b/i,
];

const NEXT_STEP_RE =
  /\b(?:next\s+step|follow[\s-]?up|need\s+to|still\s+need|get\s+back|reach\s+out|schedule|credential|contact\s+info|before\s+we\s+can)\b/i;

const ACTIONABLE_SIGNAL_RE =
  /\b(?:karen|scheduler|coordinator|credential|intellicentrics|acsis|product|workflow|pain|frustrat|interested|visibility|case\s+mix|hernia|robotic)\b/i;

function debriefExplicitlyDeniesObservation(note: string): boolean {
  const text = note.trim();
  if (!text) return false;
  return OBSERVATION_DENIED_RE.some((re) => re.test(text));
}

function debriefHasMeaningfulContent(text: string): boolean {
  const t = text.trim();
  if (t.length < 24) return false;
  return ACTIONABLE_SIGNAL_RE.test(t) || NEXT_STEP_RE.test(t);
}

function debriefNeedsFollowUp(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  const access = assessObservationAccessFromDebrief(t);

  if (access.observationInterest && !access.observationApprovalExplicit) return true;
  if (access.accessPathIdentified === "partial") return true;
  if (access.blockers.some((b) => b !== "none" && b !== "approval_pathway")) return true;
  if (access.blockers.includes("approval_pathway") && !access.observationApprovalExplicit) {
    return true;
  }

  if (CONTACT_INFO_MISSING_RE.test(t)) return true;
  if (NEXT_STEP_RE.test(t)) return true;

  if (debriefHasMeaningfulContent(t) && !debriefExplicitlyApprovesObservation(t)) {
    return true;
  }

  return false;
}

/**
 * Classify visit outcome from debrief / live notes (not provider pathway stage).
 */
export function classifyEngagementOutcomeFromDebrief(note: string): ClassifiedEngagementOutcome {
  const text = note.trim();

  if (!text || text.length < 12) {
    return {
      outcomeId: "no_meaningful_update",
      label: ENGAGEMENT_OUTCOME_LABELS.no_meaningful_update,
      rationale: "No debrief content to classify.",
    };
  }

  if (debriefExplicitlyDeniesObservation(text)) {
    return {
      outcomeId: "observation_denied",
      label: ENGAGEMENT_OUTCOME_LABELS.observation_denied,
      rationale: "Debrief states observation was declined or blocked.",
    };
  }

  if (debriefExplicitlyApprovesObservation(text)) {
    return {
      outcomeId: "observation_approved",
      label: ENGAGEMENT_OUTCOME_LABELS.observation_approved,
      rationale: "Debrief explicitly states observation was approved.",
    };
  }

  if (debriefNeedsFollowUp(text)) {
    return {
      outcomeId: "follow_up_needed",
      label: ENGAGEMENT_OUTCOME_LABELS.follow_up_needed,
      rationale:
        "Interest, conditional access, missing details, or a next step — not explicit approval.",
    };
  }

  if (!debriefHasMeaningfulContent(text)) {
    return {
      outcomeId: "no_meaningful_update",
      label: ENGAGEMENT_OUTCOME_LABELS.no_meaningful_update,
      rationale: "No actionable intelligence or next step captured.",
    };
  }

  return {
    outcomeId: "follow_up_needed",
    label: ENGAGEMENT_OUTCOME_LABELS.follow_up_needed,
    rationale: "Operational signals captured without explicit observation approval.",
  };
}

/** Map rep-selected visit outcome to provider observation status (separate from engagement outcome label). */
export function resolveProviderObservationStatusForEngagementOutcome(input: {
  outcomeId: StartMissionOutcomeId;
  debriefText: string;
}): ObservationStatusChoice | null {
  const text = input.debriefText.trim();

  switch (input.outcomeId) {
    case "observation_denied":
      return "denied";
    case "observation_approved":
      if (!text) return "permission_confirmed";
      return debriefExplicitlyApprovesObservation(text)
        ? "permission_confirmed"
        : "permission_not_yet_confirmed";
    case "follow_up_needed":
    case "touch_follow_up":
      if (!text) return "permission_not_yet_confirmed";
      return debriefNeedsFollowUp(text) || debriefIndicatesLightTouch(text)
        ? "permission_not_yet_confirmed"
        : null;
    case "touch_success":
      if (!text) return "permission_not_yet_confirmed";
      return debriefExplicitlyApprovesObservation(text)
        ? "permission_confirmed"
        : "permission_not_yet_confirmed";
    case "no_meaningful_update":
    case "touch_no_progress":
      return null;
    default:
      return null;
  }
}

function debriefIndicatesLightTouch(text: string): boolean {
  return text.length >= 12 && debriefHasMeaningfulContent(text);
}

export function engagementOutcomeIdFromClassification(
  classified: ClassifiedEngagementOutcome,
): StartMissionOutcomeId {
  return classified.outcomeId;
}
