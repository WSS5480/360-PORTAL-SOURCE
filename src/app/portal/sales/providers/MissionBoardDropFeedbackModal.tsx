"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import type { MissionBoardDropBlockerAction } from "@/lib/surgical-sales/missionBoardStageDrop";

export function MissionBoardDropFeedbackModal({
  open,
  title,
  message,
  actions,
  busy,
  onAction,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  actions: MissionBoardDropBlockerAction[];
  busy?: boolean;
  onAction: (action: MissionBoardDropBlockerAction) => void;
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
    <div
      style={{ ...sc.modalBackdrop, zIndex: 10042 }}
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        style={{ ...sc.modalPanel, maxWidth: "min(440px, calc(100vw - 24px))" }}
        role="dialog"
        aria-modal
        aria-labelledby="mission-board-drop-title"
        data-testid="mission-board-drop-modal"
      >
        <style dangerouslySetInnerHTML={{ __html: surgicalCaseModalActionsCss }} />
        <h2
          id="mission-board-drop-title"
          style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}
        >
          {title}
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.5, color: "var(--foreground)" }}>
          {message}
        </p>
        <div className="case-modal-actions">
          {actions.map((action) =>
            action.id === "cancel" ? (
              <button
                key={action.id}
                type="button"
                style={sc.btnGhost}
                disabled={busy}
                onClick={onClose}
              >
                {action.label}
              </button>
            ) : (
              <button
                key={action.id}
                type="button"
                style={sc.btnPrimary}
                disabled={busy}
                onClick={() => onAction(action)}
              >
                {action.label}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export function MissionBoardToast({
  message,
  detail,
  onDismiss,
}: {
  message: string;
  detail?: string | null;
  onDismiss: () => void;
}) {
  React.useEffect(() => {
    const id = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(id);
  }, [onDismiss]);

  return (
    <div className="provider-mission-board-toast" role="status" data-testid="mission-board-toast">
      <p className="provider-mission-board-toast-title">{message}</p>
      {detail ? <p className="provider-mission-board-toast-detail">{detail}</p> : null}
      <button type="button" className="provider-mission-board-toast-dismiss" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
