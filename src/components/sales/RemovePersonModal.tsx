"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import {
  PROVIDER_REMOVE_SCOPE_COPY,
  type ProviderRemoveScope,
} from "@/lib/surgical-sales/providerRemoveScope";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10045 };
const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(520px, calc(100vw - 24px))",
  maxHeight: "min(88dvh, 720px)",
};

const optionStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "18px minmax(0, 1fr)",
  gap: 10,
  alignItems: "start",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  cursor: "pointer",
  textAlign: "left",
};

export default function RemovePersonModal({
  open,
  personName,
  isProvider,
  hardDeleteAllowed,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  personName: string;
  isProvider: boolean;
  hardDeleteAllowed?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: (scope: ProviderRemoveScope) => void | Promise<void>;
  onClose: () => void;
}) {
  const [scope, setScope] = React.useState<ProviderRemoveScope>("everywhere");

  React.useEffect(() => {
    if (open) setScope("everywhere");
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const scopes: ProviderRemoveScope[] = isProvider
    ? hardDeleteAllowed
      ? ["everywhere", "keep_as_contact", "delete"]
      : ["everywhere", "keep_as_contact"]
    : hardDeleteAllowed
      ? ["everywhere", "delete"]
      : ["everywhere"];

  const confirmLabel =
    scope === "delete" ? "Delete permanently" : scope === "keep_as_contact" ? "Keep as contact" : "Remove everywhere";

  return (
    <div style={backdropStyle} onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div style={panelStyle} role="dialog" aria-modal aria-labelledby="remove-person-title">
        <style dangerouslySetInnerHTML={{ __html: surgicalCaseModalActionsCss }} />
        <h2 id="remove-person-title" style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}>
          Remove {personName}?
        </h2>
        <p style={{ ...sc.panelDesc, marginBottom: 14 }}>
          {scopes.length > 1
            ? "Choose whether they should disappear from every list, or stay in some places. Existing cases and history stay on file unless you delete permanently."
            : "They will be taken off Contacts and organization people lists. Existing cases and history stay on file."}
        </p>
        <div style={{ display: "grid", gap: 8, marginBottom: error ? 12 : 20 }}>
          {scopes.map((value) => {
            const copy = PROVIDER_REMOVE_SCOPE_COPY[value];
            const selected = scope === value;
            return (
              <label
                key={value}
                style={{
                  ...optionStyle,
                  borderColor: selected ? "var(--brand-600)" : "var(--border)",
                  boxShadow: selected ? "0 0 0 1px color-mix(in srgb, var(--brand-600) 35%, transparent)" : "none",
                }}
              >
                <input
                  type="radio"
                  name="remove-person-scope"
                  value={value}
                  checked={selected}
                  disabled={busy}
                  onChange={() => setScope(value)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong style={{ display: "block", fontSize: 14 }}>{copy.label}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.45 }}>{copy.description}</span>
                </span>
              </label>
            );
          })}
        </div>
        {error ? (
          <div role="alert" style={{ ...sc.alertError, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        ) : null}
        <div className="case-modal-actions">
          <button type="button" style={sc.btnGhost} disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            style={scope === "keep_as_contact" ? sc.btnPrimary : sc.btnDangerOutline}
            disabled={busy}
            onClick={() => void onConfirm(scope)}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
