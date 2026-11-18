"use client";

import React from "react";
import { createPortal } from "react-dom";
import { isVoiceCaptureAvailable, salesDictationOptions, useSpeechDictation } from "@/hooks/useSpeechDictation";
import {
  intelligenceCaptureCategoryDef,
  type IntelligenceCaptureCategoryId,
} from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { INTELLIGENCE_CAPTURE_FINDING_UI } from "@/lib/surgical-sales/intelligenceCapture/mapCategoryFinding";
import { INTELLIGENCE_CAPTURE_FLOW_UI } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureMethods";
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
import { providerQuickSignalCaptureCss } from "./providerQuickSignalCaptureCss";
import { userFacingError } from "@/lib/errors/userFacingError";

export function ProviderIntelligenceGapNoteDrawer({
  open,
  providerId,
  categoryId,
  title,
  hint,
  onClose,
  onSaved,
}: {
  open: boolean;
  providerId: string;
  categoryId: IntelligenceCaptureCategoryId;
  title: string;
  hint?: string | null;
  onClose: () => void;
  onSaved: (provider: Record<string, unknown>) => void | Promise<void>;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState<string | null>(null);
  const [dictationCaptured, setDictationCaptured] = React.useState(false);

  const category = intelligenceCaptureCategoryDef(categoryId);
  const voiceAvailable = isVoiceCaptureAvailable();

  const dictation = useSpeechDictation(setNote, salesDictationOptions({ onDictationCaptured: () => setDictationCaptured(true) }));

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    setNote("");
    setError(null);
    setConfirmation(null);
    setDictationCaptured(false);
  }, [open, categoryId]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

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

  async function handleSave() {
    const finding = note.trim();
    if (!finding || busy) return;
    setBusy(true);
    setError(null);
    setConfirmation(null);
    try {
      const res = await fetch(
        `/api/portal/sales/providers/${encodeURIComponent(providerId)}/intelligence-capture/finding`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId, finding }),
        },
      );
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        confirmationMessage?: string;
        provider?: Record<string, unknown>;
      };
      if (!res.ok || !j.ok) {
        throw new Error(j.error ?? "");
      }
      if (j.provider) {
        await onSaved(j.provider);
      }
      onClose();
    } catch (e: unknown) {
      setError(userFacingError(e, "Could not save that note."));
    } finally {
      setBusy(false);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <style>{providerQuickSignalCaptureCss}</style>
      <div
        className="provider-intel-quick-signal-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="provider-intel-quick-signal-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="provider-intel-gap-note-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="provider-intel-quick-signal-head">
            <div className="provider-intel-quick-signal-head-row">
              <h2 id="provider-intel-gap-note-title" className="provider-intel-quick-signal-title">
                {title}
              </h2>
              <button
                type="button"
                className="provider-intel-quick-signal-close"
                aria-label="Close"
                onClick={onClose}
              >
                ×
              </button>
            </div>
            <p className="provider-intel-quick-signal-kicker">
              {hint ??
                `Quick note for ${category.name}. We place it in the right intelligence area when you save.`}
            </p>
          </header>

          <div className="provider-intel-quick-signal-body">
            <div className="provider-intel-gap-note-voice">
              <button
                type="button"
                className={`provider-intel-gap-note-mic${
                  dictation.dictating ? " provider-intel-gap-note-mic--active" : ""
                }`}
                disabled={busy || dictation.transcribing}
                onClick={() => {
                  if (dictation.dictating) {
                    dictation.stopDictation();
                    return;
                  }
                  if (dictation.dictationPaused) {
                    dictation.resumeDictation(note);
                    return;
                  }
                  dictation.startDictation(note);
                }}
                aria-label={micLabel}
              >
                🎙
              </button>
              <div className="provider-intel-gap-note-voice-meta">
                <span>{voiceStatus}</span>
                {!voiceAvailable ? (
                  <span className="provider-intel-gap-note-voice-muted">{LOG_UPDATE_VOICE_UNAVAILABLE}</span>
                ) : null}
                {dictationCaptured ? (
                  <span className="provider-intel-gap-note-voice-captured">{LOG_UPDATE_DICTATION_CAPTURED}</span>
                ) : null}
                {dictation.dictationError ? (
                  <span className="provider-intel-gap-note-voice-error" role="alert">
                    {dictation.dictationError}
                  </span>
                ) : null}
              </div>
              {dictation.dictating ? (
                <button
                  type="button"
                  className="provider-intel-gap-note-voice-pause"
                  disabled={busy}
                  onClick={() => dictation.pauseDictation(note)}
                >
                  {LOG_UPDATE_VOICE_PAUSE}
                </button>
              ) : null}
            </div>

            <label className="provider-intel-quick-signal-field-label" htmlFor="provider-intel-gap-note-input">
              {INTELLIGENCE_CAPTURE_FINDING_UI.inputLabel}
            </label>
            <textarea
              id="provider-intel-gap-note-input"
              className="provider-intel-notes-input provider-intel-notes-input--rapid"
              rows={6}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={INTELLIGENCE_CAPTURE_FLOW_UI.freeformPlaceholder}
              disabled={busy}
              autoFocus
            />
            {confirmation ? (
              <p className="provider-intel-quick-signal-helper" role="status">
                {confirmation}
              </p>
            ) : null}
            {error ? (
              <p className="provider-intel-quick-signal-helper provider-intel-gap-note-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <footer className="provider-intel-quick-signal-foot">
            <button
              type="button"
              className="provider-intel-quick-signal-cancel"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="provider-intel-quick-signal-save"
              onClick={() => void handleSave()}
              disabled={busy || !note.trim()}
            >
              {busy ? INTELLIGENCE_CAPTURE_FINDING_UI.savingFinding : INTELLIGENCE_CAPTURE_FINDING_UI.saveFinding}
            </button>
          </footer>
        </div>
      </div>
    </>,
    document.body,
  );
}
