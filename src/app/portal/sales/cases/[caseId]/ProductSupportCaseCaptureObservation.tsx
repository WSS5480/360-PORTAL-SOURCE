"use client";

import React from "react";
import { isVoiceCaptureAvailable, salesDictationOptions, useSpeechDictation } from "@/hooks/useSpeechDictation";
import { SURGICAL_PHI_UI_NOTICE } from "@/lib/surgical-sales/labels";
import {
  PRODUCT_SUPPORT_CAPTURE_HINT,
  PRODUCT_SUPPORT_CAPTURE_LEAD,
  PRODUCT_SUPPORT_CAPTURE_MODE_LABELS,
  PRODUCT_SUPPORT_CAPTURE_OBSERVATION_PRIMARY_LABEL,
  PRODUCT_SUPPORT_DETAIL_SECTION_LABELS,
} from "@/lib/surgical-sales/productSupportCaseDetailVocabulary";
import { productSupportCaseOverviewCss } from "./productSupportCaseOverviewCss";
import { userFacingError } from "@/lib/errors/userFacingError";

type CaptureMode = "idle" | "picker" | "voice" | "quick";

export type ProductSupportCaseCaptureObservationHandle = {
  open: () => void;
};

function voiceRecordButtonLabel(state: string, transcribing: boolean, listening: boolean): string {
  if (transcribing) return "Transcribing…";
  if (listening) return "Recording… Tap to stop";
  if (state === "paused") return "Paused";
  if (state === "error") return "Retry recording";
  return "Record";
}

export const ProductSupportCaseCaptureObservation = React.forwardRef<
  ProductSupportCaseCaptureObservationHandle,
  {
    disabled?: boolean;
    onSaveNote: (body: string, captureMode?: "voice" | "quick") => Promise<void>;
    captureRef?: React.RefObject<HTMLElement | null>;
  }
