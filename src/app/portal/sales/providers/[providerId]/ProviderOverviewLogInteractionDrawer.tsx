"use client";

import React from "react";
import { createPortal } from "react-dom";
import { PROVIDER_PROFILE_LOG_ACTIVITY_UI } from "@/lib/surgical-sales/providerProfileIntelligenceCaptureCopy";
import { providerQuickSignalCaptureCss } from "./providerQuickSignalCaptureCss";
import { userFacingError } from "@/lib/errors/userFacingError";

export function ProviderOverviewLogInteractionDrawer({
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
  onSaved: () => void | Promise<void>;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    setNote("");
    setError(null);
  }, [open]);

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
    const line = note.trim();
    if (!line || busy) return;
    setBusy(true);
    setError(null);
    try {
      const existing = String(contact.access_notes ?? "").trim();
      const stamp = `[${new Date().toLocaleString()}] ${line}`;
      const next = existing ? `${existing}\n${stamp}` : stamp;
      const res = await fetch(`/api/portal/sales/surgical-contacts/${encodeURIComponent(providerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_notes: next }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "");
      await onSaved();
      onClose();
    } catch (e: unknown) {
      setError(userFacingError(e, "Could not save interaction."));
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
          className="provider-intel-quick-signal-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pov-log-interaction-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="provider-intel-quick-signal-head">
            <div className="provider-intel-quick-signal-head-row">
              <h2 id="pov-log-interaction-title" className="provider-intel-quick-signal-title">
                {PROVIDER_PROFILE_LOG_ACTIVITY_UI.title}
              </h2>
              <button
                type="button"
                className="provider-intel-quick-signal-close"
                aria-label="Close"
                onClick={onClose}
              >
                ×
              </button>
            </div>
            <p className="provider-intel-quick-signal-kicker">
              {PROVIDER_PROFILE_LOG_ACTIVITY_UI.kicker}
            </p>
          </header>

          <div className="provider-intel-quick-signal-body">
            <label className="provider-intel-quick-signal-field-label" htmlFor="pov-log-interaction-note">
              {PROVIDER_PROFILE_LOG_ACTIVITY_UI.fieldLabel}
            </label>
            <textarea
              id="pov-log-interaction-note"
              className="provider-intel-notes-input provider-intel-notes-input--rapid"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={PROVIDER_PROFILE_LOG_ACTIVITY_UI.placeholder}
              disabled={busy}
              autoFocus
            />
            {error ? (
              <p className="provider-intel-quick-signal-helper" style={{ color: "#b91c1c" }}>
                {error}
              </p>
            ) : null}
          </div>

          <footer className="provider-intel-quick-signal-foot">
            <button
              type="button"
              className="provider-intel-quick-signal-cancel"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="provider-intel-quick-signal-save"
              onClick={() => void handleSave()}
              disabled={busy || !note.trim()}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </footer>
        </div>
      </div>
    </>,
    document.body,
  );
}
