"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import type { ProviderMissionBoardObservationCasePreview } from "@/lib/surgical-sales/missionBoardNextObservationCase";
import { rescheduleMissionBoardObservationCase } from "@/lib/surgical-sales/missionBoardObservationCaseActions";
import { userFacingError } from "@/lib/errors/userFacingError";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10047 };
const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(420px, calc(100vw - 24px))",
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid color-mix(in srgb, var(--foreground) 12%, var(--border))",
  fontSize: 14,
  fontFamily: "inherit",
  background: "var(--surface)",
  color: "var(--foreground)",
};

function initialDate(observation: ProviderMissionBoardObservationCasePreview): string {
  return observation.caseDate ?? new Date().toISOString().slice(0, 10);
}

function initialTime(observation: ProviderMissionBoardObservationCasePreview): string {
  return observation.caseTime ?? "";
}

export function MissionBoardRescheduleObservationModal({
  observation,
  busy,
  error,
  onClose,
  onSave,
}: {
  observation: ProviderMissionBoardObservationCasePreview;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}) {
  const [caseDate, setCaseDate] = React.useState(initialDate(observation));
  const [caseTime, setCaseTime] = React.useState(initialTime(observation));
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setCaseDate(initialDate(observation));
    setCaseTime(initialTime(observation));
    setLocalError(null);
  }, [observation.caseId]);

  async function handleSave() {
    if (busy || saving) return;
    if (!caseDate.trim()) {
      setLocalError("Date is required.");
      return;
    }

    setSaving(true);
    setLocalError(null);
    try {
      await rescheduleMissionBoardObservationCase({
        caseId: observation.caseId,
        caseDate: caseDate.trim(),
        caseTime: caseTime.trim() || null,
      });
      await onSave();
    } catch (err) {
      setLocalError(userFacingError(err, "Could not reschedule observation."));
    } finally {
      setSaving(false);
    }
  }

  const displayError = localError || error;
  const isBusy = busy || saving;

  return (
    <div
      style={backdropStyle}
      onMouseDown={(e) => e.target === e.currentTarget && !isBusy && onClose()}
    >
      <div
        style={panelStyle}
        role="dialog"
        aria-modal
        aria-labelledby="mission-board-reschedule-observation-title"
        data-testid="mission-board-reschedule-observation-modal"
      >
        <style dangerouslySetInnerHTML={{ __html: surgicalCaseModalActionsCss }} />
        <h2
          id="mission-board-reschedule-observation-title"
          style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}
        >
          Reschedule observation
        </h2>

        {observation.procedureLabel ? (
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--muted)" }}>
            {observation.procedureLabel}
          </p>
        ) : null}

        <label style={fieldStyle} htmlFor="mission-board-reschedule-date">
          <span style={labelStyle}>Date</span>
          <input
            id="mission-board-reschedule-date"
            type="date"
            style={inputStyle}
            value={caseDate}
            onChange={(e) => setCaseDate(e.target.value)}
            disabled={isBusy}
            required
          />
        </label>

        <label style={fieldStyle} htmlFor="mission-board-reschedule-time">
          <span style={labelStyle}>Time</span>
          <input
            id="mission-board-reschedule-time"
            type="time"
            style={inputStyle}
            value={caseTime}
            onChange={(e) => setCaseTime(e.target.value)}
            disabled={isBusy}
          />
        </label>

        {displayError ? (
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#b91c1c" }}>{displayError}</p>
        ) : null}

        <div className="case-modal-actions">
          <button type="button" style={sc.btnGhost} disabled={isBusy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" style={sc.btnPrimary} disabled={isBusy} onClick={() => void handleSave()}>
            {isBusy ? "Saving…" : "Save new date"}
          </button>
        </div>
      </div>
    </div>
  );
}
