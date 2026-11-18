"use client";

import React from "react";
import { isVoiceCaptureAvailable, salesDictationOptions, useSpeechDictation } from "@/hooks/useSpeechDictation";
import { buildProductSupportFieldNoteTimeline } from "@/lib/surgical-sales/buildProductSupportFieldNoteTimeline";
import type { ProductSupportCaptureFeedbackResult } from "@/lib/surgical-sales/productSupportCaptureFeedback";
import { CaseFieldNoteList } from "./CaseFieldNoteList";
import { observationFieldExecutionCss } from "./observationFieldExecutionCss";
import {
  PRODUCT_SUPPORT_CAPTURE_HINT,
  PRODUCT_SUPPORT_DETAIL_SECTION_LABELS,
  PRODUCT_SUPPORT_FIELD_NOTES_LEAD,
  PRODUCT_SUPPORT_LIVE_NOTES_PHI_REMINDER,
} from "@/lib/surgical-sales/productSupportCaseDetailVocabulary";
import { productSupportCaseBriefingCss } from "./productSupportCaseBriefingCss";
import { userFacingError } from "@/lib/errors/userFacingError";

function dictationButtonLabel(state: string, transcribing: boolean, listening: boolean): string {
  if (transcribing) return "Transcribing…";
  if (listening) return "Listening… Tap to save";
  if (state === "paused") return "Paused — Tap to save";
  if (state === "error") return "Retry dictation";
  return "Start Dictation";
}

export function ProductSupportCaseFieldNotes({
  activities,
  defaultActor,
  disabled,
  onSaveNote,
  onDeleteNote,
}: {
  activities?: Array<{
    id: string;
    activity_type: string;
    body: string;
    metadata_json?: Record<string, unknown>;
    created_at: string;
    actor_display_name?: string;
  }>;
  defaultActor?: string;
  disabled?: boolean;
  onSaveNote: (
    body: string,
    captureMode?: "voice" | "quick",
  ) => Promise<void | ProductSupportCaptureFeedbackResult>;
  onDeleteNote?: (noteId: string) => Promise<void>;
}) {
  const noteRef = React.useRef<HTMLTextAreaElement>(null);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [dictationDraft, setDictationDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [noteSaved, setNoteSaved] = React.useState(false);
  const [captureFeedback, setCaptureFeedback] = React.useState<ProductSupportCaptureFeedbackResult | null>(null);

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

  const timeline = React.useMemo(
    () => buildProductSupportFieldNoteTimeline(activities, defaultActor ?? "Rep"),
    [activities, defaultActor],
  );

  async function persistNote(body: string, captureMode: "voice" | "quick") {
    const trimmed = body.trim();
    if (!trimmed || busy) return false;
    setSaving(true);
    setError(null);
    setNoteSaved(false);
    setCaptureFeedback(null);
    try {
      const result = await onSaveNote(trimmed, captureMode);
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
    setDictationDraft("");
    startDictation("");
  }

  async function saveQuickNote() {
    const saved = await persistNote(noteDraft, "quick");
    if (saved) setNoteDraft("");
  }

  return (
    <div className="case-ps-field-notes-stack">
      <style dangerouslySetInnerHTML={{ __html: `${productSupportCaseBriefingCss}\n${observationFieldExecutionCss}` }} />

      <section className="case-ps-field-notes-capture" aria-label={PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.fieldNotes}>
        <p className="case-ps-field-notes-meta">{PRODUCT_SUPPORT_FIELD_NOTES_LEAD}</p>

        <button
          type="button"
          className="case-ps-briefing-dictate-btn"
          disabled={busy || !voiceAvailable}
          onClick={() => void handleDictationTap()}
          aria-pressed={listening}
        >
          {dictationButtonLabel(dictationUiState, transcribing, listening)}
        </button>

        {!voiceAvailable ? (
          <p className="case-ps-field-notes-meta">Voice dictation is not available in this browser.</p>
        ) : null}

        <p className="case-ps-field-notes-or" aria-hidden>
          OR
        </p>

        <div className="case-ps-field-notes-quick">
          <label className="case-ps-field-notes-meta" htmlFor="case-ps-field-notes-quick">
            Quick note
          </label>
          <textarea
            id="case-ps-field-notes-quick"
            ref={noteRef}
            className="case-ps-field-notes-area"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            disabled={busy || listening}
            placeholder="What did you just see or hear?"
            aria-label="Quick note"
          />
          <button
            type="button"
            className="case-ps-field-notes-save"
            disabled={busy || listening || !noteDraft.trim()}
            onClick={() => void saveQuickNote()}
          >
            {saving ? "Saving…" : "Save note"}
          </button>
        </div>

        <p className="case-ps-field-notes-meta">{PRODUCT_SUPPORT_CAPTURE_HINT}</p>
        <p className="case-ps-field-notes-meta">{PRODUCT_SUPPORT_LIVE_NOTES_PHI_REMINDER}</p>
        {dictationError ? <p className="case-ps-field-notes-meta" style={{ color: "var(--danger)" }}>{dictationError}</p> : null}
        {error ? <p className="case-ps-field-notes-meta" style={{ color: "var(--danger)" }}>{error}</p> : null}
        {noteSaved ? (
          <p className="case-obs-capture-saved" data-testid="case-ps-note-saved" role="status" aria-live="polite">
            Note saved.
          </p>
        ) : null}
        {captureFeedback?.status === "chips" &&
        (captureFeedback.outcomes.length > 0 || captureFeedback.findings.length > 0) ? (
          <div className="case-obs-capture-feedback" data-testid="case-ps-capture-feedback" aria-live="polite">
            {captureFeedback.outcomes.length > 0 ? (
              <>
                <p className="case-obs-capture-feedback-title">Outcomes</p>
                <ul className="case-ps-capture-outcome-list" aria-label="Documented outcomes from this note">
                  {captureFeedback.outcomes.map((item) => (
                    <li key={item.id} className="case-ps-capture-outcome-badge">
                      {item.text}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {captureFeedback.findings.length > 0 ? (
              <>
                <p className="case-obs-capture-feedback-title">Captured findings</p>
                <ul className="case-ps-capture-finding-list" aria-label="Findings captured from this note">
                  {captureFeedback.findings.map((item) => (
                    <li key={item.id} className="case-ps-capture-finding-item">
                      {item.text}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <p className="case-ps-field-notes-meta">Full details are on the Intelligence tab. Adjust outcomes on Follow-Up.</p>
          </div>
        ) : null}
        {captureFeedback?.status === "deferred" ? (
          <p
            className="case-obs-capture-feedback-deferred case-ps-field-notes-meta"
            data-testid="case-ps-capture-feedback-deferred"
            aria-live="polite"
          >
            {captureFeedback.message}
          </p>
        ) : null}
        {listening && dictationDraft.trim() ? (
          <p className="case-ps-field-notes-body" aria-live="polite">
            {dictationDraft}
          </p>
        ) : null}
      </section>

      <section aria-label="Note timeline">
        {timeline.length > 0 ? (
          <div className="case-ps-field-notes-timeline">
            <CaseFieldNoteList
              entries={timeline}
              disabled={disabled}
              onDeleteNote={onDeleteNote}
              itemClassName="case-ps-field-notes-item"
              timeClassName="case-ps-field-notes-time"
              bodyClassName="case-ps-field-notes-body"
            />
          </div>
        ) : (
          <p className="case-ps-field-notes-meta">No notes yet — start dictation or add a quick note.</p>
        )}
      </section>
    </div>
  );
}
