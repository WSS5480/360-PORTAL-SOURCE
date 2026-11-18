/**
 * Pathway impact — how accepted intelligence changes provider progression.
 */

import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import { workflowParticipantPossibleRole } from "@/lib/surgical-sales/debriefDetectedContact";
import {
  clinicalInsightGroupIdFromLabel,
  type CommercialClinicalCategoryId,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import type {
  IntelligenceBriefObservationFields,
  IntelligenceBriefOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import type { ReviewUpdateItem } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateItems";

export const PATHWAY_IMPACT_LABEL = "Impact";

const CLINICAL_PATHWAY_IMPACT: Record<CommercialClinicalCategoryId, string> = {
  clinical_frustration: "Potential future product opportunity.",
  clinical_trend: "Volume trend informs prioritization for future engagement.",
  procedure_focus: "Procedure focus sharpens trial and observation planning.",
  clinical_preference: "Modality preference informs case selection and messaging.",
  product_opportunity: "Product fit signal strengthens commercial positioning.",
};

function pathwayImpactForObservation(
  fields: IntelligenceBriefObservationFields,
): string | null {
  if (/approved/i.test(fields.approval) && !/not yet/i.test(fields.approval)) {
    return "Provider can advance toward observation scheduling.";
  }
  if (/required/i.test(fields.requirements)) {
    return "Access remains dependent on vendor clearance.";
  }
  if (/not yet approved/i.test(fields.approval)) {
    return "Observation path remains open pending approval.";
  }
  if (/interested/i.test(fields.status)) {
    return "Observation interest strengthens the access conversation.";
  }
  return null;
}

function pathwayImpactForContactRole(role?: string | null): string | null {
  if (/schedul/i.test(role ?? "")) {
    return "Observation logistics can now be coordinated.";
  }
  if (role?.trim()) {
    return "Support contact strengthens operational readiness.";
  }
  return "Contact intelligence improves coordination on the next touch.";
}

function pathwayImpactForClinicalCategory(categoryLabel?: string | null): string | null {
  if (!categoryLabel?.trim()) return null;
  const groupId = clinicalInsightGroupIdFromLabel(categoryLabel);
  return CLINICAL_PATHWAY_IMPACT[groupId] ?? null;
}

export function pathwayImpactForClinicalInsight(categoryLabel?: string | null): string | null {
  return pathwayImpactForClinicalCategory(categoryLabel);
}

function pathwayImpactForFollowUp(summaryLine: string): string | null {
  const blob = summaryLine.trim().toLowerCase();
  if (!blob) return null;
  if (/\b(?:phone|email|contact info|contact information)\b/.test(blob)) {
    return "Completing this step unlocks observation logistics.";
  }
  if (/\bcredential|pathway|platform\b/.test(blob)) {
    return "Credentialing clarity reduces access delay on the next visit.";
  }
  if (/\bobservation|approval|schedul\b/.test(blob)) {
    return "Resolving this keeps observation progression on track.";
  }
  return "Follow-through keeps provider progression moving.";
}

export function pathwayImpactForFollowUpAction(summaryLine: string): string | null {
  return pathwayImpactForFollowUp(summaryLine);
}

export function pathwayImpactForBriefOutcome(outcome: IntelligenceBriefOutcome): string | null {
  switch (outcome.kind) {
    case "contact":
      return pathwayImpactForContactRole(outcome.subtitle);
    case "observation_access":
      return outcome.observationFields
        ? pathwayImpactForObservation(outcome.observationFields)
        : null;
    case "clinical_insight":
      return pathwayImpactForClinicalCategory(outcome.subtitle);
    case "follow_up":
      return pathwayImpactForFollowUp(outcome.summaryLine);
    default:
      return null;
  }
}

export function attachPathwayImpactToOutcomes(
  outcomes: IntelligenceBriefOutcome[],
): IntelligenceBriefOutcome[] {
  return outcomes.map((outcome) => {
    const pathwayImpactLine = pathwayImpactForBriefOutcome(outcome);
    return pathwayImpactLine ? { ...outcome, pathwayImpactLine } : outcome;
  });
}

export function pathwayImpactForReviewUpdateItem(item: ReviewUpdateItem): string | null {
  switch (item.type) {
    case "contact_candidate":
      return pathwayImpactForContactRole(item.roleValue ?? item.roleLabel);
    case "observation_access":
      if (!item.observationStatus && !item.approval && !item.credentialingSummary) return null;
      return pathwayImpactForObservation({
        status: item.observationStatus ?? "",
        approval: item.approval ?? "",
        requirements: item.credentialingSummary ?? "",
      });
    case "clinical_focus":
      return pathwayImpactForClinicalCategory(item.clinicalCategoryLabel);
    case "credentialing":
      return "Access remains dependent on vendor clearance.";
    case "follow_up_task":
      return pathwayImpactForFollowUp(item.taskTitle ?? "");
    case "organization_intelligence":
      if (/credential|platform|vendor/i.test(item.topicTitle ?? "")) {
        return "Access remains dependent on vendor clearance.";
      }
      return "Organization intelligence improves deployment planning.";
    default:
      return null;
  }
}

export function pathwayImpactForObservationCard(fields: {
  observationStatus?: string;
  approval?: string;
  credentialing?: string;
}): string | null {
  return pathwayImpactForObservation({
    status: fields.observationStatus ?? "",
    approval: fields.approval ?? "",
    requirements: fields.credentialing ?? "",
  });
}

export function pathwayImpactForProposedContact(contact: DebriefProposedContactItem): string | null {
  const role =
    workflowParticipantPossibleRole(contact) ?? contact.roleLabel ?? contact.contactTypeLabel;
  return pathwayImpactForContactRole(role);
}
