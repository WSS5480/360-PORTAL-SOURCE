"use client";

import React from "react";
import {
  OBSERVATION_LIVE_NOTES_PHI_REMINDER,
  OBSERVATION_QUICK_NOTE_AI_HINT,
} from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import { isVoiceCaptureAvailable, salesDictationOptions, useSpeechDictation } from "@/hooks/useSpeechDictation";
import { patchObservationCase } from "./caseObservationPatch";
import { userFacingError } from "@/lib/errors/userFacingError";

const AUTOSAVE_MS = 900;

type SaveState = "idle" | "saving" | "saved" | "error";

function dictationLabel(state: string, transcribing: boolean): string {
  if (transcribing) return "Transcribing…";
  if (state === "listening") return "Listening…";
  if (state === "paused") return "Paused";
  if (state === "error") return "Mic error";
  return "Start Dictation";
}

export function CaseObservationLiveNotes({
  caseId,
  caseRow,
  disabled,
  autoFocus,
  onCasePatched,
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  disabled?: boolean;
  autoFocus?: boolean;
  onCasePatched: (savedCase: Record<string, unknown>) => void;
}) {
  const notesRef = React.useRef<HTMLTextAreaElement>(null);
  const initialNotes = String(caseRow.notes ?? "");
  const [liveNotes, setLiveNotes] = React.useState(initialNotes);
  const [expanded, setExpanded] = React.useState(() => Boolean(initialNotes.trim()) || Boolean(autoFocus));
  const [notesSaveState, setNotesSaveState] = React.useState<SaveState>("idle");
  const [notesError, setNotesError] = React.useState<string | null>(null);
  const notesSaveTimerRef = React.useRef<number | null>(null);
  const notesSavedValueRef = React.useRef(initialNotes);

  const queueNotesSave = React.useCallback(
    (nextValue: string) => {
      if (notesSaveTimerRef.current != null) window.clearTimeout(notesSaveTimerRef.current);
      notesSaveTimerRef.current = window.setTimeout(() => {
        void (async () => {
          if (disabled || nextValue === notesSavedValueRef.current) return;
          setNotesSaveState("saving");
          setNotesError(null);
          try {
            const saved = await patchObservationCase(caseId, { notes: nextValue.trim() || null });
            notesSavedValueRef.current = String(saved.notes ?? "");
            onCasePatched(saved);
            setNotesSaveState("saved");
            window.setTimeout(() => setNotesSaveState("idle"), 1400);
          } catch (error: unknown) {
            setNotesSaveState("error");
            setNotesError(userFacingError(error, "Could not save notes"));
          }
        })();
      }, AUTOSAVE_MS);
    },
    [caseId, disabled, onCasePatched],
  );

  const onNotesChange = React.useCallback(
    (next: string) => {
      setLiveNotes(next);
      setNotesSaveState("idle");
      queueNotesSave(next);
    },
    [queueNotesSave],
  );

  const {
    dictationUiState,
    dictating,
    transcribing,
    dictationError,
    browserSupported,
    startDictation,
    stopDictationAsync,
    teardownDictation,
  } = useSpeechDictation(onNotesChange, salesDictationOptions());

  React.useEffect(() => {
    const nextNotes = String(caseRow.notes ?? "");
    setLiveNotes(nextNotes);
    notesSavedValueRef.current = nextNotes;
    if (nextNotes.trim()) setExpanded(true);
  }, [caseRow.notes]);

  React.useEffect(() => {
    if (autoFocus) setExpanded(true);
  }, [autoFocus]);

  React.useEffect(
    () => () => {
      if (notesSaveTimerRef.current != null) window.clearTimeout(notesSaveTimerRef.current);
      teardownDictation();
    },
    [teardownDictation],
  );

  React.useEffect(() => {
    if (dictating || transcribing) setExpanded(true);
  }, [dictating, transcribing]);

  const voiceAvailable =
    browserSupported ||
    (typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));

  async function toggleDictation() {
    if (disabled || !voiceAvailable) return;
    if (dictating || transcribing) {
      await stopDictationAsync();
      return;
    }
    setExpanded(true);
    startDictation(liveNotes);
  }

  function openQuickNote() {
    setExpanded(true);
    window.setTimeout(() => notesRef.current?.focus(), 0);
  }

  const saveLabel =
    notesSaveState === "saving"
      ? "Saving…"
      : notesSaveState === "saved"
        ? "Saved"
        : notesSaveState === "error"
          ? notesError || "Save failed"
          : expanded && liveNotes.trim()
            ? "Autosave on"
            : null;

  const hasPreview = !expanded && liveNotes.trim().length > 0;
  const previewText =
    liveNotes.trim().length > 120 ? `${liveNotes.trim().slice(0, 117)}…` : liveNotes.trim();

  return (
    <section
      className={`case-obs-quick-capture${expanded ? " case-obs-quick-capture--expanded" : ""}`}
      aria-labelledby="case-obs-capture-title"
    >
      <header className="case-obs-quick-capture-header">
        <div className="case-obs-quick-capture-heading">
          <h2 id="case-obs-capture-title" className="case-obs-quick-capture-title">
            Quick capture
          </h2>
          {!expanded ? (
            <p className="case-obs-quick-capture-sub">Dictate or jot a note — AI organizes it in Workflow.</p>
          ) : (
            <p className="case-obs-quick-capture-sub">{OBSERVATION_QUICK_NOTE_AI_HINT}</p>
          )}
        </div>
        {saveLabel ? (
          <span
            className={`case-obs-live-notes-save${notesSaveState === "saved" ? " case-obs-live-notes-save--saved" : ""}${notesSaveState === "error" ? " case-obs-live-notes-save--error" : ""}`}
            role="status"
            aria-live="polite"
          >
            {saveLabel}
          </span>
        ) : null}
      </header>

      {!expanded ? (
        <div className="case-obs-quick-capture-collapsed">
          {hasPreview ? (
            <button type="button" className="case-obs-quick-capture-preview" onClick={openQuickNote} disabled={disabled}>
              <span className="case-obs-quick-capture-preview-label">Last note</span>
              <span className="case-obs-quick-capture-preview-text">{previewText}</span>
            </button>
          ) : null}
          <div className="case-obs-quick-capture-actions">
            {voiceAvailable ? (
              <button
                type="button"
                className="case-obs-quick-capture-btn case-obs-quick-capture-btn--primary"
                disabled={disabled || transcribing}
                onClick={() => void toggleDictation()}
              >
                {dictationLabel(dictationUiState, transcribing)}
              </button>
            ) : null}
            <button
              type="button"
              className="case-obs-quick-capture-btn"
              disabled={disabled}
              onClick={openQuickNote}
            >
              Quick Note
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="case-obs-live-notes-phi" role="note">
            {OBSERVATION_LIVE_NOTES_PHI_REMINDER}
          </p>
          <div className="case-obs-live-notes-capture">
            <textarea
              ref={notesRef}
              className="case-obs-live-notes-area"
              value={liveNotes}
              onChange={(event) => onNotesChange(event.target.value)}
              disabled={disabled || transcribing}
              autoFocus={autoFocus}
              placeholder="Dictate or type what you see — workflow, products, staff reactions, follow-ups."
              aria-label="Quick observation note"
            />
            {voiceAvailable ? (
              <button
                type="button"
                className={`case-obs-live-notes-dictate${dictating ? " case-obs-live-notes-dictate--active" : ""}`}
                disabled={disabled || transcribing}
                onClick={() => void toggleDictation()}
                aria-pressed={dictating}
              >
                {dictationLabel(dictationUiState, transcribing)}
              </button>
            ) : null}
          </div>
          {!dictating && !transcribing && !liveNotes.trim() ? (
            <button type="button" className="case-obs-quick-capture-collapse" onClick={() => setExpanded(false)}>
              Collapse
            </button>
          ) : null}
        </>
      )}
      {dictationError ? (
        <p className="case-obs-live-notes-dictate-error" role="alert">
          {dictationError}
        </p>
      ) : null}
    </section>
  );
}
