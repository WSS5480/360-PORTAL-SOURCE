/**
 * Final reconciliation for observation access review items before card render.
 */

import type { ReviewUpdateItem } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateItems";
import {
  textNegatesCredentialingRequirement,
  textNegatesObservationAccess,
} from "@/lib/surgical-sales/intelligenceContradictionDetection";

function observationContextBlob(dictation: string, item: ReviewUpdateItem): string {
  return `${dictation} ${item.evidenceQuotes.join(" ")}`.toLowerCase();
}

function interestedFromContext(context: string): boolean {
  return /\b(?:not opposed|wasn'?t opposed|usually not a problem|no problem|open to|interested|possible|no objections?|willing to discuss)\b/i.test(
    context,
  );
}

/** Ensure Observation Status, Approval, and Credentialing cannot contradict. */
export function reconcileObservationReviewItem(
  item: ReviewUpdateItem,
  dictation: string,
): ReviewUpdateItem {
  if (item.type !== "observation_access") return item;

  let observationStatus = item.observationStatus ?? "Needs validation";
  let approval = item.approval ?? "Not Confirmed";
  let credentialingSummary = item.credentialingSummary ?? "Not discussed";
  const context = observationContextBlob(dictation, item);
  const rawContext = `${dictation} ${item.evidenceQuotes.join(" ")}`;

  // Reversal language ("temporarily suspended", "no longer available",
  // "cannot attend") is the current state — it overrides any historical
  // "previously approved" reference picked up by the extractors.
  if (textNegatesObservationAccess(rawContext)) {
    approval = "Not Confirmed";
    if (observationStatus === "Approved") {
      observationStatus = "Needs Follow-Up";
    }
  }

  if (approval === "Not Confirmed" && observationStatus === "Approved") {
    observationStatus = interestedFromContext(context) ? "Interested" : "Needs Follow-Up";
  }

  if (/\bno observation was approved today\b/i.test(context) && observationStatus === "Approved") {
    observationStatus = interestedFromContext(context) ? "Interested" : "Needs Follow-Up";
  }

  if (
    /\b(?:not approved|wasn't approved|was not approved|not confirmed|needs approval)\b/i.test(
      context,
    ) &&
    observationStatus === "Approved"
  ) {
    observationStatus = interestedFromContext(context) ? "Interested" : "Needs Follow-Up";
  }

  if (textNegatesCredentialingRequirement(`${dictation} ${item.evidenceQuotes.join(" ")}`)) {
    // The dictation reverses the requirement — never let mention of the word
    // "credential" re-assert "Required".
    credentialingSummary = "Not required";
  } else if (/\b(?:credential|vendor approv)/i.test(context)) {
    if (credentialingSummary === "Not discussed" || credentialingSummary === "Discussed") {
      credentialingSummary = "Required";
    }
  }

  return { ...item, observationStatus, approval, credentialingSummary };
}
