"use client";

import React from "react";
import { PhiPatternInlineHint } from "@/components/sales/PhiPatternAdvisoryModal";
import type { SurgicalPhiPatternKind } from "@/lib/surgical-sales/phiContentHeuristics";
import { AI_NOTE_CAPTURE_DISCARD_IMAGE_NOTICE } from "@/lib/surgical-sales/aiNoteCapture/labels";
import {
  LOG_UPDATE_DICTATION_CAPTURED,
  LOG_UPDATE_MORE_CAPTURE_OPTIONS,
  LOG_UPDATE_PHI_BANNER,
  LOG_UPDATE_TEXTAREA_PLACEHOLDER,
  LOG_UPDATE_VOICE_CLEAR,
  LOG_UPDATE_VOICE_IDLE,
  LOG_UPDATE_VOICE_LISTENING,
  LOG_UPDATE_VOICE_PAUSED,
  LOG_UPDATE_VOICE_PAUSE,
  LOG_UPDATE_VOICE_RECORDING,
  LOG_UPDATE_VOICE_RESUME,
  LOG_UPDATE_VOICE_START,
  LOG_UPDATE_VOICE_STOP,
  LOG_UPDATE_VOICE_TRANSCRIBING,
  LOG_UPDATE_VOICE_UNAVAILABLE,
} from "@/lib/surgical-sales/logUpdateUx";
import type { DictationMode, DictationUiState } from "@/hooks/useSpeechDictation";
import type { IntelligenceCaptureScope } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import { formatLogUpdateContextLine } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";

function voiceStatusLabel(
  state: DictationUiState,
  dictationMode: DictationMode,
): string | null {
  switch (state) {
    case "listening":
      return dictationMode === "server" ? LOG_UPDATE_VOICE_RECORDING : LOG_UPDATE_VOICE_LISTENING;
    case "paused":
      return LOG_UPDATE_VOICE_PAUSED;
    case "transcribing":
      return LOG_UPDATE_VOICE_TRANSCRIBING;
    case "idle":
      return LOG_UPDATE_VOICE_IDLE;
    default:
      return null;
  }
}

