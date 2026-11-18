"use client";

import React from "react";
import { createPortal } from "react-dom";
import { RAPID_DISCOVERY_CAPTURE_SOURCE_LABEL } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import {
  buildProviderCredentialingDiscoveredIntelLines,
  drawerStatusFromWorkflowToken,
  persistProviderCredentialing,
  providerCredentialingFromContact,
  type CredentialingDrawerStatus,
} from "@/lib/surgical-sales/providerCredentialing";
import { providerQuickSignalCaptureCss } from "./providerQuickSignalCaptureCss";
import { userFacingError } from "@/lib/errors/userFacingError";

export const CREDENTIALING_DRAWER_STATUS_OPTIONS = [
  { value: "required", label: "Required" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
  { value: "cleared", label: "Complete" },
  { value: "not_required", label: "Not required" },
] as const;

export type { CredentialingDrawerStatus };

export function CredentialingStatusDrawer({
  open,
  providerId,
  contact,
  onClose,
  onSaved,
}: {
  open: boolean;
  providerId: string;
  contact: Record<string, unknown>;
  onClose: () => void;
  onSaved: (provider: Record<string, unknown>) => void | Promise<void>;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [status, setStatus] = React.useState<CredentialingDrawerStatus>("required");
  const [notes, setNotes] = React.useState("");
  const [owner, setOwner] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const credentialing = React.useMemo(
    () => providerCredentialingFromContact(contact),
    [contact],
  );
  const discoveredLines = React.useMemo(
    () => buildProviderCredentialingDiscoveredIntelLines(credentialing),
    [credentialing],
  );

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const token = String(contact.provider_observation_credentialing_needed ?? "").trim();
    const feasibility = String(contact.provider_observation_feasibility ?? "").trim().toLowerCase();
    const initial =
      token.trim() || feasibility === "credentialing_required"
        ? drawerStatusFromWorkflowToken(token || "required")
        : drawerStatusFromWorkflowToken("required");
    setStatus(initial);
    setNotes(credentialing.structured.renewalNotes);
    setOwner(credentialing.structured.credentialingContact);
    setTargetDate(credentialing.targetDate);
    setError(null);
  }, [open, contact, credentialing]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      const structured = {
        ...credentialing.structured,
        credentialingContact: owner.trim() || credentialing.structured.credentialingContact,
        renewalNotes: notes.trim() || credentialing.structured.renewalNotes,
      };

      const provider = await persistProviderCredentialing({
        providerId,
        structured,
        workflowStatus: status,
        notes,
        targetDate,
        sourceLabel: RAPID_DISCOVERY_CAPTURE_SOURCE_LABEL,
        mergeFromContact: contact,
      });
      await onSaved(provider);
      onClose();
    } catch (e: unknown) {
      setError(userFacingError(e, "Could not save credentialing status."));
    } finally {
      setBusy(false);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <style>{providerQuickSignalCaptureCss}</style>
      <div
        className="provider-intel-quick-signal-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="provider-intel-quick-signal-drawer provider-intel-quick-signal-drawer--mapping"
          role="dialog"
          aria-modal="true"
          aria-labelledby="credentialing-drawer-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="provider-intel-quick-signal-head">
            <div className="provider-intel-quick-signal-head-row">
              <div>
                <h2 id="credentialing-drawer-title" className="provider-intel-quick-signal-title">
                  Credentialing workflow
                </h2>
                <p className="provider-intel-quick-signal-kicker">
                  Track execution — discovery intel stays linked to this workflow
                </p>
              </div>
              <button
                type="button"
                className="provider-intel-quick-signal-close"
                aria-label="Close"
                onClick={onClose}
              >
                ×
              </button>
            </div>
          </header>

          <div className="provider-intel-quick-signal-body">
            <section className="dmq-picks" aria-labelledby="cred-status-label">
              <h3 id="cred-status-label" className="dmq-section-title">
                Current status
              </h3>
              <div className="cred-drawer-status-grid" role="radiogroup" aria-label="Credentialing status">
                {CREDENTIALING_DRAWER_STATUS_OPTIONS.map((opt) => (
                  <label key={opt.value} className="cred-drawer-status-option">
                    <input
                      type="radio"
                      name="credentialing_status"
                      value={opt.value}
                      checked={status === opt.value}
                      disabled={busy}
                      onChange={() => setStatus(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {discoveredLines.length > 0 ? (
              <section className="cred-drawer-discovered" aria-labelledby="cred-discovered-label">
                <h3 id="cred-discovered-label" className="dmq-section-title">
                  Discovered workflow intelligence
                </h3>
                <ul className="cred-drawer-discovered-list">
                  {discoveredLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {credentialing.discoveredSourceLabel ? (
                  <p className="cred-drawer-discovered-source">
                    Last updated from {credentialing.discoveredSourceLabel}
                  </p>
                ) : null}
              </section>
            ) : null}

            <section className="dmq-picks" aria-labelledby="cred-ops-label">
              <h3 id="cred-ops-label" className="dmq-section-title">
                Operational tracking
              </h3>

              <label className="dmq-section-title" htmlFor="cred-owner">
                Assigned owner / contact
              </label>
              <input
                id="cred-owner"
                className="cred-drawer-input"
                value={owner}
                disabled={busy}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Credentialing coordinator or vendor contact"
              />

              <label className="dmq-section-title" htmlFor="cred-target-date">
                Target completion (optional)
              </label>
              <input
                id="cred-target-date"
                type="date"
                className="cred-drawer-input"
                value={targetDate}
                disabled={busy}
                onChange={(e) => setTargetDate(e.target.value)}
              />

              <label className="dmq-section-title" htmlFor="cred-notes">
                Notes
              </label>
              <textarea
                id="cred-notes"
                className="cred-drawer-textarea"
                rows={4}
                value={notes}
                disabled={busy}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Submission steps, documents, renewal cadence…"
              />
            </section>

            {error ? (
              <p className="provider-intel-quick-signal-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <footer className="provider-intel-quick-signal-foot">
            <button
              type="button"
              className="provider-intel-quick-signal-cancel"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="provider-intel-quick-signal-save"
              disabled={busy}
              onClick={() => void handleSave()}
            >
              {busy ? "Saving…" : "Save credentialing"}
            </button>
          </footer>
        </div>
      </div>
    </>,
    document.body,
  );
}