>(function ProductSupportCaseCaptureObservation({ disabled, onSaveNote, captureRef }, ref) {
  const noteRef = React.useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = React.useState<CaptureMode>("idle");
  const [noteDraft, setNoteDraft] = React.useState("");
  const [dictationDraft, setDictationDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    dictationUiState,
    dictating,
    transcribing,
    dictationError,
    browserSupported,
    startDictation,
    stopDictationAsync,
    teardownDictation,
  } = useSpeechDictation(setDictationDraft, salesDictationOptions());

  React.useImperativeHandle(ref, () => ({
    open: () => {
      setMode("picker");
      setError(null);
    },
  }));

  React.useEffect(
    () => () => {
      teardownDictation();
    },
    [teardownDictation],
  );

  const voiceAvailable =
    browserSupported ||
    (typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));
  const listening = dictating || transcribing;
  const busy = disabled || saving;

  function resetCapture() {
    setMode("idle");
    setNoteDraft("");
    setDictationDraft("");
    setError(null);
    teardownDictation();
  }

  async function persistObservation(body: string, captureMode: "voice" | "quick") {
    const trimmed = body.trim();
    if (!trimmed || busy) return false;

    setSaving(true);
    setError(null);
    try {
      await onSaveNote(trimmed, captureMode);
      resetCapture();
      return true;
    } catch (caught: unknown) {
      setError(userFacingError(caught, "Could not save observation"));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleVoiceRecordTap() {
    if (busy || !voiceAvailable) return;

    if (listening) {
      await stopDictationAsync();
      return;
    }

    setDictationDraft("");
    startDictation("");
  }

  function openQuickNote() {
    if (busy || listening) return;
    setMode("quick");
    setNoteDraft("");
    window.setTimeout(() => noteRef.current?.focus(), 0);
  }

  return (
    <section
      ref={captureRef}
      id="case-ps-capture"
      className="case-ps-detail-card case-ps-capture-card"
      aria-labelledby="case-ps-capture-title"
    >
      <style dangerouslySetInnerHTML={{ __html: productSupportCaseOverviewCss }} />
      {mode === "idle" ? (
        <button
          type="button"
          className="case-ps-capture-hero-btn"
          disabled={busy}
          onClick={() => setMode("picker")}
        >
          {PRODUCT_SUPPORT_CAPTURE_OBSERVATION_PRIMARY_LABEL}
        </button>
      ) : null}

      {mode !== "idle" ? (
        <>
          <h2 id="case-ps-capture-title" className="case-ps-detail-card-title case-ps-capture-title">
            {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.captureObservation}
          </h2>
        </>
      ) : null}

      {mode === "picker" ? (
        <>
          <p className="case-ps-capture-lead">Choose how you want to capture this observation.</p>
          <div className="case-ps-capture-mode-grid">
            <button
              type="button"
              className="case-ps-capture-mode-btn"
              disabled={busy || !voiceAvailable}
              onClick={() => {
                setMode("voice");
                setDictationDraft("");
              }}
            >
              <span className="case-ps-capture-mode-icon" aria-hidden>
                🎤
              </span>
              <span className="case-ps-capture-mode-label">{PRODUCT_SUPPORT_CAPTURE_MODE_LABELS.voiceNote}</span>
            </button>
            <button type="button" className="case-ps-capture-mode-btn" disabled={busy} onClick={openQuickNote}>
              <span className="case-ps-capture-mode-icon" aria-hidden>
                ⌨️
              </span>
              <span className="case-ps-capture-mode-label">{PRODUCT_SUPPORT_CAPTURE_MODE_LABELS.quickNote}</span>
            </button>
          </div>
          <button type="button" className="case-ps-capture-cancel-btn" disabled={busy} onClick={resetCapture}>
            Cancel
          </button>
        </>
      ) : null}

      {mode === "voice" ? (
        <>
          <p className="case-ps-capture-lead">Record, review the transcript, then save.</p>
          {voiceAvailable ? (
            <button
              type="button"
              className={`case-ps-capture-dictate-btn${listening ? " case-ps-capture-dictate-btn--active" : ""}`}
              disabled={busy}
              onClick={() => void handleVoiceRecordTap()}
              aria-pressed={listening}
            >
              {voiceRecordButtonLabel(dictationUiState, transcribing, listening)}
            </button>
          ) : (
            <p className="case-ps-detail-card-empty">Voice capture is not available on this device.</p>
          )}
          {dictationDraft.trim() ? (
            <div className="case-ps-capture-live" aria-live="polite">
              <p className="case-ps-capture-live-label">Transcript</p>
              <p className="case-ps-capture-live-text">{dictationDraft}</p>
            </div>
          ) : null}
          <div className="case-ps-capture-note-actions">
            <button
              type="button"
              className="case-ps-capture-save-btn"
              disabled={busy || listening || !dictationDraft.trim()}
              onClick={() => void persistObservation(dictationDraft, "voice")}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className="case-ps-capture-cancel-btn" disabled={saving || listening} onClick={resetCapture}>
              Cancel
            </button>
          </div>
        </>
      ) : null}

      {mode === "quick" ? (
        <>
          <p className="case-ps-capture-lead">Type a short observation and save.</p>
          <div className="case-ps-capture-note-form">
            <textarea
              ref={noteRef}
              className="case-ps-capture-note-area"
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              disabled={busy}
              placeholder="What did you observe during the case?"
              aria-label="Observation note"
            />
            <div className="case-ps-capture-note-actions">
              <button
                type="button"
                className="case-ps-capture-save-btn"
                disabled={busy || !noteDraft.trim()}
                onClick={() => void persistObservation(noteDraft, "quick")}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" className="case-ps-capture-cancel-btn" disabled={saving} onClick={resetCapture}>
                Cancel
              </button>
            </div>
          </div>
        </>
      ) : null}

      {mode !== "idle" ? <p className="case-ps-capture-hint">{PRODUCT_SUPPORT_CAPTURE_HINT}</p> : null}
      <p className="case-ps-capture-phi">{SURGICAL_PHI_UI_NOTICE}</p>
      {dictationError ? <p className="case-ps-capture-error">{dictationError}</p> : null}
      {error ? <p className="case-ps-capture-error">{error}</p> : null}
    </section>
  );
});
