"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import { logMissionBoardOutcomeUpdate } from "@/lib/surgical-sales/missionBoardCommitmentOutcomesClient";
import {
  PROVIDER_OUTCOME_UPDATE_TYPE_LABELS,
  PROVIDER_OUTCOME_UPDATE_TYPES,
  type ProviderOutcomeUpdateType,
} from "@/lib/surgical-sales/providerCommitmentOutcomes";
import { missionBoardEvaluationPathCss } from "./missionBoardEvaluationPathCss";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10053 };
const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(480px, calc(100vw - 24px))",
};

export function MissionBoardOutcomeUpdateModal({
  provider,
  busy,
  onClose,
  onSaved,
}: {
  provider: ProviderDirectoryRow;
  busy?: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}) {
  const providerName = providerDisplayName(provider);
  const today = new Date().toISOString().slice(0, 10);
  const [updateType, setUpdateType] = React.useState<ProviderOutcomeUpdateType>("outcome");
  const [recordedDate, setRecordedDate] = React.useState(today);
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const disabled = Boolean(busy) || saving;

  async function handleSave() {
    if (disabled) return;
    if (!notes.trim()) {
      setError("Notes are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await logMissionBoardOutcomeUpdate({
        providerId: provider.id,
        updateType,
        notes: notes.trim(),
        recordedDate: recordedDate.trim() || today,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${surgicalCaseModalActionsCss}\n${missionBoardEvaluationPathCss}` }} />
      <div
        style={backdropStyle}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !disabled) onClose();
        }}
      >
        <div
          className="mission-board-evaluation-path-modal"
          style={panelStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-board-outcome-update-title"
          data-testid="mission-board-outcome-update-modal"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <header className="mb-eval-path__head">
            <p className="mb-eval-path__kicker">{providerName}</p>
            <h2 id="mission-board-outcome-update-title" className="mb-eval-path__title">
              Log outcome update
            </h2>
          </header>

          <div className="mb-eval-path__field">
            <label className="mb-eval-path__field-label" htmlFor="mb-outcome-type">Update type</label>
            <select
              id="mb-outcome-type"
              className="mb-eval-path__field-input"
              value={updateType}
              disabled={disabled}
              onChange={(e) => setUpdateType(e.target.value as ProviderOutcomeUpdateType)}
            >
              {PROVIDER_OUTCOME_UPDATE_TYPES.map((type) => (
                <option key={type} value={type}>{PROVIDER_OUTCOME_UPDATE_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>

          <div className="mb-eval-path__field">
            <label className="mb-eval-path__field-label" htmlFor="mb-outcome-date">Date</label>
            <input
              id="mb-outcome-date"
              type="date"
              className="mb-eval-path__field-input"
              value={recordedDate}
              disabled={disabled}
              onChange={(e) => setRecordedDate(e.target.value)}
            />
          </div>

          <div className="mb-eval-path__field">
            <label className="mb-eval-path__field-label" htmlFor="mb-outcome-notes">Notes</label>
            <textarea
              id="mb-outcome-notes"
              className="mb-eval-path__field-input"
              rows={4}
              value={notes}
              disabled={disabled}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error ? <p className="mb-eval-path__error">{error}</p> : null}

          <div className="surgical-case-modal-actions">
            <button type="button" className="sc-btn sc-btn--ghost" disabled={disabled} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--primary"
              disabled={disabled}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Save update"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
