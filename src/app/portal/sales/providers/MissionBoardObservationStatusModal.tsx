"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import {
  MISSION_BOARD_OBSERVATION_STATUS_LABELS,
  OBSERVATION_APPROVAL_EDIT_CHOICES,
  missionBoardObservationStatusLabel,
  type ObservationStatusChoice,
} from "@/lib/surgical-sales/observationStatus";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10045 };
const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(440px, calc(100vw - 24px))",
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  marginBottom: 14,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

const radioGroupStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const radioLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const statusBadgeStyle = (status: ObservationStatusChoice): React.CSSProperties => ({
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  background:
    status === "permission_confirmed" || status === "observation_scheduled" || status === "observation_completed"
      ? "color-mix(in srgb, #0d9488 14%, var(--surface))"
      : status === "denied" || status === "not_interested"
        ? "color-mix(in srgb, #dc2626 12%, var(--surface))"
        : status === "permission_not_yet_confirmed" || status === "interested"
          ? "color-mix(in srgb, #d97706 12%, var(--surface))"
          : "color-mix(in srgb, var(--foreground) 6%, var(--surface))",
  color: "var(--foreground)",
  border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
});

export function MissionBoardObservationStatusModal({
  open,
  busy,
  error,
  currentStatus,
  onClose,
  onSave,
}: {
  open: boolean;
  busy?: boolean;
  error?: string | null;
  currentStatus: ObservationStatusChoice;
  onClose: () => void;
  onSave: (status: ObservationStatusChoice) => void | Promise<void>;
}) {
  const [selectedStatus, setSelectedStatus] = React.useState<ObservationStatusChoice>(currentStatus);

  React.useEffect(() => {
    if (!open) return;
    setSelectedStatus(currentStatus);
  }, [open, currentStatus]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const statusChanged = selectedStatus !== currentStatus;

  return (
    <div style={backdropStyle} onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div
        style={panelStyle}
        role="dialog"
        aria-modal
        aria-labelledby="mission-board-observation-status-title"
        data-testid="mission-board-observation-status-modal"
      >
        <style dangerouslySetInnerHTML={{ __html: surgicalCaseModalActionsCss }} />
        <h2
          id="mission-board-observation-status-title"
          style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}
        >
          Update observation status
        </h2>

        <div style={fieldStyle}>
          <span style={labelStyle}>Current</span>
          <span style={statusBadgeStyle(currentStatus)} data-testid="observation-status-current">
            {missionBoardObservationStatusLabel(currentStatus)}
          </span>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Observation status</span>
          <div style={radioGroupStyle} role="radiogroup" aria-label="Observation status">
            {OBSERVATION_APPROVAL_EDIT_CHOICES.map((value) => (
              <label key={value} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="mission-board-observation-status"
                  value={value}
                  checked={selectedStatus === value}
                  disabled={busy}
                  onChange={() => setSelectedStatus(value)}
                />
                {MISSION_BOARD_OBSERVATION_STATUS_LABELS[value]}
              </label>
            ))}
          </div>
        </div>

        {error ? (
          <div role="alert" style={{ ...sc.alertError, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        ) : null}

        <div className="case-modal-actions">
          <button type="button" style={sc.btnGhost} disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            style={sc.btnPrimary}
            disabled={busy || !statusChanged}
            data-testid="mission-board-observation-status-save"
            onClick={() => void onSave(selectedStatus)}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
