"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10045 };
const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(480px, calc(100vw - 24px))",
  maxHeight: "min(88dvh, 640px)",
};

export default function SalesCrmConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  danger,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div style={backdropStyle} onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div style={panelStyle} role="dialog" aria-modal aria-labelledby="crm-confirm-title">
        <style dangerouslySetInnerHTML={{ __html: surgicalCaseModalActionsCss }} />
        <h2 id="crm-confirm-title" style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}>
          {title}
        </h2>
        <p style={{ ...sc.panelDesc, marginBottom: error ? 12 : 20, whiteSpace: "pre-wrap" }}>{message}</p>
        {error ? (
          <div role="alert" style={{ ...sc.alertError, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        ) : null}
        <div className="case-modal-actions">
          <button type="button" style={sc.btnGhost} disabled={busy} onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            style={danger ? sc.btnDangerOutline : sc.btnPrimary}
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