export function LogUpdateCaptureCompose({
  scope,
  rawText,
  onTextChange,
  phiKinds,
  busy,
  dictationUiState,
  dictationMode,
  voiceCaptureAvailable,
  dictationCaptured,
  dictationError,
  onStartDictation,
  onStopDictation,
  onPauseDictation,
  onResumeDictation,
  onClearTranscript,
  onPhotoPick,
  onUploadPick,
  placeholder,
  hidePhotoCapture = false,
}: {
  scope: IntelligenceCaptureScope | null;
  rawText: string;
  onTextChange: (text: string) => void;
  phiKinds: SurgicalPhiPatternKind[];
  busy: boolean;
  dictationUiState: DictationUiState;
  dictationMode: DictationMode;
  /** Browser speech and/or server Whisper recording available. */
  voiceCaptureAvailable: boolean;
  dictationCaptured: boolean;
  dictationError: string | null;
  onStartDictation: () => void;
  onStopDictation: () => void;
  onPauseDictation: () => void;
  onResumeDictation: () => void;
  onClearTranscript: () => void;
  onPhotoPick: () => void;
  onUploadPick: () => void;
  placeholder?: string;
  hidePhotoCapture?: boolean;
}) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const listening = dictationUiState === "listening";
  const paused = dictationUiState === "paused";
  const transcribing = dictationUiState === "transcribing";
  const voiceBusy = busy || transcribing;
  const useRecordStopUx = dictationMode === "server" || transcribing;
  const micDisabled = !voiceCaptureAvailable || (voiceBusy && !listening && !paused);
  const liveBrowserDictation = listening && dictationMode === "browser";

  const voiceStatus = voiceStatusLabel(dictationUiState, dictationMode);
  const showUnsupportedHint =
    !voiceCaptureAvailable && dictationUiState === "idle" && !dictationError;

  const micLabel = transcribing
    ? LOG_UPDATE_VOICE_TRANSCRIBING
    : listening
      ? useRecordStopUx
        ? LOG_UPDATE_VOICE_STOP
        : LOG_UPDATE_VOICE_PAUSE
      : paused
        ? LOG_UPDATE_VOICE_RESUME
        : LOG_UPDATE_VOICE_START;

  function handleMicClick() {
    if (transcribing) return;
    if (useRecordStopUx) {
      if (listening) onStopDictation();
      else onStartDictation();
      return;
    }
    if (listening) onPauseDictation();
    else if (paused) onResumeDictation();
    else onStartDictation();
  }

  const textareaPlaceholder =
    listening && dictationMode === "server" && !rawText.trim()
      ? LOG_UPDATE_VOICE_RECORDING
      : placeholder ?? LOG_UPDATE_TEXTAREA_PLACEHOLDER;

  return (
    <div className="log-update-capture">
      {scope ? (
        <div className="log-update-capture-context" role="status">
          <p className="log-update-capture-context-line">{formatLogUpdateContextLine(scope)}</p>
        </div>
      ) : null}

      <div className="log-update-capture-editor">
        <textarea
          className={`log-update-capture-textarea${
            liveBrowserDictation ? " log-update-capture-textarea--live" : ""
          }${transcribing ? " log-update-capture-textarea--transcribing" : ""}`}
          value={rawText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={textareaPlaceholder}
          disabled={busy || transcribing}
          rows={6}
          aria-label="Field note"
          aria-live="polite"
          aria-busy={listening || transcribing}
        />
        {liveBrowserDictation ? (
          <p className="log-update-capture-live-badge" aria-hidden>
            Live
          </p>
        ) : null}
      </div>

      <div className="log-update-capture-toolbar">
        <button
          type="button"
          className={`log-update-capture-toolbar-mic${
            listening ? " log-update-capture-toolbar-mic--active" : ""
          }${paused ? " log-update-capture-toolbar-mic--paused" : ""}`}
          onClick={handleMicClick}
          disabled={micDisabled}
          aria-pressed={listening || paused}
          aria-label={micLabel}
        >
          {micLabel}
        </button>

        {voiceStatus && dictationUiState !== "error" ? (
          <p className="log-update-capture-toolbar-status" aria-live="polite">
            {voiceStatus}
          </p>
        ) : null}

        <div className="log-update-capture-toolbar-actions">
          {!useRecordStopUx && listening ? (
            <button
              type="button"
              className="log-update-capture-toolbar-secondary"
              onClick={onPauseDictation}
              disabled={voiceBusy}
            >
              {LOG_UPDATE_VOICE_PAUSE}
            </button>
          ) : null}
          {!useRecordStopUx && paused ? (
            <button
              type="button"
              className="log-update-capture-toolbar-secondary"
              onClick={onResumeDictation}
              disabled={voiceBusy}
            >
              {LOG_UPDATE_VOICE_RESUME}
            </button>
          ) : null}
          {listening && useRecordStopUx ? (
            <button
              type="button"
              className="log-update-capture-toolbar-secondary"
              onClick={onStopDictation}
              disabled={transcribing}
            >
              {LOG_UPDATE_VOICE_STOP}
            </button>
          ) : null}
          {rawText.trim() ? (
            <button
              type="button"
              className="log-update-capture-toolbar-secondary"
              onClick={onClearTranscript}
              disabled={voiceBusy && !paused}
            >
              {LOG_UPDATE_VOICE_CLEAR}
            </button>
          ) : null}
        </div>
      </div>

      {dictationCaptured ? (
        <p className="log-update-capture-dictation-captured" role="status" aria-live="polite">
          {LOG_UPDATE_DICTATION_CAPTURED}
        </p>
      ) : null}

      <p className="log-update-capture-phi-banner" role="note">
        {LOG_UPDATE_PHI_BANNER}
      </p>

      <PhiPatternInlineHint kinds={phiKinds} />

      {!hidePhotoCapture ? (
        <details
          className="log-update-capture-more"
          open={moreOpen}
          onToggle={(e) => setMoreOpen(e.currentTarget.open)}
        >
          <summary className="log-update-capture-more-summary">{LOG_UPDATE_MORE_CAPTURE_OPTIONS}</summary>
          <div className="log-update-capture-more-body">
            <div className="log-update-capture-more-actions">
              <button type="button" className="log-update-capture-more-btn" disabled={busy} onClick={onPhotoPick}>
                Photo
              </button>
              <button type="button" className="log-update-capture-more-btn" disabled={busy} onClick={onUploadPick}>
                Upload image
              </button>
            </div>
            <p className="log-update-capture-more-hint">{AI_NOTE_CAPTURE_DISCARD_IMAGE_NOTICE}</p>
          </div>
        </details>
      ) : null}

      {showUnsupportedHint ? (
        <p className="log-update-capture-voice-unsupported" role="note">
          {LOG_UPDATE_VOICE_UNAVAILABLE}
        </p>
      ) : null}

      {dictationError ? (
        <p className="log-update-capture-voice-error" role="alert">
          {dictationError}
        </p>
      ) : null}
    </div>
  );
}
