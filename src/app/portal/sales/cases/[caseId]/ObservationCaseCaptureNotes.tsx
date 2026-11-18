"use client";



import React from "react";

import { isVoiceCaptureAvailable, salesDictationOptions, useSpeechDictation } from "@/hooks/useSpeechDictation";

import {

  OBSERVATION_BRIEFING_DICTATION_HINT,

  OBSERVATION_LIVE_NOTES_PHI_REMINDER,

  OBSERVATION_DETAIL_SECTION_LABELS,

} from "@/lib/surgical-sales/observationCaseDetailVocabulary";

import { observationCaseExecuteCss } from "./observationCaseExecuteCss";
import { userFacingError } from "@/lib/errors/userFacingError";



function dictationButtonLabel(state: string, transcribing: boolean, listening: boolean): string {

  if (transcribing) return "Transcribing…";

  if (listening) return "Listening… Tap to save";

  if (state === "paused") return "Paused — Tap to save";

  if (state === "error") return "Retry dictation";

  return "Start Dictation";

}

export function ObservationCaseCaptureNotes({

  disabled,

  onSaveNote,

  variant = "primary",

  showSectionHeader = true,

  fieldExecution = false,

  layout = "default",

}: {

  disabled?: boolean;

  onSaveNote: (body: string) => Promise<void>;

  variant?: "primary" | "compact";

  showSectionHeader?: boolean;

  fieldExecution?: boolean;

  layout?: "default" | "briefing";

}) {

  const isBriefing = layout === "briefing";

  const noteRef = React.useRef<HTMLTextAreaElement>(null);

  const [noteOpen, setNoteOpen] = React.useState(false);

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



  async function persistObservation(body: string) {

    const trimmed = body.trim();

    if (!trimmed || busy) return false;



    setSaving(true);

    setError(null);

    try {

      await onSaveNote(trimmed);

      return true;

    } catch (caught: unknown) {

      setError(userFacingError(caught, "Could not save observation"));

      return false;

    } finally {

      setSaving(false);

    }

  }



  async function handleDictationTap() {

    if (busy || !voiceAvailable) return;



    if (listening) {

      await stopDictationAsync();

      const saved = await persistObservation(dictationDraft);

      if (saved) {

        setDictationDraft("");

        if (!isBriefing) setNoteOpen(false);

      }

      return;

    }



    setDictationDraft("");

    if (!isBriefing) setNoteOpen(true);

    startDictation("");

  }



  function openTypedNote() {

    if (busy || listening) return;

    setNoteOpen(true);

    setNoteDraft("");

    window.setTimeout(() => noteRef.current?.focus(), 0);

  }



  async function saveTypedNote() {

    const saved = await persistObservation(noteDraft);

    if (saved) {

      setNoteDraft("");

      if (!isBriefing) setNoteOpen(false);

    }

  }



  if (isBriefing) {

    return (

      <div className="case-obs-briefing-capture" aria-label="Capture notes">

        <button

          type="button"

          className={`case-obs-briefing-dictate-btn${listening ? " case-obs-briefing-dictate-btn--active" : ""}`}

          disabled={busy || !voiceAvailable}

          onClick={() => void handleDictationTap()}

          aria-pressed={listening}

        >

          {dictationButtonLabel(dictationUiState, transcribing, listening)}

        </button>

        {!voiceAvailable ? (

          <p className="case-obs-briefing-capture-meta">Voice dictation is not available in this browser.</p>

        ) : null}



        <p className="case-obs-briefing-or" aria-hidden>

          OR

        </p>



        {!noteOpen ? (

          <button

            type="button"

            className="case-obs-briefing-quick-note-btn"

            disabled={busy || listening}

            onClick={openTypedNote}

          >

            Quick note

          </button>

        ) : (

          <div className="case-obs-briefing-quick-note">

            <label className="case-obs-briefing-quick-note-label" htmlFor="case-obs-briefing-quick-note">

              Quick note

            </label>

            <textarea

              id="case-obs-briefing-quick-note"

              ref={noteRef}

              className="case-obs-briefing-quick-note-area"

              value={noteDraft}

              onChange={(event) => setNoteDraft(event.target.value)}

              disabled={busy || listening}

              placeholder="What did you just see or hear?"

              aria-label="Quick note"

            />

            <div className="case-obs-briefing-quick-note-actions">

              <button

                type="button"

                className="case-obs-briefing-quick-note-save"

                disabled={busy || listening || !noteDraft.trim()}

                onClick={() => void saveTypedNote()}

              >

                {saving ? "Saving…" : "Save note"}

              </button>

              <button

                type="button"

                className="case-obs-briefing-quick-note-cancel"

                disabled={saving}

                onClick={() => {

                  setNoteOpen(false);

                  setNoteDraft("");

                }}

              >

                Cancel

              </button>

            </div>

          </div>

        )}



        {listening && dictationDraft.trim() ? (

          <div className="case-obs-execute-live" aria-live="polite">

            <p className="case-obs-execute-live-text">{dictationDraft}</p>

          </div>

        ) : null}



        <p className="case-obs-briefing-capture-meta">{OBSERVATION_BRIEFING_DICTATION_HINT}</p>

        <p className="case-obs-briefing-capture-meta">{OBSERVATION_LIVE_NOTES_PHI_REMINDER}</p>

        {dictationError ? <p className="case-obs-execute-error">{dictationError}</p> : null}

        {error ? <p className="case-obs-execute-error">{error}</p> : null}

      </div>

    );

  }



  const isPrimary = variant === "primary";



  return (

    <section

      className={`case-obs-detail-card case-obs-capture-notes${isPrimary ? " case-obs-capture-notes--primary" : ""}`}

      aria-label="Capture notes"

    >

      <style

        dangerouslySetInnerHTML={{

          __html: `${observationCaseExecuteCss}

.case-obs-capture-notes--primary .case-obs-execute-dictate-btn {

  min-height: 64px;

  font-size: 18px;

  border-radius: 14px;

}

.case-obs-capture-notes-title {

  margin: 0 0 8px;

  font-size: 10px;

  font-weight: 800;

  letter-spacing: 0.14em;

  text-transform: uppercase;

  color: color-mix(in srgb, var(--brand-700) 78%, var(--muted));

}

.case-obs-capture-notes-lead {

  margin: 0 0 14px;

  font-size: 13px;

  font-weight: 650;

  line-height: 1.45;

  color: color-mix(in srgb, var(--foreground) 62%, var(--muted));

}`,

        }}

      />

      {showSectionHeader ? (

        <>

          <h2 className="case-obs-capture-notes-title">{OBSERVATION_DETAIL_SECTION_LABELS.captureNotes}</h2>

          <p className="case-obs-capture-notes-lead">

            {fieldExecution

              ? OBSERVATION_BRIEFING_DICTATION_HINT

              : "Speak or type what you observe — notes save to this case."}

          </p>

        </>

      ) : null}



      <div className="case-obs-execute-actions">

        {voiceAvailable ? (

          <button

            type="button"

            className={`case-obs-execute-dictate-btn${listening ? " case-obs-execute-dictate-btn--active" : ""}`}

            disabled={busy || (noteOpen && !listening && !dictationDraft.trim())}

            onClick={() => void handleDictationTap()}

            aria-pressed={listening}

          >

            {dictationButtonLabel(dictationUiState, transcribing, listening)}

          </button>

        ) : null}



        {!noteOpen || listening ? null : (

          <div className="case-obs-execute-note-form">

            <textarea

              ref={noteRef}

              className="case-obs-execute-note-area"

              value={noteDraft}

              onChange={(event) => setNoteDraft(event.target.value)}

              disabled={busy}

              placeholder="What did you just see or hear?"

              aria-label="Observation note"

            />

            <div className="case-obs-execute-note-actions">

              <button

                type="button"

                className="case-obs-execute-save-btn"

                disabled={busy || !noteDraft.trim()}

                onClick={() => void saveTypedNote()}

              >

                {saving ? "Saving…" : "Save note"}

              </button>

              <button

                type="button"

                className="case-obs-execute-cancel-btn"

                disabled={saving}

                onClick={() => {

                  setNoteOpen(false);

                  setNoteDraft("");

                }}

              >

                Cancel

              </button>

            </div>

          </div>

        )}



        {!listening && !noteOpen ? (

          <button

            type="button"

            className="case-obs-execute-type-btn"

            disabled={busy}

            onClick={openTypedNote}

          >

            Quick Note

          </button>

        ) : null}

      </div>



      {listening && dictationDraft.trim() ? (

        <div className="case-obs-execute-live" aria-live="polite">

          <p className="case-obs-execute-live-text">{dictationDraft}</p>

        </div>

      ) : null}



      <p className="case-obs-execute-hint">

        {fieldExecution ? OBSERVATION_BRIEFING_DICTATION_HINT : "Notes save to this case after you tap Save."}

      </p>

      <p className="case-obs-execute-phi">{OBSERVATION_LIVE_NOTES_PHI_REMINDER}</p>

      {dictationError ? <p className="case-obs-execute-error">{dictationError}</p> : null}

      {error ? <p className="case-obs-execute-error">{error}</p> : null}

    </section>

  );

}
