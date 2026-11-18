"use client";

import React from "react";
import { isVoiceCaptureAvailable, salesDictationOptions, useSpeechDictation } from "@/hooks/useSpeechDictation";
import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import {
  buildObservationCaseDayModeView,
  OBSERVATION_CASE_DAY_MODE_LEAD,
  OBSERVATION_CASE_DAY_MODE_SECTIONS,
  OBSERVATION_CASE_DAY_MODE_TITLE,
} from "@/lib/surgical-sales/observationCaseDayMode";
import {
  observationLiveFieldCapturePatch,
  type ObservationLiveCaptureField,
} from "@/lib/surgical-sales/observationLiveFieldCapture";
import { OBSERVATION_LIVE_NOTES_PHI_REMINDER } from "@/lib/surgical-sales/observationCaseDetailVocabulary";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { ObservationCaseIntelligenceTimeline } from "./ObservationCaseIntelligenceTimeline";
import { ObservationCaseMissionBriefing } from "./ObservationCaseMissionBriefing";
import { ObservationCaseMissionProgress } from "./ObservationCaseMissionProgress";
import { patchObservationCase } from "./caseObservationPatch";
import { observationCaseDayModeCss } from "./observationCaseDayModeCss";
import { observationCaseExecuteCss } from "./observationCaseExecuteCss";
import { userFacingError } from "@/lib/errors/userFacingError";

type DayModeActivity = {
  id: string;
  activity_type: string;
  body: string;
  created_at: string;
  metadata_json?: Record<string, unknown> | null;
  actor_display_name?: string;
};

type QuickCaptureKind = "product" | "competitor" | "pain";

const QUICK_CAPTURE_CONFIG: Record<
  QuickCaptureKind,
  { label: string; field: ObservationLiveCaptureField; placeholder: string; buttonLabel: string }
> = {
  product: {
    label: "Log Product Seen",
    field: "live_observation_product_fit",
    placeholder: "Product name or tray seen in the OR",
    buttonLabel: "Save product",
  },
  competitor: {
    label: "Log Competitor Product",
    field: "live_observation_competitors",
    placeholder: "Competitor product or vendor seen",
    buttonLabel: "Save competitor",
  },
  pain: {
    label: "Capture Pain Point",
    field: "live_observation_clinical_pain_points",
    placeholder: "Clinical or workflow pain observed",
    buttonLabel: "Save pain point",
  },
};

function dictationButtonLabel(state: string, transcribing: boolean, listening: boolean): string {
  if (transcribing) return "Transcribing…";
  if (listening) return "Listening… Tap to save";
  if (state === "paused") return "Paused — Tap to save";
  if (state === "error") return "Retry dictation";
  return "Start dictation";
}

