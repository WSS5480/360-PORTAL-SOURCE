"use client";

import React from "react";
import { createPortal } from "react-dom";
import type { CandidateContactIntelligence } from "@/lib/surgical-sales/candidateContactIntelligence";
import type { SchedulingContactOwnershipType } from "@/lib/surgical-sales/operationalSupportContact";
import {
  buildCandidateScopeOptions,
  candidateContactInitials,
} from "./candidateContactReviewHelpers";

function CandidateContactModalShell({
  eyebrow,
  title,
  titleId,
  busy,
  onClose,
  children,
  footer,
  variant = "accept",
}: {
  eyebrow: string;
  title: string;
  titleId: string;
  busy?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  variant?: "accept" | "edit";
}) {
  return createPortal(
    <div className="cas-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className={`cas-modal${variant === "edit" ? " cas-modal--edit" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="cas-modal__header">
          <div className="cas-modal__header-main">
            <span className="cas-modal__eyebrow">{eyebrow}</span>
            <h2 id={titleId} className="cas-modal__title">
              {title}
            </h2>
          </div>
          <button type="button" aria-label="Close" className="cas-modal__close" onClick={onClose} disabled={busy}>
            ×
          </button>
        </header>

        <div className="cas-modal__body">{children}</div>

        <footer className="cas-modal__footer">{footer}</footer>
      </div>
    </div>,
    document.body,
  );
}

