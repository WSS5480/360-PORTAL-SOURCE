"use client";

import React from "react";
import { isVoiceCaptureAvailable, salesDictationOptions, useSpeechDictation } from "@/hooks/useSpeechDictation";
import {
  LOG_UPDATE_DICTATION_CAPTURED,
  LOG_UPDATE_VOICE_IDLE,
  LOG_UPDATE_VOICE_LISTENING,
  LOG_UPDATE_VOICE_PAUSE,
  LOG_UPDATE_VOICE_PAUSED,
  LOG_UPDATE_VOICE_RESUME,
  LOG_UPDATE_VOICE_START,
  LOG_UPDATE_VOICE_STOP,
  LOG_UPDATE_VOICE_TRANSCRIBING,
  LOG_UPDATE_VOICE_UNAVAILABLE,
} from "@/lib/surgical-sales/logUpdateUx";
import {
  MISSION_BOARD_DEBRIEF_DICTATION_NOTES_LABEL,
  MISSION_BOARD_DEBRIEF_DICTATION_NOTES_PLACEHOLDER,
  MISSION_BOARD_DEBRIEF_NEXT_STEP_PLACEHOLDER,
  MISSION_BOARD_DEBRIEF_NEXT_STEP_SECTION,
  MISSION_BOARD_DEBRIEF_OPPORTUNITY_LABELS,
  MISSION_BOARD_DEBRIEF_COMPLETE_OPPORTUNITY_SECTION,
  MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_LABELS,
  MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_SECTION,
  MISSION_BOARD_DEBRIEF_COMPLETE_PATH_SECTION,
  MISSION_BOARD_DEBRIEF_DICTATE_LABEL,
  MISSION_BOARD_DEBRIEF_LOG_OUTCOME_LABEL,
  MISSION_BOARD_DEBRIEF_SAVE_COMPLETE_LABEL,
  MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_IDS,
  MISSION_BOARD_DEBRIEF_OPPORTUNITY_RESULTS,
  type MissionBoardDebriefCompleteOpportunityResult,
  type MissionBoardDebriefCompleteOutcomeId,
} from "@/lib/surgical-sales/missionBoardDebriefComplete";
import { MISSION_BOARD_EVALUATION_PATH_OPTIONS } from "@/lib/surgical-sales/missionBoardEvaluationPathUx";
import type { SalesPathwayEvaluationActivity } from "@/lib/surgical-sales/salesPathwayCanonical";

export type MissionBoardDebriefCompleteFormState = {
  dictation: string;
  outcomeId: MissionBoardDebriefCompleteOutcomeId;
  opportunityResult: MissionBoardDebriefCompleteOpportunityResult;
  evaluationPath: SalesPathwayEvaluationActivity | "";
  nextStep: string;
};