export function ObservationCaseDayMode({
  caseId,
  caseRow,
  identity,
  engagement,
  activities,
  providerContact,
  providerIntelligence,
  planning,
  disabled,
  onSaveNote,
  onCasePatched,
  onExit,
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  identity: CaseIdentity;
  engagement?: Record<string, unknown> | null;
  activities?: DayModeActivity[];
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  planning?: ProviderPlanningCompletion | null;
  providerId: string | null;
  providerName: string;
  hasLinkedProvider: boolean;
  disabled?: boolean;
  onSaveNote: (body: string) => Promise<void>;
  onCasePatched: (savedCase: Record<string, unknown>) => void;
  onExit: () => void;
}) {
  const view = React.useMemo(
    () =>
      buildObservationCaseDayModeView({
        caseRow,
        identity,
        engagement,
        activities,
        providerContact,
        providerIntelligence,
        planning,
      }),
    [activities, caseRow, engagement, identity, planning, providerContact, providerIntelligence],
  );

  const noteRef = React.useRef<HTMLTextAreaElement>(null);
  const quickInputRef = React.useRef<HTMLInputElement>(null);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [dictationDraft, setDictationDraft] = React.useState("");
  const [activeQuickCapture, setActiveQuickCapture] = React.useState<QuickCaptureKind | null>(null);
  const [quickDraft, setQuickDraft] = React.useState("");
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
        setNoteOpen(false);
      }
      return;
    }

    setActiveQuickCapture(null);
    setQuickDraft("");
    setDictationDraft("");
    setNoteOpen(true);
    startDictation("");
  }

  function openTypedNote() {
    if (busy || listening) return;
    setActiveQuickCapture(null);
    setQuickDraft("");
    setNoteOpen(true);
    setNoteDraft("");
    window.setTimeout(() => noteRef.current?.focus(), 0);
  }

  async function saveTypedNote() {
    const saved = await persistObservation(noteDraft);
    if (saved) {
      setNoteDraft("");
      setNoteOpen(false);
    }
  }

  function openQuickCapture(kind: QuickCaptureKind) {
    if (busy || listening) return;
    setNoteOpen(false);
    setNoteDraft("");
    setActiveQuickCapture(kind);
    setQuickDraft("");
    window.setTimeout(() => quickInputRef.current?.focus(), 0);
  }

  async function saveQuickCapture() {
    if (!activeQuickCapture || busy) return;
    const config = QUICK_CAPTURE_CONFIG[activeQuickCapture];
    const trimmed = quickDraft.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    try {
      const savedCase = await patchObservationCase(
        caseId,
        observationLiveFieldCapturePatch(config.field, trimmed, caseRow),
      );
      onCasePatched(savedCase);
      setQuickDraft("");
      setActiveQuickCapture(null);
    } catch (caught: unknown) {
      setError(userFacingError(caught, "Could not save signal"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="case-obs-day-mode" aria-label={OBSERVATION_CASE_DAY_MODE_TITLE}>
      <style
        dangerouslySetInnerHTML={{ __html: `${observationCaseDayModeCss}\n${observationCaseExecuteCss}` }}
      />

      <header className="case-obs-day-mode-hero">
        <p className="case-obs-day-mode-kicker">Live observation</p>
        <h2 className="case-obs-day-mode-title">{OBSERVATION_CASE_DAY_MODE_TITLE}</h2>
        <p className="case-obs-day-mode-context">
          {view.providerName} · {view.facilityName} · {view.dateLabel}
        </p>
        <p className="case-obs-day-mode-hint">{OBSERVATION_CASE_DAY_MODE_LEAD}</p>
        <button type="button" className="case-obs-day-mode-cancel-btn" disabled={busy} onClick={onExit}>
          Exit to planning view
        </button>
      </header>

      <ObservationCaseMissionProgress caseRow={caseRow} compact />

      <section className="case-obs-day-mode-section" aria-label={OBSERVATION_CASE_DAY_MODE_SECTIONS.todayMission}>
        <h3 className="case-obs-day-mode-section-title">
          {OBSERVATION_CASE_DAY_MODE_SECTIONS.todayMission}
        </h3>
        <p className="case-obs-day-mode-mission-text">{view.todayMission}</p>
      </section>

      <section
        className="case-obs-day-mode-section"
        aria-label={OBSERVATION_CASE_DAY_MODE_SECTIONS.intelligenceStillMissing}
      >
        <h3 className="case-obs-day-mode-section-title">
          {OBSERVATION_CASE_DAY_MODE_SECTIONS.intelligenceStillMissing}
        </h3>
        {view.intelligenceStillMissing.length > 0 ? (
          <ul className="case-obs-day-mode-missing-list">
            {view.intelligenceStillMissing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="case-obs-day-mode-empty">
            Briefing targets are covered — keep watching for anything that changes your read.
          </p>
        )}
      </section>

      <section
        className="case-obs-day-mode-section case-obs-day-mode-section--watch"
        aria-label={OBSERVATION_CASE_DAY_MODE_SECTIONS.nextThingToWatchFor}
      >
        <h3 className="case-obs-day-mode-section-title">
          {OBSERVATION_CASE_DAY_MODE_SECTIONS.nextThingToWatchFor}
        </h3>
        {view.nextThingToWatchFor ? (
          <p className="case-obs-day-mode-watch-next">{view.nextThingToWatchFor}</p>
        ) : (
          <p className="case-obs-day-mode-empty">
            No watch target briefed — focus on workflow, products, and competitors.
          </p>
        )}
      </section>

      <section
        className="case-obs-day-mode-section"
        aria-label={OBSERVATION_CASE_DAY_MODE_SECTIONS.quickCapture}
      >
        <h3 className="case-obs-day-mode-section-title">
          {OBSERVATION_CASE_DAY_MODE_SECTIONS.quickCapture}
        </h3>
        <div className="case-obs-day-mode-actions">
          <button
            type="button"
            className={`case-obs-day-mode-action case-obs-day-mode-action--primary${noteOpen || listening ? " case-obs-day-mode-action--active" : ""}`}
            disabled={busy}
            onClick={() => (voiceAvailable ? void handleDictationTap() : openTypedNote())}
          >
            Capture Observation Note
          </button>
          <button
            type="button"
            className={`case-obs-day-mode-action${activeQuickCapture === "product" ? " case-obs-day-mode-action--active" : ""}`}
            disabled={busy}
            onClick={() => openQuickCapture("product")}
          >
            Log Product Seen
          </button>
          <button
            type="button"
            className={`case-obs-day-mode-action${activeQuickCapture === "competitor" ? " case-obs-day-mode-action--active" : ""}`}
            disabled={busy}
            onClick={() => openQuickCapture("competitor")}
          >
            Log Competitor Product
          </button>
          <button
            type="button"
            className={`case-obs-day-mode-action${activeQuickCapture === "pain" ? " case-obs-day-mode-action--active" : ""}`}
            disabled={busy}
            onClick={() => openQuickCapture("pain")}
          >
            Capture Pain Point
          </button>
        </div>
      </section>

      <section
        className="case-obs-day-mode-section case-obs-day-mode-section--coaching"
        aria-label={OBSERVATION_CASE_DAY_MODE_SECTIONS.liveCoaching}
      >
        <h3 className="case-obs-day-mode-section-title">
          {OBSERVATION_CASE_DAY_MODE_SECTIONS.liveCoaching}
        </h3>
        <p className="case-obs-day-mode-coaching-text">{view.liveCoachingPrompt}</p>

        {noteOpen ? (
          <div className="case-obs-day-mode-panel case-obs-day-mode-panel--open" aria-label="Observation note">
            <h4 className="case-obs-day-mode-panel-title">Observation note</h4>
            {voiceAvailable ? (
              <button
                type="button"
                className={`case-obs-execute-dictate-btn${listening ? " case-obs-execute-dictate-btn--active" : ""}`}
                disabled={busy}
                onClick={() => void handleDictationTap()}
                aria-pressed={listening}
              >
                {dictationButtonLabel(dictationUiState, transcribing, listening)}
              </button>
            ) : null}
            {!listening ? (
              <div className="case-obs-day-mode-note-form">
                <textarea
                  ref={noteRef}
                  className="case-obs-day-mode-note-area"
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  disabled={busy}
                  placeholder="What did you just see or hear?"
                  aria-label="Observation note"
                />
                <div className="case-obs-day-mode-note-actions">
                  <button
                    type="button"
                    className="case-obs-day-mode-save-btn"
                    disabled={busy || !noteDraft.trim()}
                    onClick={() => void saveTypedNote()}
                  >
                    {saving ? "Saving…" : "Save note"}
                  </button>
                  <button
                    type="button"
                    className="case-obs-day-mode-cancel-btn"
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
            ) : null}
            {listening && dictationDraft.trim() ? (
              <div className="case-obs-day-mode-live" aria-live="polite">
                <p className="case-obs-day-mode-live-text">{dictationDraft}</p>
              </div>
            ) : null}
            <p className="case-obs-day-mode-hint">Notes are classified automatically after you save.</p>
            <p className="case-obs-day-mode-phi">{OBSERVATION_LIVE_NOTES_PHI_REMINDER}</p>
          </div>
        ) : null}

        {activeQuickCapture ? (
          <div
            className="case-obs-day-mode-panel case-obs-day-mode-panel--open"
            aria-label={QUICK_CAPTURE_CONFIG[activeQuickCapture].label}
          >
            <h4 className="case-obs-day-mode-panel-title">
              {QUICK_CAPTURE_CONFIG[activeQuickCapture].label}
            </h4>
            <div className="case-obs-day-mode-quick-form">
              <input
                ref={quickInputRef}
                className="case-obs-day-mode-quick-input"
                value={quickDraft}
                onChange={(event) => setQuickDraft(event.target.value)}
                disabled={busy}
                placeholder={QUICK_CAPTURE_CONFIG[activeQuickCapture].placeholder}
                aria-label={QUICK_CAPTURE_CONFIG[activeQuickCapture].label}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveQuickCapture();
                  }
                }}
              />
              <div className="case-obs-day-mode-note-actions">
                <button
                  type="button"
                  className="case-obs-day-mode-save-btn"
                  disabled={busy || !quickDraft.trim()}
                  onClick={() => void saveQuickCapture()}
                >
                  {saving ? "Saving…" : QUICK_CAPTURE_CONFIG[activeQuickCapture].buttonLabel}
                </button>
                <button
                  type="button"
                  className="case-obs-day-mode-cancel-btn"
                  disabled={saving}
                  onClick={() => {
                    setActiveQuickCapture(null);
                    setQuickDraft("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {dictationError ? <p className="case-obs-day-mode-error">{dictationError}</p> : null}
        {error ? <p className="case-obs-day-mode-error">{error}</p> : null}

        <ObservationCaseIntelligenceTimeline
          activities={activities}
          caseRow={caseRow}
          limit={5}
          hideTitle
          emptyMessage="No notes yet — capture your first observation above."
        />
      </section>

      <details className="case-obs-day-mode-planning-collapse">
        <summary>Planning brief (collapsed)</summary>
        <div className="case-obs-day-mode-planning-body">
          <ObservationCaseMissionBriefing
            caseId={caseId}
            caseRow={caseRow}
            identity={identity}
            engagement={engagement}
            activities={activities}
            providerContact={providerContact}
            providerIntelligence={providerIntelligence}
            planning={planning}
            compact
            disabled={disabled}
          />
        </div>
      </details>
    </div>
  );
}
