/**
 * PASS 3 — Deterministic business rules on classified facts.
 */

import { classifyEngagementOutcomeFromDebrief } from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import {
  debriefExplicitlyApprovesObservation,
  debriefIndicatesObservationInterest,
} from "@/lib/surgical-sales/observationApprovalDebriefMapping";
import {
  repIndicatesCredentialingPlatformUnknown,
  resolveCredentialingPlatformLabel,
} from "@/lib/surgical-sales/debriefCredentialingPlatformResolution";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type {
  DebriefClassifiedFact,
  DebriefRulesOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/types";

const CONFIRMED_CONTACT_RE =
  /\b(?:@[a-z0-9.-]+\.[a-z]{2,}|\(\d{3}\)|\d{3}[-.\s]\d{3}[-.\s]\d{4})\b/i;

export function runPass3RulesEngine(input: {
  dictation: string;
  classifiedFacts: DebriefClassifiedFact[];
  proposedContacts: DebriefProposedContactItem[];
}): DebriefRulesOutcome {
  const text = input.dictation.trim();
  const observationApprovedExplicit = debriefExplicitlyApprovesObservation(text);
  const observationInterestOnly =
    !observationApprovedExplicit && debriefIndicatesObservationInterest(text);

  let engagementOutcomeId = classifyEngagementOutcomeFromDebrief(text).outcomeId;
  if (!observationApprovedExplicit && observationInterestOnly) {
    engagementOutcomeId = "follow_up_needed";
  }

  const platform = resolveCredentialingPlatformLabel(text);
  const credentialingPlatformLabel =
    platform.label === "" && /\bcredential/i.test(text) ? "Unknown" : platform.label || "Unknown";
  const credentialingPlatformConfirmed =
    credentialingPlatformLabel !== "Unknown" &&
    !repIndicatesCredentialingPlatformUnknown(text) &&
    platform.confidence === "High";

  const pathwayStageId = observationApprovedExplicit ? "observe" : "discovery";

  const workflowParticipantNames = new Set<string>();
  const supportContactCandidateNames = new Set<string>();
  const rejectedFactIds: string[] = [];

  for (const fact of input.classifiedFacts) {
    for (const name of fact.named_people) {
      const contact = input.proposedContacts.find(
        (c) => c.displayName.toLowerCase() === name.toLowerCase(),
      );
      const hasContactInfo =
        Boolean(contact?.email.trim() || contact?.phone.trim()) ||
        CONFIRMED_CONTACT_RE.test(fact.evidence_quote);

      if (hasContactInfo && contact?.mentionLevel === "confirmed_support_contact") {
        supportContactCandidateNames.add(name);
      } else {
        workflowParticipantNames.add(name);
      }
    }

    if (
      fact.classification === "credentialing" &&
      fact.fact_key === "credentialing_platform_confirmed" &&
      !credentialingPlatformConfirmed
    ) {
      rejectedFactIds.push(fact.id);
    }
  }

  return {
    observationApprovedExplicit,
    observationInterestOnly,
    engagementOutcomeId,
    credentialingPlatformLabel,
    credentialingPlatformConfirmed,
    pathwayStageId,
    workflowParticipantNames: [...workflowParticipantNames],
    supportContactCandidateNames: [...supportContactCandidateNames],
    rejectedFactIds,
  };
}

export function acceptedClassifiedFacts(
  facts: DebriefClassifiedFact[],
  rules: DebriefRulesOutcome,
): DebriefClassifiedFact[] {
  const rejected = new Set(rules.rejectedFactIds);
  return facts.filter((f) => !rejected.has(f.id));
}
