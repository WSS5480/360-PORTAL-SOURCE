/**
 * Apply commercial intelligence to contact patch on debrief save.
 */

import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { DebriefClassifiedFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import { buildProviderCommercialIntelligenceFromDebrief } from "@/lib/surgical-sales/buildProviderCommercialIntelligenceFromDebrief";
import { buildAcceptedCommercialIntelligenceInput } from "@/lib/surgical-sales/filterAcceptedCommercialIntelligenceInput";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import {
  mergeProviderCommercialIntelligence,
  parseProviderCommercialIntelligence,
  PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

export type ApplyCommercialIntelligenceInput = {
  existingContact: Record<string, unknown>;
  fieldPatches: Array<{ dbKey: string; value: string }>;
  atomicFacts?: DebriefAtomicFact[];
  classifiedFacts?: DebriefClassifiedFact[];
  proposedContacts?: DebriefProposedContactItem[];
  candidateContacts?: DebriefProposedContactItem[];
  sourceEngagementId?: string | null;
};

/** Merge accepted debrief intelligence into contact patch (provider_commercial_intelligence). */
export function applyCommercialIntelligenceToContactPatch(
  contactPatch: Record<string, unknown>,
  input: ApplyCommercialIntelligenceInput,
): Record<string, unknown> {
  const existing =
    parseProviderCommercialIntelligence(input.existingContact) ??
    parseProviderCommercialIntelligence(contactPatch);

  const incoming = buildProviderCommercialIntelligenceFromDebrief({
    atomicFacts: input.atomicFacts,
    classifiedFacts: input.classifiedFacts,
    fieldPatches: input.fieldPatches,
    proposedContacts: input.proposedContacts,
    candidateContacts: input.candidateContacts,
    sourceEngagementId: input.sourceEngagementId,
  });

  const merged = mergeProviderCommercialIntelligence(existing, incoming);

  return {
    ...contactPatch,
    [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: merged,
  };
}

/** Save Updates — only accepted review items update Provider Intelligence. */
export function applyAcceptedCommercialIntelligenceToContactPatch(
  contactPatch: Record<string, unknown>,
  input: {
    existingContact: Record<string, unknown>;
    fieldPatches: Array<{ dbKey: string; value: string }>;
    logUpdate?: LogUpdateParseResult;
    proposedContacts?: DebriefProposedContactItem[];
  },
): Record<string, unknown> {
  return applyCommercialIntelligenceToContactPatch(
    contactPatch,
    buildAcceptedCommercialIntelligenceInput(input),
  );
}
