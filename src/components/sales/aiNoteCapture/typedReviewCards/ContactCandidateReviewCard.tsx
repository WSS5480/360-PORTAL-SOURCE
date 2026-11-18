"use client";

import React from "react";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type {
  ContactCandidateReviewCard,
  DebriefReviewCardAction,
} from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import { AI_DEBRIEF_REVIEW_UNDO } from "@/lib/surgical-sales/debriefApprovalUx";
import type { DebriefReviewItemDisposition } from "@/lib/surgical-sales/debriefReviewItemState";
import { DebriefDetectedContactCard } from "../DebriefDetectedContactCard";
import {
  DebriefReviewCardActions,
  DebriefReviewCardConfidenceBadge,
  DebriefReviewCardEvidence,
  DebriefReviewCardFieldRow,
  DebriefReviewCardFields,
  DebriefTypedReviewCardShell,
} from "./DebriefReviewCardParts";

export function ContactCandidateReviewCardView({
  card,
  disposition,
  readOnly,
  contact,
  organizationId,
  proposedContacts,
  onAction,
  onContactsChange,
}: {
  card: ContactCandidateReviewCard;
  disposition: DebriefReviewItemDisposition;
  readOnly?: boolean;
  contact: DebriefProposedContactItem | null;
  organizationId: string | null;
  proposedContacts: DebriefProposedContactItem[];
  onAction: (action: DebriefReviewCardAction) => void;
  onContactsChange?: (contacts: DebriefProposedContactItem[]) => void;
}) {
  const [workflowExpanded, setWorkflowExpanded] = React.useState<"create" | "link" | null>(null);

  function patchContact(next: DebriefProposedContactItem) {
    onContactsChange?.(proposedContacts.map((row) => (row.id === next.id ? next : row)));
  }

  function handleAction(action: DebriefReviewCardAction) {
    if (!contact) {
      onAction(action);
      return;
    }
    if (action.type === "create_contact") {
      setWorkflowExpanded("create");
      patchContact({ ...contact, disposition: "add_details" });
      return;
    }
    if (action.type === "link_contact") {
      setWorkflowExpanded("link");
      patchContact({ ...contact, disposition: "link" });
      return;
    }
    if (action.type === "ignore") {
      setWorkflowExpanded(null);
      patchContact({ ...contact, disposition: "skipped" });
      onAction(action);
      return;
    }
    onAction(action);
  }

  const undo =
    disposition === "ignored" && contact ? (
      <button
        type="button"
        className="ai-debrief-btn--ghost ai-typed-review-card__undo"
        disabled={readOnly}
        onClick={() => {
          patchContact({ ...contact, disposition: "pending" });
          onAction({ id: `${card.id}-undo`, type: "ignore", label: AI_DEBRIEF_REVIEW_UNDO });
        }}
      >
        {AI_DEBRIEF_REVIEW_UNDO}
      </button>
    ) : null;

  return (
    <DebriefTypedReviewCardShell
      cardId={card.id}
      category={card.category}
      footer={
        contact && onContactsChange && workflowExpanded && contact.disposition !== "skipped" ? (
          <ul className="ai-debrief-contact-card-list">
            <DebriefDetectedContactCard
              contact={contact}
              organizationId={organizationId}
              disabled={readOnly}
              onChange={patchContact}
            />
          </ul>
        ) : null
      }
    >
      <h4 className="ai-typed-review-card__title">{card.displayName}</h4>
      <DebriefReviewCardFields>
        {card.roleLabel && card.roleValue ? (
          <DebriefReviewCardFieldRow label={card.roleLabel} value={card.roleValue} />
        ) : null}
        <DebriefReviewCardFieldRow
          label="Confidence"
          value={<DebriefReviewCardConfidenceBadge confidence={card.confidence} />}
        />
      </DebriefReviewCardFields>
      <DebriefReviewCardEvidence quotes={card.evidenceQuotes} />
      <DebriefReviewCardActions
        actions={card.actions}
        disposition={disposition}
        readOnly={readOnly}
        onAction={handleAction}
        undo={undo}
      />
    </DebriefTypedReviewCardShell>
  );
}