export function MissionBoardDebriefCompletePanel({
  disabled,
  saving,
  error,
  form,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = MISSION_BOARD_DEBRIEF_SAVE_COMPLETE_LABEL,
  cancelLabel = "Back",
  showDictation = true,
  requireDictation = false,
}: {
  disabled?: boolean;
  saving?: boolean;
  error?: string | null;
  form: MissionBoardDebriefCompleteFormState;
  onChange: (next: MissionBoardDebriefCompleteFormState) => void;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  showDictation?: boolean;
  requireDictation?: boolean;
}) {
  const showEvaluationPath = form.opportunityResult === "confirmed";
  const controlsDisabled = Boolean(disabled) || Boolean(saving);
  const submitBlockedReason =
    showEvaluationPath && !form.evaluationPath
      ? "Select an evaluation path when opportunity is confirmed."
      : requireDictation && form.dictation.trim().length < 8
        ? "Add debrief notes before completing."
        : null;
  const [dictationCaptured, setDictationCaptured] = React.useState(false);
  const formRef = React.useRef(form);
  formRef.current = form;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const voiceAvailable = isVoiceCaptureAvailable();
  const dictation = useSpeechDictation(
    (nextDictation) => onChangeRef.current({ ...formRef.current, dictation: nextDictation }),
    salesDictationOptions({ onDictationCaptured: () => setDictationCaptured(true) }),
  );

  const micLabel = dictation.transcribing
    ? LOG_UPDATE_VOICE_TRANSCRIBING
    : dictation.dictating
      ? LOG_UPDATE_VOICE_STOP
      : dictation.dictationPaused
        ? LOG_UPDATE_VOICE_RESUME
        : LOG_UPDATE_VOICE_START;

  const voiceStatus = dictation.transcribing
    ? LOG_UPDATE_VOICE_TRANSCRIBING
    : dictation.dictating
      ? LOG_UPDATE_VOICE_LISTENING
      : dictation.dictationPaused
        ? LOG_UPDATE_VOICE_PAUSED
        : LOG_UPDATE_VOICE_IDLE;

  const voiceDisabled = controlsDisabled || dictation.transcribing;

  function handleDictateClick() {
    if (voiceDisabled) return;
    if (dictation.dictating) {
      dictation.stopDictation();
      return;
    }
    if (dictation.dictationPaused) {
      dictation.resumeDictation(form.dictation);
      return;
    }
    dictation.startDictation(form.dictation);
  }

  return (
    <div className="mb-debrief-complete" data-testid="mission-board-debrief-complete-panel">
      {showDictation ? (
        <section className="mb-debrief-launcher__section">
          <h3 className="mb-debrief-launcher__label">{MISSION_BOARD_DEBRIEF_DICTATION_NOTES_LABEL}</h3>
          <div className="mb-debrief-complete__voice">
            <button
              type="button"
              className={`mb-debrief-complete__dictate${dictation.dictating ? " mb-debrief-complete__dictate--active" : ""}`}
              disabled={voiceDisabled}
              data-testid="mission-board-debrief-dictate"
              aria-label={micLabel}
              onClick={handleDictateClick}
            >
              🎤 {MISSION_BOARD_DEBRIEF_DICTATE_LABEL}
            </button>
            <div className="mb-debrief-complete__voice-meta">
              <span className="mb-debrief-complete__voice-status">{voiceStatus}</span>
              {!voiceAvailable ? (
                <span className="mb-debrief-complete__voice-hint">{LOG_UPDATE_VOICE_UNAVAILABLE}</span>
              ) : null}
              {dictationCaptured ? (
                <span className="mb-debrief-complete__voice-captured">{LOG_UPDATE_DICTATION_CAPTURED}</span>
              ) : null}
              {dictation.dictationError ? (
                <span className="mb-debrief-complete__voice-error" role="alert">
                  {dictation.dictationError}
                </span>
              ) : null}
            </div>
            {dictation.dictating ? (
              <button
                type="button"
                className="mb-debrief-complete__voice-pause"
                disabled={controlsDisabled}
                data-testid="mission-board-debrief-dictate-pause"
                onClick={() => dictation.pauseDictation(form.dictation)}
              >
                {LOG_UPDATE_VOICE_PAUSE}
              </button>
            ) : null}
          </div>
          <textarea
            className="mb-debrief-complete__notes"
            rows={4}
            maxLength={8000}
            placeholder={MISSION_BOARD_DEBRIEF_DICTATION_NOTES_PLACEHOLDER}
            value={form.dictation}
            disabled={controlsDisabled}
            data-testid="mission-board-debrief-dictation-input"
            onChange={(event) => onChange({ ...form, dictation: event.target.value })}
          />
        </section>
      ) : null}

      <section className="mb-debrief-launcher__section">
        <h3 className="mb-debrief-launcher__label">{MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_SECTION}</h3>
        <div className="mb-debrief-complete__options" role="radiogroup" aria-label="Debrief outcome">
          {MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_IDS.map((id) => (
            <label key={id} className="mb-debrief-complete__option">
              <input
                type="radio"
                name="debrief-outcome"
                value={id}
                checked={form.outcomeId === id}
                disabled={controlsDisabled}
                onChange={() => onChange({ ...form, outcomeId: id })}
              />
              <span>{MISSION_BOARD_DEBRIEF_COMPLETE_OUTCOME_LABELS[id]}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="mb-debrief-launcher__section">
        <h3 className="mb-debrief-launcher__label">
          {MISSION_BOARD_DEBRIEF_COMPLETE_OPPORTUNITY_SECTION}
        </h3>
        <div className="mb-debrief-complete__options" role="radiogroup" aria-label="Opportunity result">
          {MISSION_BOARD_DEBRIEF_OPPORTUNITY_RESULTS.map((id) => (
            <label key={id} className="mb-debrief-complete__option">
              <input
                type="radio"
                name="debrief-opportunity"
                value={id}
                checked={form.opportunityResult === id}
                disabled={controlsDisabled}
                onChange={() =>
                  onChange({
                    ...form,
                    opportunityResult: id,
                    evaluationPath: id === "confirmed" ? form.evaluationPath : "",
                  })
                }
              />
              <span>{MISSION_BOARD_DEBRIEF_OPPORTUNITY_LABELS[id]}</span>
            </label>
          ))}
        </div>
      </section>

      {showEvaluationPath ? (
        <section className="mb-debrief-launcher__section">
          <h3 className="mb-debrief-launcher__label">{MISSION_BOARD_DEBRIEF_COMPLETE_PATH_SECTION}</h3>
          <select
            className="mb-debrief-complete__select"
            value={form.evaluationPath}
            disabled={controlsDisabled}
            aria-label="Evaluation path"
            onChange={(event) =>
              onChange({
                ...form,
                evaluationPath: event.target.value as SalesPathwayEvaluationActivity | "",
              })
            }
          >
            <option value="">Select path…</option>
            {MISSION_BOARD_EVALUATION_PATH_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </section>
      ) : null}

      <section className="mb-debrief-launcher__section">
        <h3 className="mb-debrief-launcher__label">{MISSION_BOARD_DEBRIEF_NEXT_STEP_SECTION}</h3>
        <textarea
          className="mb-debrief-complete__notes"
          rows={2}
          maxLength={500}
          placeholder={MISSION_BOARD_DEBRIEF_NEXT_STEP_PLACEHOLDER}
          value={form.nextStep}
          disabled={controlsDisabled}
          data-testid="mission-board-debrief-next-step-input"
          onChange={(event) => onChange({ ...form, nextStep: event.target.value })}
        />
      </section>

      {error ? (
        <p className="mb-debrief-launcher__error" role="alert">
          {error}
        </p>
      ) : null}

      {submitBlockedReason && !controlsDisabled ? (
        <p className="mb-debrief-launcher__text" role="status" data-testid="mission-board-debrief-submit-hint">
          {submitBlockedReason}
        </p>
      ) : null}

      <div className="mb-debrief-complete__actions">
        <button
          type="button"
          className="mb-debrief-launcher__primary"
          disabled={
            controlsDisabled ||
            (showEvaluationPath && !form.evaluationPath) ||
            (requireDictation && form.dictation.trim().length < 8)
          }
          data-testid="mission-board-debrief-save-complete"
          onClick={() => void onSubmit()}
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          className="mb-debrief-launcher__cancel"
          disabled={Boolean(saving)}
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

export function defaultMissionBoardDebriefCompleteForm(): MissionBoardDebriefCompleteFormState {
  return {
    dictation: "",
    outcomeId: "touch_success",
    opportunityResult: "unknown",
    evaluationPath: "",
    nextStep: "",
  };
}
