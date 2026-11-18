"use client";

import React from "react";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { LogUpdateConflictResolution, LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type { IntelligenceBriefOutcome } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { INTELLIGENCE_BRIEF_DECISIONS_TITLE } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import { findProposedContactForPersonName } from "@/lib/surgical-sales/debriefDetectedContact";
import { DebriefOutcomeRow } from "./DebriefOutcomeRow";
import { DebriefUnresolvedConflictsPanel } from "./DebriefUnresolvedConflictsPanel";

function resolveContactForOutcome(
  outcome: IntelligenceBriefOutcome,
  proposedContacts: DebriefProposedContactItem[],
): DebriefProposedContactItem | null {
  if (outcome.contactId) {
    const byId = proposedContacts.find((row) => row.id === outcome.contactId);
    if (byId) return byId;
  }
  return findProposedContactForPersonName(outcome.primaryLine ?? outcome.summaryLine, proposedContacts) ?? null;
}

/**
 * Items requiring a rep decision before save. Contact decisions render as the
 * same contact row used in the intelligence brief (with the disposition form
 * inline) — one representation per person, no separate decision card.
 */
export function DebriefReviewDecisionsSection({
  contactOutcomes,
  proposedContacts,
  organizationId,
  unresolvedConflictFields,
  selectedOutcomeIds,
  readOnly,
  onContactsChange,
  onSelectedChange,
  linkedFieldUpdatesForOutcome,
  onResolveConflict,
}: {
  contactOutcomes: IntelligenceBriefOutcome[];
  proposedContacts: DebriefProposedContactItem[];
  organizationId: string | null;
  unresolvedConflictFields: LogUpdateRoutedFieldUpdate[];
  selectedOutcomeIds?: ReadonlySet<string>;
  readOnly?: boolean;
  onContactsChange?: (contacts: DebriefProposedContactItem[]) => void;
  onSelectedChange?: (outcomeId: string, selected: boolean) => void;
  linkedFieldUpdatesForOutcome?: (outcome: IntelligenceBriefOutcome) => LogUpdateRoutedFieldUpdate[];
  onResolveConflict: (id: string, resolution: LogUpdateConflictResolution) => void;
}) {
  const openOutcomes = contactOutcomes.filter((outcome) =>
    Boolean(resolveContactForOutcome(outcome, proposedContacts)),
  );

  if (openOutcomes.length === 0 && unresolvedConflictFields.length === 0) {
    return null;
  }

  return (
    <section
      className="ai-debrief-review-decisions"
      aria-label={INTELLIGENCE_BRIEF_DECISIONS_TITLE}
      data-testid="ai-debrief-review-decisions"
    >
      <h3 className="ai-debrief-review-decisions__title">{INTELLIGENCE_BRIEF_DECISIONS_TITLE}</h3>
      <DebriefUnresolvedConflictsPanel
        fields={unresolvedConflictFields}
        readOnly={readOnly}
        onResolveConflict={onResolveConflict}
      />
      {openOutcomes.length > 0 && onContactsChange ? (
        <ul className="ai-intelligence-brief__list ai-debrief-review-decisions__contacts">
          {openOutcomes.map((outcome) => {
            const contact = resolveContactForOutcome(outcome, proposedContacts);
            return (
              <DebriefOutcomeRow
                key={outcome.id}
                outcome={outcome}
                selected={selectedOutcomeIds?.has(outcome.id) ?? true}
                readOnly={readOnly}
                contact={contact}
                organizationId={organizationId}
                proposedContacts={proposedContacts}
                onContactsChange={onContactsChange}
                onSelectedChange={(selected) => onSelectedChange?.(outcome.id, selected)}
                linkedFieldUpdates={linkedFieldUpdatesForOutcome?.(outcome) ?? []}
                onResolveConflict={onResolveConflict}
              />
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
