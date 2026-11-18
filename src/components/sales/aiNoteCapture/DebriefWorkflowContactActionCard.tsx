"use client";

import React from "react";
import type { DebriefRecommendedAction } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import {
  DEBRIEF_WORKFLOW_CONTACT_ACTION_TITLE,
  DEBRIEF_WORKFLOW_PARTICIPANT_CREATE,
  DEBRIEF_WORKFLOW_PARTICIPANT_LINK,
  DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE,
} from "@/lib/surgical-sales/debriefApprovalUx";
import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { missionContactInfoStatusLabel } from "@/lib/surgical-sales/providerMissionExecutionLanguage";
import { DebriefDetectedContactCard } from "./DebriefDetectedContactCard";

function contactStatusLabel(status: string | undefined): string {
  if (!status) return missionContactInfoStatusLabel("Missing");
  if (status === "Missing" || status === "Partial" || status === "On file") {
    return missionContactInfoStatusLabel(status);
  }
  return status;
}

function displayParticipantName(action: DebriefRecommendedAction): string {
  const name = action.participantName?.trim();
  if (name && isPlausiblePersonName(name)) return name;
  return "Unknown person";
}

export function DebriefWorkflowContactActionCard({
  action,
  contact,
  organizationId,
  readOnly,
  onContactsChange,
  proposedContacts,
}: {
  action: DebriefRecommendedAction;
  contact: DebriefProposedContactItem | null;
  organizationId: string | null;
  readOnly?: boolean;
  proposedContacts: DebriefProposedContactItem[];
  onContactsChange: (contacts: DebriefProposedContactItem[]) => void;
}) {
  const [expanded, setExpanded] = React.useState<"create" | "link" | null>(null);

  function patchContact(next: DebriefProposedContactItem) {
    onContactsChange(proposedContacts.map((row) => (row.id === next.id ? next : row)));
  }

  function handleCreate() {
    if (!contact) return;
    setExpanded("create");
    patchContact({ ...contact, disposition: "add_details" });
  }

  function handleLink() {
    if (!contact) return;
    setExpanded("link");
    patchContact({ ...contact, disposition: "link" });
  }

  function handleSkip() {
    if (!contact) return;
    setExpanded(null);
    patchContact({ ...contact, disposition: "skipped" });
  }

  if (contact?.disposition === "skipped") {
    return (
      <article className="ai-debrief-action-card ai-debrief-action-card--skipped" data-testid={action.id}>
        <p className="ai-debrief-action-card__skipped">
          {action.participantName ?? "Contact"} — skipped for now
        </p>
        <button
          type="button"
          className="ai-debrief-btn--ghost"
          disabled={readOnly}
          onClick={() => contact && patchContact({ ...contact, disposition: "pending" })}
        >
          Undo
        </button>
      </article>
    );
  }

  return (
    <article className="ai-debrief-action-card ai-debrief-action-card--workflow-contact" data-testid={action.id}>
      <h4 className="ai-debrief-action-card__title">
        {displayParticipantName(action) || DEBRIEF_WORKFLOW_CONTACT_ACTION_TITLE}
      </h4>
      {action.body ? <p className="ai-debrief-action-card__body">{action.body}</p> : null}
      <dl className="ai-debrief-action-card__fields">
        <div>
          <dt>Name</dt>
          <dd>{displayParticipantName(action)}</dd>
        </div>
        {action.possibleRole ? (
          <div>
            <dt>Possible role</dt>
            <dd>{action.possibleRole}</dd>
          </div>
        ) : null}
        {action.evidenceQuote ? (
          <div>
            <dt>Evidence</dt>
            <dd className="ai-debrief-quote">&ldquo;{action.evidenceQuote}&rdquo;</dd>
          </div>
        ) : null}
        <div>
          <dt>Contact status</dt>
          <dd>{contactStatusLabel(action.contactInfoStatus)}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{action.confidence}</dd>
        </div>
      </dl>

      {contact && contact.disposition === "pending" && !expanded ? (
        <div className="ai-debrief-action-card__actions">
          <button type="button" className="ai-debrief-btn--primary" disabled={readOnly} onClick={handleCreate}>
            {DEBRIEF_WORKFLOW_PARTICIPANT_CREATE}
          </button>
          <button type="button" disabled={readOnly} onClick={handleLink}>
            {DEBRIEF_WORKFLOW_PARTICIPANT_LINK}
          </button>
          <button type="button" className="ai-debrief-btn--ghost" disabled={readOnly} onClick={handleSkip}>
            {DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE}
          </button>
        </div>
      ) : null}

      {contact && (expanded === "create" || expanded === "link" || contact.disposition !== "pending") ? (
        <ul className="ai-debrief-contact-card-list">
          <DebriefDetectedContactCard
            contact={contact}
            organizationId={organizationId}
            disabled={readOnly}
            onChange={patchContact}
          />
        </ul>
      ) : null}
    </article>
  );
}
