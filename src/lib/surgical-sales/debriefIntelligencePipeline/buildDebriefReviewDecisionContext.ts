/**
 * Production context for Review Updates decision guards.
 */

import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import type { ReviewUpdateGuardContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";

export function buildDebriefReviewDecisionContext(input: {
  providerContact?: Record<string, unknown> | null;
  providerLabel?: string | null;
  engagementParticipantNames?: string[];
  organizationContactNames?: string[];
  discoveryContext?: DebriefIntelligenceExtractionContext | null;
}): ReviewUpdateGuardContext {
  const fromRecord =
    input.providerContact &&
    (input.providerContact.first_name != null ||
      input.providerContact.last_name != null ||
      input.providerContact.email != null)
      ? contactDisplayName(
          input.providerContact as Parameters<typeof contactDisplayName>[0],
        )
      : null;

  const providerDisplayName =
    input.providerLabel?.trim() || (fromRecord && fromRecord !== "—" ? fromRecord : null);

  const participants = new Set<string>();
  if (providerDisplayName) participants.add(providerDisplayName);
  for (const name of input.engagementParticipantNames ?? []) {
    if (name?.trim()) participants.add(name.trim());
  }

  const organizationContactNames = new Set(input.organizationContactNames ?? []);
  for (const contact of input.discoveryContext?.supportContacts ?? []) {
    if (contact.name?.trim()) organizationContactNames.add(contact.name.trim());
  }

  return {
    providerDisplayName,
    providerRecordName: fromRecord && fromRecord !== "—" ? fromRecord : null,
    engagementParticipantNames: [...participants],
    organizationContactNames: [...organizationContactNames],
  };
}
