"use client";

import React from "react";
import { sc } from "@/components/sales/salesCommandUi";

export function PathwayStageUnlockHintModal({
  open,
  title,
  message,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{ ...sc.modalBackdrop, zIndex: 10040 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{ ...sc.modalPanel, maxWidth: "min(420px, calc(100vw - 24px))" }}
        role="dialog"
        aria-modal
        aria-labelledby="pathway-unlock-title"
        data-testid="pathway-unlock-hint-modal"
      >
        <h2
          id="pathway-unlock-title"
          style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}
        >
          {title}
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.5, color: "var(--foreground)" }}>
          {message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" style={sc.btnPrimary} onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