function CandidateContactScopeFieldset({
  candidateId,
  scope,
  scopeOptions,
  busy,
  onScopeChange,
}: {
  candidateId: string;
  scope: SchedulingContactOwnershipType;
  scopeOptions: ReturnType<typeof buildCandidateScopeOptions>;
  busy?: boolean;
  onScopeChange: (scope: SchedulingContactOwnershipType) => void;
}) {
  return (
    <>
      <p className="cas-modal__group-label">Relationship scope</p>
      <div role="radiogroup" aria-label="Contact save scope" className="cas-modal__options">
        {scopeOptions.map((option) => (
          <label
            key={option.value}
            className={`cas-option${scope === option.value ? " cas-option--selected" : ""}`}
          >
            <input
              type="radio"
              className="cas-option__radio"
              name={`candidate-scope-${candidateId}`}
              value={option.value}
              checked={scope === option.value}
              disabled={busy}
              onChange={() => onScopeChange(option.value)}
            />
            <span className="cas-option__body">
              <span className="cas-option__title">{option.title}</span>
              <span className="cas-option__desc">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </>
  );
}

function CandidateContactPreviewCard({ candidate }: { candidate: CandidateContactIntelligence }) {
  return (
    <div className="cas-modal__contact-card">
      <span className="cas-modal__contact-avatar" aria-hidden>
        {candidateContactInitials(candidate.contact_name)}
      </span>
      <div className="cas-modal__contact-copy">
        <p className="cas-modal__contact-name">
          {candidate.contact_name}
          {candidate.contact_role ? (
            <span className="cas-modal__contact-role"> · {candidate.contact_role}</span>
          ) : null}
        </p>
        {candidate.source_quote ? (
          <p className="cas-modal__contact-quote">“{candidate.source_quote}”</p>
        ) : null}
      </div>
    </div>
  );
}

export function CandidateAcceptScopeModal({
  candidate,
  providerLabel,
  organizationName,
  hasOrganization,
  busy,
  onClose,
  onConfirm,
}: {
  candidate: CandidateContactIntelligence;
  providerLabel: string;
  organizationName?: string | null;
  hasOrganization: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (scope: SchedulingContactOwnershipType) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [scope, setScope] = React.useState<SchedulingContactOwnershipType>(
    hasOrganization ? "shared" : "provider",
  );

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    setScope(hasOrganization ? "shared" : "provider");
  }, [candidate.id, hasOrganization]);

  if (!mounted) return null;

  const scopeOptions = buildCandidateScopeOptions({ providerLabel, organizationName, hasOrganization });

  return (
    <CandidateContactModalShell
      eyebrow="Accept contact"
      title={`Save ${candidate.contact_name} where?`}
      titleId="candidate-accept-scope-title"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="cas-modal__btn cas-modal__btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="cas-modal__btn cas-modal__btn--primary"
            onClick={() => onConfirm(scope)}
            disabled={busy}
          >
            {busy ? "Saving…" : "Accept contact"}
          </button>
        </>
      }
    >
      <CandidateContactPreviewCard candidate={candidate} />
      <CandidateContactScopeFieldset
        candidateId={candidate.id}
        scope={scope}
        scopeOptions={scopeOptions}
        busy={busy}
        onScopeChange={setScope}
      />
    </CandidateContactModalShell>
  );
}

export function CandidateEditAcceptModal({
  candidate,
  providerLabel,
  organizationName,
  hasOrganization,
  busy,
  onClose,
  onConfirm,
}: {
  candidate: CandidateContactIntelligence;
  providerLabel: string;
  organizationName?: string | null;
  hasOrganization: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (input: {
    scope: SchedulingContactOwnershipType;
    contactName: string;
    contactRole: string;
    email: string;
    phone: string;
    notes: string;
  }) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [scope, setScope] = React.useState<SchedulingContactOwnershipType>(
    hasOrganization ? "shared" : "provider",
  );
  const [contactName, setContactName] = React.useState(candidate.contact_name);
  const [contactRole, setContactRole] = React.useState(candidate.contact_role ?? "");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    setScope(hasOrganization ? "shared" : "provider");
    setContactName(candidate.contact_name);
    setContactRole(candidate.contact_role ?? "");
    setEmail("");
    setPhone("");
    setNotes("");
  }, [candidate.id, candidate.contact_name, candidate.contact_role, hasOrganization]);

  if (!mounted) return null;

  const scopeOptions = buildCandidateScopeOptions({ providerLabel, organizationName, hasOrganization });
  const canSave = contactName.trim().length >= 2;

  return (
    <CandidateContactModalShell
      eyebrow="Edit & accept"
      title={`Add details for ${candidate.contact_name}`}
      titleId="candidate-edit-accept-title"
      busy={busy}
      onClose={onClose}
      variant="edit"
      footer={
        <>
          <button type="button" className="cas-modal__btn cas-modal__btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="cas-modal__btn cas-modal__btn--primary"
            onClick={() =>
              onConfirm({
                scope,
                contactName: contactName.trim(),
                contactRole: contactRole.trim(),
                email: email.trim(),
                phone: phone.trim(),
                notes: notes.trim(),
              })
            }
            disabled={busy || !canSave}
          >
            {busy ? "Saving…" : "Save & accept"}
          </button>
        </>
      }
    >
      {candidate.source_quote ? (
        <p className="cas-modal__source-note">“{candidate.source_quote}”</p>
      ) : null}

      <div className="cas-modal__fields cas-modal__fields--contact">
        <label className="cas-modal__field">
          <span className="cas-modal__field-label">Name</span>
          <input
            className="cas-modal__field-input"
            value={contactName}
            disabled={busy}
            autoComplete="name"
            onChange={(event) => setContactName(event.target.value)}
          />
        </label>
        <label className="cas-modal__field">
          <span className="cas-modal__field-label">Title / role</span>
          <input
            className="cas-modal__field-input"
            value={contactRole}
            disabled={busy}
            autoComplete="organization-title"
            placeholder="e.g. Scheduling Coordinator"
            onChange={(event) => setContactRole(event.target.value)}
          />
        </label>
        <div className="cas-modal__fields-row">
          <label className="cas-modal__field">
            <span className="cas-modal__field-label">Email</span>
            <input
              className="cas-modal__field-input"
              type="email"
              value={email}
              disabled={busy}
              autoComplete="email"
              placeholder="Optional"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="cas-modal__field">
            <span className="cas-modal__field-label">Phone</span>
            <input
              className="cas-modal__field-input"
              type="tel"
              value={phone}
              disabled={busy}
              autoComplete="tel"
              placeholder="Optional"
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
        </div>
        <label className="cas-modal__field">
          <span className="cas-modal__field-label">Notes</span>
          <textarea
            className="cas-modal__field-input cas-modal__field-textarea"
            value={notes}
            disabled={busy}
            rows={2}
            placeholder="How they help — optional"
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </div>

      <CandidateContactScopeFieldset
        candidateId={candidate.id}
        scope={scope}
        scopeOptions={scopeOptions}
        busy={busy}
        onScopeChange={setScope}
      />
    </CandidateContactModalShell>
  );
}
