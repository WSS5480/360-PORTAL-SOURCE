/**
 * Post-dictation synthesis — executive briefing for rep review (sales language, no invented facts).
 */

import { buildConcreteDebriefNextSteps } from "@/lib/surgical-sales/buildConcreteDebriefNextSteps";
import { classifyEngagementOutcomeFromDebrief } from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import {
  assessObservationAccessFromDebrief,
  debriefExplicitlyApprovesObservation,
} from "@/lib/surgical-sales/observationApprovalDebriefMapping";
import {
  buildPreservedNamedEntity,
  extractPreservedNamedEntities,
  type PreservedNamedEntity,
} from "@/lib/surgical-sales/namedEntityPreservation";
import { sanitizeRepFriendlyCopy } from "@/lib/surgical-sales/debriefRepFriendlyReview";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

export type WorkflowParticipantContactStatus = "On file" | "Missing" | "Partial";

export type DebriefWorkflowParticipant = {
  id: string;
  name: string;
  possibleRole: string | null;
  confidence: "High" | "Medium" | "Low";
  contactInfoStatus: WorkflowParticipantContactStatus;
  evidence: string | null;
};

export type DebriefAccessSynthesis = {
  headline: string;
  observationPossible: boolean;
  blockers: string[];
  nextActions: string[];
  bodyLines: string[];
};

export type DebriefClinicalCommercialSynthesis = {
  headline: string;
  procedureMix: string | null;
  clinicalFocus: string | null;
  productRelevance: string | null;
  bodyLines: string[];
};

export type DebriefExecutiveBriefing = {
  access: DebriefAccessSynthesis;
  clinicalCommercial: DebriefClinicalCommercialSynthesis | null;
  workflowParticipants: DebriefWorkflowParticipant[];
  /** Flat lines for Key Takeaways (deduped, sales language). */
  keyTakeawayLines: string[];
  /** Ordered next actions for the rep. */
  nextActionLines: string[];
};

import {
  repIndicatesCredentialingPlatformUnknown,
  resolveCredentialingPlatformLabel,
} from "@/lib/surgical-sales/debriefCredentialingPlatformResolution";

export {
  repIndicatesCredentialingPlatformUnknown,
  resolveCredentialingPlatformLabel,
} from "@/lib/surgical-sales/debriefCredentialingPlatformResolution";

const KEY_TAKEAWAY_MAX = 320;

const INTERNAL_TAXONOMY_RE =
  /\b(?:shared_workflow|provider_office|provider-linked|deployment readiness|operational signals?|readiness signals?|partially mapped|credentialing_required|discussed_only)\b/gi;

const GENERIC_SCHEDULING_OWNERSHIP_RE =
  /\bscheduling ownership identified\b|\bscheduling contact identified\b|\bscheduling coordinator identified\b/i;

export function sanitizeSalesLanguageCopy(text: string, maxLen = 320): string {
  let t = sanitizeRepFriendlyCopy(String(text ?? "").trim(), maxLen);
  t = t.replace(INTERNAL_TAXONOMY_RE, (match) => {
    const key = match.toLowerCase();
    if (key === "shared_workflow") return "shared scheduling between office and hospital";
    if (key === "provider_office" || key === "provider-linked") return "provider office team";
    if (key.includes("deployment")) return "ready for field evaluation";
    if (key.includes("operational")) return "field notes";
    if (key.includes("partially mapped")) return "";
    return "";
  });
  t = t.replace(GENERIC_SCHEDULING_OWNERSHIP_RE, (match) => match);
  return t.replace(/\s{2,}/g, " ").trim();
}

function participantFromContact(contact: DebriefProposedContactItem): DebriefWorkflowParticipant {
  const hasEmail = Boolean(contact.email.trim());
  const hasPhone = Boolean(contact.phone.trim());
  let contactInfoStatus: WorkflowParticipantContactStatus = "Missing";
  if (hasEmail && hasPhone) contactInfoStatus = "On file";
  else if (hasEmail || hasPhone) contactInfoStatus = "Partial";

  const entity = buildPreservedNamedEntity(contact.displayName, contact.sourceQuote ?? contact.notes);

  return {
    id: contact.id,
    name: contact.displayName,
    possibleRole: contact.roleLabel?.trim() || entity.possibleRole,
    confidence:
      contact.mentionLevel === "confirmed_support_contact"
        ? "High"
        : contact.contactDetailsMissing
          ? "Medium"
          : entity.nameConfidence,
    contactInfoStatus,
    evidence: contact.sourceQuote?.trim() || null,
  };
}

