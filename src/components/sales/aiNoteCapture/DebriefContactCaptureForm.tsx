"use client";

import React from "react";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  isWorkflowParticipantContact,
  type DebriefContactDisposition,
  type DebriefProposedContactItem,
} from "@/lib/surgical-sales/debriefDetectedContact";
import {
  DEBRIEF_CONTACT_ADD_DETAILS,
  DEBRIEF_CONTACT_LINK_EXISTING,
  DEBRIEF_CONTACT_SKIP,
  DEBRIEF_WORKFLOW_PARTICIPANT_CREATE,
  DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE,
  DEBRIEF_WORKFLOW_PARTICIPANT_LINK,
  DEBRIEF_CONTACT_FORM_EMAIL,
  DEBRIEF_CONTACT_FORM_FIRST,
  DEBRIEF_CONTACT_FORM_LAST,
  DEBRIEF_CONTACT_FORM_NOTES,
  DEBRIEF_CONTACT_FORM_PHONE,
  DEBRIEF_CONTACT_LINK_SEARCH,
} from "@/lib/surgical-sales/debriefApprovalUx";

type ContactSearchHit = {
  id: string;
  label: string;
  subtitle: string | null;
};

export function DebriefContactCaptureForm({
  contact,
  organizationId,
  disabled,
  onChange,
}: {
  contact: DebriefProposedContactItem;
  organizationId: string | null;
  disabled?: boolean;
  onChange: (next: DebriefProposedContactItem) => void;
}) {
  const [searchQ, setSearchQ] = React.useState("");
  const [searchHits, setSearchHits] = React.useState<ContactSearchHit[]>([]);
  const [searching, setSearching] = React.useState(false);

  const showDetailsForm = contact.disposition === "add_details";
  const showLinkSearch = contact.disposition === "link";
  const workflowParticipant = isWorkflowParticipantContact(contact);

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

  if (contact.disposition === "skipped") {
    return (
      <div className="ai-debrief-contact-capture">
        <button type="button" className="ai-debrief-btn--ghost" disabled={disabled} onClick={() => setDisposition("pending")}>
          Undo skip
        </button>
      </div>
    );
  }

  return (
    <div className="ai-debrief-contact-capture">
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

      {showDetailsForm ? (
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
          <button type="button" className="ai-debrief-btn--ghost" disabled={disabled} onClick={() => setDisposition("pending")}>
            Back
          </button>
        </div>
      ) : null}

      {showLinkSearch ? (
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
    </div>
  );
}
