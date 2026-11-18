"use client";

import React from "react";

export function PrepareTodayMatterSheet({
  open,
  title,
  label,
  initialValue,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  label: string;
  initialValue: string;
  busy?: boolean;
  onClose: () => void;
  onSave: (value: string) => void | Promise<void>;
}) {
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  if (!open) return null;

  return (
    <div
      className="pfm-today-sheet-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="pfm-today-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pfm-today-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pfm-today-sheet-head">
          <h2 id="pfm-today-sheet-title">{title}</h2>
          <button type="button" className="pfm-today-sheet-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <label className="pfm-today-sheet-field">
          <span>{label}</span>
          <textarea
            value={value}
            rows={4}
            disabled={busy}
            autoFocus
            placeholder="Edit for this visit…"
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
            onClick={() => void onSave(value.trim())}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}