function participantFromEntity(entity: PreservedNamedEntity, dictation: string): DebriefWorkflowParticipant {
  const sentence = dictation
    .split(/(?<=[.!?])\s+/)
    .find((part) => new RegExp(`\\b${entity.name}\\b`, "i").test(part));
  return {
    id: `participant-${entity.name.toLowerCase().replace(/\s+/g, "-")}`,
    name: entity.name,
    possibleRole: entity.possibleRole,
    confidence: entity.nameConfidence,
    contactInfoStatus: "Missing",
    evidence: sentence?.trim().slice(0, 280) || null,
  };
}

export function buildWorkflowParticipants(input: {
  dictation: string;
  proposedContacts: DebriefProposedContactItem[];
}): DebriefWorkflowParticipant[] {
  const seen = new Set<string>();
  const participants: DebriefWorkflowParticipant[] = [];

  const add = (row: DebriefWorkflowParticipant) => {
    const key = row.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    participants.push(row);
  };

  for (const contact of input.proposedContacts) {
    if (
      contact.mentionLevel === "workflow_participant" ||
      contact.mentionLevel === "potential_support_contact" ||
      contact.mentionLevel === "confirmed_support_contact"
    ) {
      add(participantFromContact(contact));
    }
  }

  for (const entity of extractPreservedNamedEntities(input.dictation)) {
    add(participantFromEntity(entity, input.dictation));
  }

  return participants;
}

function namedSchedulingLine(participants: DebriefWorkflowParticipant[]): string | null {
  const schedulers = participants.filter((p) =>
    /schedul|coordinator|office manager/i.test(p.possibleRole ?? ""),
  );
  const pick = schedulers[0] ?? participants[0];
  if (!pick) return null;
  const role = pick.possibleRole ? ` as potential ${pick.possibleRole.toLowerCase()}` : "";
  return `${pick.name} identified${role}.`;
}

function synthesizeAccess(input: {
  dictation: string;
  review: LogUpdateParseResult;
  participants: DebriefWorkflowParticipant[];
}): DebriefAccessSynthesis {
  const text = input.dictation.trim();
  const access = assessObservationAccessFromDebrief(text);
  const denied = classifyEngagementOutcomeFromDebrief(text).outcomeId === "observation_denied";
  const approved = debriefExplicitlyApprovesObservation(text);
  const credentialing = resolveCredentialingPlatformLabel(text);

  const blockers = new Set<string>();

  if (denied) {
    blockers.add("Observation access denied at this site");
  } else if (!approved) {
    if (access.blockers.includes("credentialing") || /\bcredential/i.test(text)) {
      blockers.add("Credentialing");
    }
    if (
      access.blockers.includes("scheduling") ||
      access.blockers.includes("approval_pathway") ||
      /\bschedul/i.test(text)
    ) {
      blockers.add("Scheduling coordination");
    }
    if (access.blockers.includes("approval_pathway") && !approved) {
      blockers.add("Observation approval not confirmed");
    }
  }

  if (credentialing.label === "Unknown" && /\bcredential/i.test(text)) {
    blockers.add("Credentialing platform not confirmed");
  }

  const nextActions = buildConcreteDebriefNextSteps({
    dictation: text,
    aiRecommendedMoves: input.review.aiMapping?.recommended_next_moves
      ?.map((m) => m.action?.trim())
      .filter((a): a is string => Boolean(a)),
    rules: {
      observationApprovedExplicit: approved,
      observationInterestOnly:
        !approved && (access.observationInterest || access.accessPathIdentified !== "no"),
      credentialingPlatformLabel: credentialing.label || "Unknown",
      credentialingPlatformConfirmed:
        credentialing.confidence === "High" && credentialing.label !== "Unknown",
      pathwayStageId: approved ? "observe" : "discovery",
      engagementOutcomeId: denied ? "observation_denied" : "follow_up_needed",
      workflowParticipantNames: input.participants
        .filter((p) => p.contactInfoStatus !== "On file")
        .map((p) => p.name),
      supportContactCandidateNames: [],
      rejectedFactIds: [],
    },
  });

  const observationPossible = !denied && (approved || access.observationInterest || access.accessPathIdentified !== "no");

  let headline = "Observation access still needs validation.";
  if (denied) {
    headline = "Observation access not available at this facility.";
  } else if (approved) {
    headline = "Observation approved — coordinate logistics next.";
  } else if (observationPossible) {
    headline = "Observation appears possible with follow-through on access steps.";
  }

  const bodyLines: string[] = [headline];
  if (observationPossible && !denied) {
    bodyLines.push("Observation appears possible.");
  }
  if (blockers.size > 0) {
    bodyLines.push("Current blockers:");
    for (const b of blockers) bodyLines.push(`- ${b}`);
  }
  if (nextActions.length > 0) {
    bodyLines.push("Next action:");
    for (const a of nextActions) bodyLines.push(`- ${a}`);
  }

  const namedLine = namedSchedulingLine(input.participants);
  if (namedLine && !bodyLines.some((l) => l.includes(namedLine.split(".")[0]!))) {
    bodyLines.splice(1, 0, namedLine);
  }

  return {
    headline: sanitizeSalesLanguageCopy(headline, 160),
    observationPossible,
    blockers: [...blockers],
    nextActions: [...nextActions],
    bodyLines: bodyLines.map((l) => sanitizeSalesLanguageCopy(l, 280)),
  };
}

