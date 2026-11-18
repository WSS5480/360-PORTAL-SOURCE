"use client";

import React from "react";

/** Lightweight bottom sheet for answer / custom question — no full editor workflow. */
export function PrepareTacticalAskQuickSheet({
  open,
  title,
  label,
  placeholder,
  initialValue,
  busy,
  primaryLabel = "Save",
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  busy?: boolean;
  primaryLabel?: string;
  onClose: () => void;
  onSave: (value: string) => void | Promise<void>;
}) {
  const [value, setValue] = React.useState(initialValue ?? "");

  React.useEffect(() => {
    if (open) setValue(initialValue ?? "");
  }, [open, initialValue]);

  async function handleSave() {
    try {
      await onSave(value.trim());
    } catch (e: unknown) {
      console.error("PrepareTacticalAskQuickSheet save failed", e);
    }
  }

  if (!open) return null;

  return (
    <div
      className="pfm-today-sheet-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="pfm-today-sheet pfm-ask-quick-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pfm-ask-quick-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pfm-today-sheet-head">
          <h2 id="pfm-ask-quick-sheet-title">{title}</h2>
          <button type="button" className="pfm-today-sheet-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <label className="pfm-today-sheet-field">
          <span>{label}</span>
          <textarea
            value={value}
            rows={3}
            disabled={busy}
            autoFocus
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <footer className="pfm-today-sheet-actions">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => void handleSave()}
          >
            {busy ? "Saving…" : primaryLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
