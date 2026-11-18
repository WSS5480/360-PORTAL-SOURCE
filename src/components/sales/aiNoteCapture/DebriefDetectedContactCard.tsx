"use client";

import React from "react";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  debriefContactCardPrompt,
  isWorkflowParticipantContact,
  workflowParticipantPossibleRole,
  type DebriefContactDisposition,
  type DebriefProposedContactItem,
  SUPPORT_CONTACT_INFO_NEEDED_LABEL,
} from "@/lib/surgical-sales/debriefDetectedContact";
import { pathwayImpactForProposedContact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligencePathwayImpact";
import {
  DEBRIEF_CONTACT_ADD_DETAILS,
  DEBRIEF_CONTACT_LINK_EXISTING,
  DEBRIEF_CONTACT_SKIP,
  DEBRIEF_REVIEW_CONTACT_ACTION,
  DEBRIEF_WORKFLOW_PARTICIPANT_CREATE,
  DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE,
  DEBRIEF_WORKFLOW_PARTICIPANT_LINK,
  DEBRIEF_WORKFLOW_PARTICIPANT_STATUS,
  DEBRIEF_CONTACT_FORM_EMAIL,
  DEBRIEF_CONTACT_FORM_FIRST,
  DEBRIEF_CONTACT_FORM_LAST,
  DEBRIEF_CONTACT_FORM_NOTES,
  DEBRIEF_CONTACT_FORM_PHONE,
  DEBRIEF_CONTACT_LINK_SEARCH,
} from "@/lib/surgical-sales/debriefApprovalUx";
import {
  INTELLIGENCE_BRIEF_HIDE_DETAILS,
  INTELLIGENCE_BRIEF_SHOW_DETAILS,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import { DebriefPathwayImpactNote } from "./DebriefPathwayImpactNote";

type ContactSearchHit = {
  id: string;
  label: string;
  subtitle: string | null;
};

function contactDecisionHeadline(
  contact: DebriefProposedContactItem,
  workflowParticipant: boolean,
  possibleRole: string | null,
): string {
  if (workflowParticipant) {
    return possibleRole ? `${contact.displayName} — ${possibleRole}` : contact.displayName;
  }
  return contact.displayName;
}

function ReviewContactActionBadge() {
  return (
    <span className="ai-brief-chip ai-brief-chip--neutral" data-testid="ai-debrief-contact-review-action">
      <span className="ai-brief-chip__value">{DEBRIEF_REVIEW_CONTACT_ACTION}</span>
    </span>
  );
}

function ContactDetailsToggle({
  expanded,
  disabled,
  onToggle,
}: {
  expanded: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="ai-intelligence-brief__expand"
      disabled={disabled}
      aria-expanded={expanded}
      onClick={onToggle}
    >
      {expanded ? INTELLIGENCE_BRIEF_HIDE_DETAILS : INTELLIGENCE_BRIEF_SHOW_DETAILS}
    </button>
  );
}

export function DebriefDetectedContactCard({
  contact,
  organizationId,
  disabled,
  onChange,
  embedded = false,
}: {
  contact: DebriefProposedContactItem;
  organizationId: string | null;
  disabled?: boolean;
  onChange: (next: DebriefProposedContactItem) => void;
  /** Render as div when nested inside another list item (e.g. intelligence brief outcome row). */
  embedded?: boolean;
}) {
  const [searchQ, setSearchQ] = React.useState("");
  const [searchHits, setSearchHits] = React.useState<ContactSearchHit[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);

  const showDetailsForm = contact.disposition === "add_details";
  const showLinkSearch = contact.disposition === "link";
  const workflowParticipant = isWorkflowParticipantContact(contact);
  const possibleRole = workflowParticipant ? workflowParticipantPossibleRole(contact) : null;
  const pathwayImpactLine = pathwayImpactForProposedContact(contact);
  const collapsibleDetails = embedded;
  const showExpandedDetails = !collapsibleDetails || detailsExpanded || showDetailsForm || showLinkSearch;

  React.useEffect(() => {
    if (collapsibleDetails && (showDetailsForm || showLinkSearch)) {
      setDetailsExpanded(true);
    }
  }, [collapsibleDetails, showDetailsForm, showLinkSearch]);

  React.useEffect(() => {
    if (!showLinkSearch) return;
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchHits([]);
      return;
    }
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q });
        if (organizationId) params.set("organization_id", organizationId);
        const res = await fetch(`/api/portal/sales/surgical-contacts?${params.toString()}`, {
          cache: "no-store",
        });
        const j = (await res.json()) as {
          ok?: boolean;
          contacts?: Array<Record<string, unknown>>;
        };
        if (!res.ok || !j.ok || !j.contacts) {
          setSearchHits([]);
          return;
        }
        setSearchHits(
          j.contacts.slice(0, 8).map((row) => ({
            id: String(row.id ?? ""),
            label: contactDisplayName(row),
            subtitle: [row.title, row.email, row.phone].filter(Boolean).join(" · ") || null,
          })),
        );
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => window.clearTimeout(t);
  }, [searchQ, showLinkSearch, organizationId]);

  function setDisposition(disposition: DebriefContactDisposition) {
    onChange({ ...contact, disposition });
  }

  function patch(partial: Partial<DebriefProposedContactItem>) {
    const next = { ...contact, ...partial };
    next.contactDetailsMissing = !String(next.email).trim() && !String(next.phone).trim();
    onChange(next);
  }

  const Shell = embedded ? "div" : "li";
  const headline = contactDecisionHeadline(contact, workflowParticipant, possibleRole);

  if (contact.disposition === "skipped") {
    return (
      <Shell className="ai-debrief-contact-card ai-debrief-contact-card--skipped">
        <span className="ai-debrief-contact-skipped-label">
          {contact.displayName} — skipped for now
        </span>
        <button type="button" className="ai-debrief-btn--ghost" disabled={disabled} onClick={() => setDisposition("pending")}>
          Undo
        </button>
      </Shell>
    );
  }

  return (
    <Shell
      className={`ai-debrief-contact-card${workflowParticipant ? " ai-debrief-contact-card--workflow-participant" : ""}${
        embedded ? " ai-debrief-contact-card--embedded" : ""
      }`}
      data-testid="ai-debrief-contact-card"
    >
      {collapsibleDetails ? (
        <div className="ai-intelligence-brief__row-head ai-debrief-contact-card__head">
          <div className="ai-intelligence-brief__row-copy">
            <p className="ai-intelligence-brief__primary">{headline}</p>
            {!showExpandedDetails ? <DebriefPathwayImpactNote line={pathwayImpactLine} /> : null}
            {!showExpandedDetails && contact.disposition === "pending" ? (
              <div className="ai-intelligence-brief__meta">
                <ReviewContactActionBadge />
              </div>
            ) : null}
          </div>
          <ContactDetailsToggle
            expanded={showExpandedDetails}
            disabled={disabled}
            onToggle={() => {
              if (showDetailsForm || showLinkSearch) {
                setDisposition("pending");
                setDetailsExpanded(false);
                return;
              }
              setDetailsExpanded((open) => !open);
            }}
          />
        </div>
      ) : null}

      {showExpandedDetails ? (
        <div className={collapsibleDetails ? "ai-debrief-contact-card__details" : undefined}>
          {!collapsibleDetails ? (
            workflowParticipant ? (
              <p className="ai-debrief-contact-prompt">{contact.displayName}</p>
            ) : (
              <p className="ai-debrief-contact-prompt">{debriefContactCardPrompt(contact)}</p>
            )
          ) : null}

          {workflowParticipant ? (
            <>
              {possibleRole ? (
                <p className="ai-debrief-workflow-participant-role">
                  <span className="ai-debrief-workflow-participant-label">Possible Role:</span> {possibleRole}
                </p>
              ) : null}
              {contact.sourceQuote ? (
                <div className="ai-debrief-workflow-participant-evidence">
                  <span className="ai-debrief-workflow-participant-label">Evidence:</span>
                  <blockquote className="ai-debrief-quote">&ldquo;{contact.sourceQuote}&rdquo;</blockquote>
                </div>
              ) : null}
              <p className="ai-debrief-workflow-participant-status">
                <span className="ai-debrief-workflow-participant-label">Next step:</span>{" "}
                {DEBRIEF_WORKFLOW_PARTICIPANT_STATUS}
              </p>
              <DebriefPathwayImpactNote line={pathwayImpactLine} />
            </>
          ) : (
            <>
              <p className="ai-debrief-contact-prompt">{debriefContactCardPrompt(contact)}</p>
              {contact.sourceQuote ? (
                <blockquote className="ai-debrief-quote">&ldquo;{contact.sourceQuote}&rdquo;</blockquote>
              ) : null}
              <p className="ai-debrief-contact-meta">
                {contact.contactTypeLabel} · {contact.ownershipLabel} · {contact.workflowLabel}
              </p>
              {contact.contactDetailsMissing && contact.disposition === "pending" ? (
                <span className="ai-debrief-contact-missing-badge">{SUPPORT_CONTACT_INFO_NEEDED_LABEL}</span>
              ) : null}
              <DebriefPathwayImpactNote line={pathwayImpactLine} />
            </>
          )}

          {contact.disposition === "pending" ? (
            <div className="ai-debrief-contact-actions">
              <button
                type="button"
                className="ai-debrief-btn--primary"
                disabled={disabled}
                onClick={() => setDisposition("add_details")}
              >
                {workflowParticipant ? DEBRIEF_WORKFLOW_PARTICIPANT_CREATE : DEBRIEF_CONTACT_ADD_DETAILS}
              </button>
              <button type="button" disabled={disabled} onClick={() => setDisposition("link")}>
                {workflowParticipant ? DEBRIEF_WORKFLOW_PARTICIPANT_LINK : DEBRIEF_CONTACT_LINK_EXISTING}
              </button>
              <button type="button" className="ai-debrief-btn--ghost" disabled={disabled} onClick={() => setDisposition("skipped")}>
                {workflowParticipant ? DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE : DEBRIEF_CONTACT_SKIP}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showExpandedDetails && showDetailsForm ? (
        <div className="ai-debrief-contact-form">
          <div className="ai-debrief-contact-form-grid">
            <label>
              <span>{DEBRIEF_CONTACT_FORM_FIRST}</span>
              <input
                type="text"
                value={contact.firstName}
                disabled={disabled}
                onChange={(e) => patch({ firstName: e.target.value })}
              />
            </label>
            <label>
              <span>{DEBRIEF_CONTACT_FORM_LAST}</span>
              <input
                type="text"
                value={contact.lastName}
                disabled={disabled}
                onChange={(e) => patch({ lastName: e.target.value })}
              />
            </label>
            <label>
              <span>{DEBRIEF_CONTACT_FORM_PHONE}</span>
              <input
                type="tel"
                value={contact.phone}
                disabled={disabled}
                onChange={(e) => patch({ phone: e.target.value })}
              />
            </label>
            <label>
              <span>{DEBRIEF_CONTACT_FORM_EMAIL}</span>
              <input
                type="email"
                value={contact.email}
                disabled={disabled}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </label>
          </div>
          <label className="ai-debrief-contact-notes-field">
            <span>{DEBRIEF_CONTACT_FORM_NOTES}</span>
            <textarea
              rows={2}
              value={contact.notes}
              disabled={disabled}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </label>
          {contact.contactDetailsMissing ? (
            <p className="ai-debrief-contact-form-hint">
              Add a phone or email to save {contact.firstName || contact.displayName} as a support contact, or link an
              existing contact instead.
            </p>
          ) : null}
          <button type="button" className="ai-debrief-btn--ghost" disabled={disabled} onClick={() => setDisposition("pending")}>
            Back
          </button>
        </div>
      ) : null}

      {showExpandedDetails && showLinkSearch ? (
        <div className="ai-debrief-contact-link">
          <label>
            <span>{DEBRIEF_CONTACT_LINK_SEARCH}</span>
            <input
              type="search"
              value={searchQ}
              disabled={disabled}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search by name…"
            />
          </label>
          {searching ? <p className="ai-debrief-contact-link-status">Searching…</p> : null}
          {contact.linkedContactId && contact.linkedContactName ? (
            <p className="ai-debrief-contact-linked">
              Linked: <strong>{contact.linkedContactName}</strong>
            </p>
          ) : null}
          <ul className="ai-debrief-contact-link-hits">
            {searchHits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    patch({
                      linkedContactId: hit.id,
                      linkedContactName: hit.label,
                      disposition: "link",
                    })
                  }
                >
                  <span>{hit.label}</span>
                  {hit.subtitle ? <span className="ai-debrief-contact-link-sub">{hit.subtitle}</span> : null}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="ai-debrief-btn--ghost" disabled={disabled} onClick={() => setDisposition("pending")}>
            Back
          </button>
        </div>
      ) : null}
    </Shell>
  );
}
