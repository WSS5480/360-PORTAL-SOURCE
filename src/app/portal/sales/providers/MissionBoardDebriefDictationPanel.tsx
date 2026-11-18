"use client";

import React from "react";
import {
  MISSION_BOARD_DEBRIEF_DICTATION_PLACEHOLDER,
  MISSION_BOARD_DEBRIEF_DICTATION_SAVE_LABEL,
  MISSION_BOARD_DEBRIEF_DICTATION_SKIP_LABEL,
  MISSION_BOARD_DEBRIEF_DICTATION_SUBTITLE,
  MISSION_BOARD_DEBRIEF_DICTATION_TITLE,
} from "@/lib/surgical-sales/missionBoardDebriefComplete";
import type { MissionBoardDebriefDictationReport } from "@/lib/surgical-sales/missionBoardDebriefDictationReport";

export function MissionBoardDebriefDictationPanel({
  disabled,
  saving,
  error,
  narrative,
  report,
  onChange,
  onSubmit,
  onSkip,
}: {
  disabled?: boolean;
  saving?: boolean;
  error?: string | null;
  narrative: string;
  report?: MissionBoardDebriefDictationReport | null;
  onChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  onSkip: () => void;
}) {
  const controlsDisabled = Boolean(disabled) || Boolean(saving);

  return (
    <div className="mb-debrief-dictation" data-testid="mission-board-debrief-dictation-panel">
      <p className="mb-debrief-launcher__objective">{MISSION_BOARD_DEBRIEF_DICTATION_SUBTITLE}</p>

      <section className="mb-debrief-launcher__section">
        <h3 className="mb-debrief-launcher__label">{MISSION_BOARD_DEBRIEF_DICTATION_TITLE}</h3>
        <textarea
          className="mb-debrief-complete__notes"
          rows={4}
          maxLength={8000}
          placeholder={MISSION_BOARD_DEBRIEF_DICTATION_PLACEHOLDER}
          value={narrative}
          disabled={controlsDisabled}
          data-testid="mission-board-debrief-dictation-input"
          onChange={(event) => onChange(event.target.value)}
        />
      </section>

      {report ? (
        <section className="mb-debrief-dictation__report" data-testid="mission-board-debrief-dictation-report">
          <h3 className="mb-debrief-launcher__label">Extracted intelligence</h3>
          <dl className="mb-debrief-dictation__report-grid">
            {Object.entries(report.fields).map(([key, value]) => (
              <div key={key} className="mb-debrief-dictation__report-row">
                <dt>{key.replace(/_/g, " ")}</dt>
                <dd>{value ?? "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="mb-debrief-dictation__stage">
            Provider stage: {report.pathwayStageBefore} → {report.pathwayStageAfter}
            {report.providerStageChanged ? " (changed)" : " (unchanged)"}
          </p>
        </section>
      ) : null}

      {error ? (
        <p className="mb-debrief-launcher__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mb-debrief-complete__actions">
        <button
          type="button"
          className="mb-debrief-launcher__primary"
          disabled={controlsDisabled || narrative.trim().length < 8}
          data-testid="mission-board-debrief-dictation-save"
          onClick={() => void onSubmit()}
        >
          {saving ? "Saving…" : MISSION_BOARD_DEBRIEF_DICTATION_SAVE_LABEL}
        </button>
        <button
          type="button"
          className="mb-debrief-launcher__cancel"
          disabled={Boolean(saving)}
          data-testid="mission-board-debrief-dictation-skip"
          onClick={onSkip}
        >
          {MISSION_BOARD_DEBRIEF_DICTATION_SKIP_LABEL}
        </button>
      </div>
    </div>
  );
}
