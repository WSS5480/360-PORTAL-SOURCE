/**
 * Provider archive vs hard-delete rules — archive when field activity exists.
 */

import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  providerHasFieldIntelligenceEvidence,
  type ProviderFieldIntelligenceEvidenceInput,
} from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";

export type ProviderRecordRetentionFlags = {
  hasEngagements: boolean;
  hasCases: boolean;
  hasNotes: boolean;
  hasIntelligence: boolean;
};

export type ProviderHardDeleteAssessment = ProviderRecordRetentionFlags & {
  hardDeleteAllowed: boolean;
  blockHardDeleteReason: string | null;
};

function hasLoggedNotes(input: {
  contact?: Record<string, unknown>;
  activityTimeline?: Array<Record<string, unknown>>;
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];
}): boolean {
  if (String(input.contact?.notes ?? "").trim()) return true;
  if ((input.activityTimeline?.length ?? 0) > 0) return true;
  if ((input.clinicalDiscoveryAnswers?.length ?? 0) > 0) return true;
  return false;
}

function hasIntelligenceOnFile(input: ProviderFieldIntelligenceEvidenceInput): boolean {
  return providerHasFieldIntelligenceEvidence(input);
}

/** Client-side assessment from loaded provider profile payload. */
export function assessProviderHardDeleteFromProfile(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  activityTimeline?: Array<Record<string, unknown>>;
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];
}): ProviderHardDeleteAssessment {
  const evidenceInput: ProviderFieldIntelligenceEvidenceInput = {
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.activityTimeline,
    clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers,
  };

  const flags: ProviderRecordRetentionFlags = {
    hasEngagements: (input.engagements?.length ?? 0) > 0,
    hasCases: (input.cases?.length ?? 0) > 0,
    hasNotes: hasLoggedNotes(input),
    hasIntelligence: hasIntelligenceOnFile(evidenceInput),
  };

  const blockers: string[] = [];
  if (flags.hasEngagements) blockers.push("engagements");
  if (flags.hasCases) blockers.push("cases");
  if (flags.hasNotes) blockers.push("notes");
  if (flags.hasIntelligence) blockers.push("intelligence");

  const hardDeleteAllowed = blockers.length === 0;
  let blockHardDeleteReason: string | null = null;
  if (!hardDeleteAllowed) {
    blockHardDeleteReason =
      "This provider has engagements, cases, notes, or intelligence on file. Archive instead to remove it from active lists while keeping history.";
  }

  return {
    ...flags,
    hardDeleteAllowed,
    blockHardDeleteReason,
  };
}

/** Server-side assessment from aggregate counts and contact snapshot. */
export function assessProviderHardDeleteFromCounts(input: {
  contact: Record<string, unknown>;
  engagementCount: number;
  caseCount: number;
  providerActivityCount: number;
  clinicalDiscoveryAnswerCount: number;
}): ProviderHardDeleteAssessment {
  const hasNotes =
    input.providerActivityCount > 0 ||
    input.clinicalDiscoveryAnswerCount > 0 ||
    Boolean(String(input.contact.notes ?? "").trim());

  const flags: ProviderRecordRetentionFlags = {
    hasEngagements: input.engagementCount > 0,
    hasCases: input.caseCount > 0,
    hasNotes,
    hasIntelligence:
      providerHasFieldIntelligenceEvidence({ contact: input.contact }) ||
      input.clinicalDiscoveryAnswerCount > 0,
  };

  const blockers: string[] = [];
  if (flags.hasEngagements) blockers.push("engagements");
  if (flags.hasCases) blockers.push("cases");
  if (flags.hasNotes) blockers.push("notes");
  if (flags.hasIntelligence) blockers.push("intelligence");

  const hardDeleteAllowed = blockers.length === 0;
  return {
    ...flags,
    hardDeleteAllowed,
    blockHardDeleteReason: hardDeleteAllowed
      ? null
      : "This provider has engagements, cases, notes, or intelligence on file. Archive instead to remove it from active lists while keeping history.",
  };
}
