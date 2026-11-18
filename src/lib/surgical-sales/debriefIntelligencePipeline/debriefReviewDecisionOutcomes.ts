/**
 * Outcomes that need rep action before save — contacts and blocking conflicts.
 */

import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import { findProposedContactForPersonName } from "@/lib/surgical-sales/debriefDetectedContact";
import type { IntelligenceBriefOutcome } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";

function contactNeedsDecision(contact: DebriefProposedContactItem | null | undefined): boolean {
  if (!contact) return false;
  if (contact.disposition === "skipped" || contact.disposition === "accepted") return false;
  return true;
}

function proposedContactForOutcome(
  outcome: IntelligenceBriefOutcome,
  proposedContacts: DebriefProposedContactItem[],
): DebriefProposedContactItem | undefined {
  if (outcome.contactId) {
    const byId = proposedContacts.find((row) => row.id === outcome.contactId);
    if (byId) return byId;
  }
  return findProposedContactForPersonName(outcome.primaryLine ?? outcome.summaryLine, proposedContacts);
}

export function filterDecisionRequiredOutcomes(input: {
  outcomes: IntelligenceBriefOutcome[];
  proposedContacts: DebriefProposedContactItem[];
}): IntelligenceBriefOutcome[] {
  const decisions: IntelligenceBriefOutcome[] = [];

  for (const outcome of input.outcomes) {
    if (outcome.kind !== "contact") continue;
    const contact = proposedContactForOutcome(outcome, input.proposedContacts);
    if (contactNeedsDecision(contact)) {
      decisions.push(outcome);
    }
  }

  return decisions;
}

export function hasOpenReviewDecisions(input: {
  outcomes: IntelligenceBriefOutcome[];
  proposedContacts: DebriefProposedContactItem[];
  unresolvedConflictCount: number;
}): boolean {
  return (
    input.unresolvedConflictCount > 0 ||
    filterDecisionRequiredOutcomes(input).length > 0
  );
}