function synthesizeClinicalCommercial(dictation: string): DebriefClinicalCommercialSynthesis | null {
  const text = dictation.trim();
  const hasClinical =
    /\b(?:hernia|abdominal|robotic|lap\b|case mix|procedure|volume|specialty)\b/i.test(text);
  const hasProduct = /\b(?:ACSIS|product|solution|trial|evaluate|preference)\b/i.test(text);
  if (!hasClinical && !hasProduct) return null;

  let procedureMix: string | null = null;
  if (/\brobotic hernia\b/i.test(text)) {
    procedureMix = "Robotic hernia case volume appears to be increasing.";
  } else if (/\babdominal wall\b/i.test(text)) {
    procedureMix = "More complex abdominal wall work noted.";
  } else if (/\bhernia\b/i.test(text)) {
    procedureMix = "Hernia cases discussed.";
  }

  let clinicalFocus: string | null = null;
  if (/\bvisualization\b/i.test(text) && /\bfixation\b/i.test(text)) {
    clinicalFocus = "Visualization and fixation workflow during cases.";
  } else if (/\bturnover\b/i.test(text)) {
    clinicalFocus = "OR turnover and setup workflow.";
  }

  let productRelevance: string | null = null;
  if (/\bACSIS\b/i.test(text)) {
    productRelevance =
      "ACSIS discussed — commercial relevance depends on observing cases and validating fit with the surgeon.";
  } else if (/\b(?:product|solution|trial)\b/i.test(text)) {
    productRelevance = "Product evaluation interest surfaced — confirm fit after observation.";
  }

  const bodyLines: string[] = ["Clinical & commercial snapshot:"];
  if (procedureMix) bodyLines.push(`- Procedure mix: ${procedureMix}`);
  if (clinicalFocus) bodyLines.push(`- Clinical focus: ${clinicalFocus}`);
  if (productRelevance) bodyLines.push(`- Potential product relevance: ${productRelevance}`);

  return {
    headline: "Clinical and commercial signals captured.",
    procedureMix,
    clinicalFocus,
    productRelevance,
    bodyLines: bodyLines.map((l) => sanitizeSalesLanguageCopy(l, 280)),
  };
}

export function buildDebriefExecutiveBriefing(input: {
  dictation: string;
  review: LogUpdateParseResult;
  proposedContacts: DebriefProposedContactItem[];
}): DebriefExecutiveBriefing {
  const participants = buildWorkflowParticipants({
    dictation: input.dictation,
    proposedContacts: input.proposedContacts,
  });

  const access = synthesizeAccess({
    dictation: input.dictation,
    review: input.review,
    participants,
  });
  const clinicalCommercial = synthesizeClinicalCommercial(input.dictation);

  const keyTakeawayLines: string[] = [];
  const seen = new Set<string>();
  const addTakeaway = (line: string) => {
    const cleaned = sanitizeSalesLanguageCopy(line, KEY_TAKEAWAY_MAX);
    if (!cleaned || cleaned.length < 10) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    keyTakeawayLines.push(cleaned);
  };

  addTakeaway("Access Summary");
  for (const line of access.bodyLines) addTakeaway(line);

  if (clinicalCommercial) {
    for (const line of clinicalCommercial.bodyLines) addTakeaway(line);
  }

  for (const p of participants.slice(0, 4)) {
    const role = p.possibleRole ? ` (${p.possibleRole})` : "";
    const contactNote =
      p.contactInfoStatus === "On file"
        ? "contact info on file"
        : p.contactInfoStatus === "Partial"
          ? "partial contact info on file"
          : "contact details still being learned";
    addTakeaway(`${p.name}${role} — ${contactNote}.`);
  }

  const nextActionLines = [...access.nextActions].map((a) => sanitizeSalesLanguageCopy(a, 160));

  return {
    access,
    clinicalCommercial,
    workflowParticipants: participants,
    keyTakeawayLines,
    nextActionLines,
  };
}

export function formatWorkflowParticipantForReview(p: DebriefWorkflowParticipant): string {
  const lines = [
    `Name: ${p.name}`,
    p.possibleRole ? `Possible role: ${p.possibleRole}` : "Possible role: Not confirmed",
    `Confidence: ${p.confidence}`,
    `Contact info: ${p.contactInfoStatus}`,
  ];
  if (p.evidence) lines.push(`Evidence: "${p.evidence}"`);
  return lines.join("\n");
}

export function executiveBriefingToOrganizedNarrative(briefing: DebriefExecutiveBriefing): string {
  return briefing.keyTakeawayLines.join("\n");
}
