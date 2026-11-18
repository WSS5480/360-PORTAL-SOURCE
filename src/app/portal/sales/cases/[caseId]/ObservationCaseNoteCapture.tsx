"use client";

import React from "react";
import { isVoiceCaptureAvailable, salesDictationOptions, useSpeechDictation } from "@/hooks/useSpeechDictation";
import {
  OBSERVATION_DETAIL_SECTION_LABELS,
  OBSERVATION_LIVE_NOTES_PHI_REMINDER,
} from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import type { ObservationCaptureFeedbackResult } from "@/lib/surgical-sales/observationCaptureFeedback";
import { observationFieldExecutionCss } from "./observationFieldExecutionCss";
import { userFacingError } from "@/lib/errors/userFacingError";

function dictationButtonLabel(state: string, transcribing: boolean, listening: boolean): string {
  if (transcribing) return "Transcribing…";
  if (listening) return "Listening… Tap to save";
  if (state === "paused") return "Paused — Tap to save";
  if (state === "error") return "Retry dictation";
  return "Start Dictation";
}

export function ObservationCaseNoteCapture({
  disabled,
  onSaveNote,
  onBeginCapture,
  onMarkComplete,
  showMarkCompleteNudge = false,
  dictationRequest,
  quickNoteId = "case-obs-field-notes-quick",
  layout = "default",
  includeStyles = true,
}: {
  disabled?: boolean;
  /** May resolve with capture feedback for inline display after save. */
  onSaveNote: (
    body: string,
    meta?: { captureMode?: "voice" | "quick" },
  ) => Promise<void | ObservationCaptureFeedbackResult>;
  onBeginCapture?: () => void | Promise<void>;
  /** Shown after a successful save when the case is in progress but not complete. */
  onMarkComplete?: () => void | Promise<void>;
  showMarkCompleteNudge?: boolean;
  /** Increment to request dictation from chrome actions (header / mobile bar). */
  dictationRequest?: number;
  quickNoteId?: string;
  layout?: "default" | "briefing";
  includeStyles?: boolean;
}) {
  const noteRef = React.useRef<HTMLTextAreaElement>(null);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [dictationDraft, setDictationDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [captureFeedback, setCaptureFeedback] = React.useState<ObservationCaptureFeedbackResult | null>(
    null,
  );
  const [noteSaved, setNoteSaved] = React.useState(false);
  const [markingComplete, setMarkingComplete] = React.useState(false);
  const dictationRequestRef = React.useRef(dictationRequest ?? 0);

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

  async function persistNote(body: string, captureMode?: "voice" | "quick") {
    const trimmed = body.trim();
    if (!trimmed || busy) return false;
    setSaving(true);
    setError(null);
    setCaptureFeedback(null);
    setNoteSaved(false);
    try {
      const result = await onSaveNote(trimmed, captureMode ? { captureMode } : undefined);
      setNoteSaved(true);
      setCaptureFeedback(result ?? null);
      return true;
    } catch (caught: unknown) {
      setError(userFacingError(caught, "Could not save note"));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDictationTap() {
    if (busy || !voiceAvailable) return;
    if (listening) {
      await stopDictationAsync();
      const saved = await persistNote(dictationDraft, "voice");
      if (saved) setDictationDraft("");
      return;
    }
    await onBeginCapture?.();
    setCaptureFeedback(null);
    setNoteSaved(false);
    setDictationDraft("");
    startDictation("");
  }

  React.useEffect(() => {
    if (dictationRequest == null || dictationRequest <= 0) return;
    if (dictationRequest <= dictationRequestRef.current) return;
    dictationRequestRef.current = dictationRequest;

    void (async () => {
      if (busy) return;
      if (!voiceAvailable) {
        noteRef.current?.focus();
        return;
      }
      await onBeginCapture?.();
      setDictationDraft("");
      startDictation("");
    })();
  }, [dictationRequest, busy, voiceAvailable, onBeginCapture, startDictation]);

  async function saveQuickNote() {
    await onBeginCapture?.();
    const saved = await persistNote(noteDraft, "quick");
    if (saved) setNoteDraft("");
  }

  return (
    <>
      {includeStyles ? (
        <style dangerouslySetInnerHTML={{ __html: observationFieldExecutionCss }} />
      ) : null}
      <div
        className={layout === "briefing" ? "case-obs-briefing-capture-body" : "case-obs-execution-capture"}
        aria-label={OBSERVATION_DETAIL_SECTION_LABELS.fieldNotes}
      >
        <button
          type="button"
          className={
            layout === "briefing"
              ? "case-obs-execution-primary case-obs-execution-primary--briefing"
              : "case-obs-execution-primary"
          }
          disabled={busy || !voiceAvailable}
          onClick={() => void handleDictationTap()}
          aria-pressed={listening}
        >
          {dictationButtonLabel(dictationUiState, transcribing, listening)}
        </button>

        {!voiceAvailable ? (
          <p className="case-obs-execution-meta">Voice dictation is not available in this browser.</p>
        ) : null}

        {layout === "default" ? (
          <p className="case-obs-execution-or" aria-hidden>
            OR
          </p>
        ) : null}

        <div className="case-obs-execution-quick">
          {layout === "default" ? (
            <label className="case-obs-execution-meta" htmlFor={quickNoteId}>
              Quick note
            </label>
          ) : null}
          <textarea
            id={quickNoteId}
            ref={noteRef}
            className="case-obs-execution-quick-area"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            disabled={busy || listening}
            placeholder="What did you just see or hear?"
            aria-label="Quick note"
          />
          <button
            type="button"
            className="case-obs-execution-quick-save"
            disabled={busy || listening || !noteDraft.trim()}
            onClick={() => void saveQuickNote()}
          >
            {saving ? "Saving…" : "Save note"}
          </button>
        </div>

        <p className="case-obs-execution-meta">{OBSERVATION_LIVE_NOTES_PHI_REMINDER}</p>
        {dictationError ? (
          <p className="case-obs-execution-meta" style={{ color: "var(--danger)" }}>
            {dictationError}
          </p>
        ) : null}
        {error ? (
          <p className="case-obs-execution-meta" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        ) : null}
        {noteSaved ? (
          <p
            className="case-obs-capture-saved"
            data-testid="case-obs-note-saved"
            role="status"
            aria-live="polite"
          >
            Note saved.
          </p>
        ) : null}
        {listening && dictationDraft.trim() ? (
          <p className="case-obs-execution-note-body" aria-live="polite">
            {dictationDraft}
          </p>
        ) : null}
        {captureFeedback?.status === "chips" && captureFeedback.items.length > 0 ? (
          <div
            className="case-obs-capture-feedback"
            data-testid="case-obs-capture-feedback"
            aria-live="polite"
          >
            <p className="case-obs-capture-feedback-title">Captured from this note</p>
            <ul className="case-obs-capture-feedback-list" aria-label="Findings captured from this note">
              {captureFeedback.items.map((item) => (
                <li key={item.id} className="case-obs-capture-feedback-chip">
                  {item.text}
                </li>
              ))}
            </ul>
            <p className="case-obs-execution-meta">Full details are on the Intelligence tab.</p>
          </div>
        ) : null}
        {captureFeedback?.status === "deferred" ? (
          <p
            className="case-obs-capture-feedback-deferred case-obs-execution-meta"
            data-testid="case-obs-capture-feedback-deferred"
            aria-live="polite"
          >
            {captureFeedback.message}
          </p>
        ) : null}
        {noteSaved && showMarkCompleteNudge && onMarkComplete ? (
          <div className="case-obs-mark-complete-nudge" data-testid="case-obs-mark-complete-nudge">
            <p className="case-obs-mark-complete-nudge__text">
              Mark this case complete when your observation note is finished — it counts toward the
              5-case program.
            </p>
            <button
              type="button"
              className="case-obs-mark-complete-nudge__btn"
              disabled={busy || markingComplete}
              onClick={() => {
                setMarkingComplete(true);
                void Promise.resolve(onMarkComplete()).finally(() => setMarkingComplete(false));
              }}
            >
              {markingComplete ? "Marking complete…" : "Mark case complete"}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
