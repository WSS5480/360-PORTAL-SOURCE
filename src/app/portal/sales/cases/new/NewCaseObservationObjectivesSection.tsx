"use client";

import React from "react";
import { sc } from "@/components/sales/salesCommandUi";
import { buildNewCaseUnresolvedProviderSignals } from "@/lib/surgical-sales/buildNewCaseUnresolvedProviderSignals";
import {
  OBSERVATION_OBJECTIVE_CHIP_OPTIONS,
  appendObservationObjectiveChip,
  appendObservationSignalsLine,
  observationObjectivesHasContent,
  type ObservationObjectivesDraft,
} from "@/lib/surgical-sales/observationObjectives";
import type { ObservationValidationTargetHint } from "@/lib/surgical-sales/newSurgicalCasePageLogic";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { missionNextFieldLabelClass } from "@/lib/surgical-sales/resolveMissionNextFieldHighlight";
import { NewCaseCollapsibleSection } from "./NewCaseCollapsibleSection";

const sectionCss = `
.new-case-obs-objectives{display:grid;gap:6px}
.new-case-obs-context-note{margin:0;padding:8px 10px;border-radius:8px;border:1px solid color-mix(in srgb,var(--foreground) 8%,var(--border));background:color-mix(in srgb,var(--surface-2) 35%,var(--surface));font-size:10px;line-height:1.45;color:color-mix(in srgb,var(--foreground) 78%,var(--muted));font-weight:550}
.new-case-obs-objectives-encourage{margin:0;font-size:10px;line-height:1.4;color:var(--brand-700);font-weight:650}
.new-case-obs-field-hint{margin:0;font-size:10px;line-height:1.35;color:var(--muted);font-weight:500}
.new-case-obs-chips{display:flex;flex-wrap:wrap;gap:6px}
.new-case-obs-chip{border:1px solid color-mix(in srgb,var(--foreground) 12%,var(--border));background:color-mix(in srgb,var(--surface-2) 50%,var(--surface));border-radius:999px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;color:var(--foreground);line-height:1.2}
.new-case-obs-chip:hover{border-color:color-mix(in srgb,var(--brand-600) 35%,var(--border));background:color-mix(in srgb,var(--brand-600) 8%,var(--surface))}
.new-case-obs-chip:focus-visible{outline:2px solid color-mix(in srgb,var(--brand-600) 55%,transparent);outline-offset:2px}
.new-case-unresolved-signals{display:grid;gap:5px;padding:5px 0;border-top:1px solid color-mix(in srgb,var(--foreground) 5%,var(--border));background:transparent}
.new-case-unresolved-signals-summary{cursor:pointer;list-style:none;display:grid;gap:4px;padding:0}
.new-case-unresolved-signals-summary::-webkit-details-marker{display:none}
.new-case-unresolved-signals-summary-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 8px}
.new-case-unresolved-signals-title{margin:0;font-size:10px;font-weight:750;color:color-mix(in srgb,var(--foreground) 72%,var(--muted));line-height:1.3}
.new-case-unresolved-signals-count{font-size:10px;line-height:1.25;font-weight:650;color:var(--muted)}
.new-case-unresolved-signals-preview{margin:0;padding:0 0 0 14px;display:grid;gap:2px}
.new-case-unresolved-signals-preview li{font-size:10px;line-height:1.35;color:color-mix(in srgb,var(--foreground) 70%,var(--muted));font-weight:550}
.new-case-unresolved-signals-preview-more{margin:0;padding-left:14px;font-size:10px;line-height:1.3;color:var(--muted);font-weight:550}
.new-case-unresolved-signals-hint{margin:0;font-size:10px;line-height:1.35;color:var(--muted);font-weight:500}
.new-case-unresolved-signals-list{margin:0;padding:0;list-style:none;display:grid;gap:4px}
.new-case-unresolved-signal{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;padding:4px 0;border-top:1px solid color-mix(in srgb,var(--foreground) 5%,var(--border))}
.new-case-unresolved-signal:first-child{border-top:0;padding-top:0}
.new-case-unresolved-signal-select{display:flex;align-items:flex-start;gap:8px;cursor:pointer;flex:1;min-width:0}
.new-case-unresolved-signal-checkbox{margin:1px 0 0;inline-size:14px;block-size:14px;accent-color:var(--brand-600);cursor:pointer}
.new-case-unresolved-signal-text{margin:0;font-size:10px;line-height:1.35;color:color-mix(in srgb,var(--foreground) 82%,var(--muted));font-weight:600;flex:1;min-width:0}
.new-case-unresolved-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.new-case-unresolved-action-primary{font-size:10px;font-weight:750;color:white;background:var(--brand-600);border:1px solid color-mix(in srgb,var(--brand-600) 85%,black);border-radius:999px;padding:4px 9px;cursor:pointer;font-family:inherit;line-height:1.2}
.new-case-unresolved-action-primary:disabled{cursor:not-allowed;opacity:.55}
.new-case-unresolved-action-secondary{font-size:10px;font-weight:700;color:var(--brand-700);background:transparent;border:0;padding:0;cursor:pointer;font-family:inherit;line-height:1.3}
.new-case-unresolved-action-secondary:hover{text-decoration:underline}
.new-case-unresolved-confirm{margin:0;font-size:10px;line-height:1.3;color:#047857;font-weight:700}
.new-case-unresolved-signals-empty{margin:0;font-size:10px;line-height:1.35;color:color-mix(in srgb,var(--foreground) 44%,var(--muted));font-weight:500}
@media (max-width:700px){
  .new-case-obs-chips{gap:5px}
  .new-case-unresolved-signal{align-items:flex-start}
  .new-case-unresolved-signal-select{padding:2px 0}
  .new-case-unresolved-action-primary{min-height:30px}
}`;

export function NewCaseObservationObjectivesSection({
  value,
  onChange,
  providerContact,
  planning,
  providerContextBusy = false,
  onTrackValidationTargets,
  accessReadinessComplete = true,
  highlightPrimaryObjective = false,
  onDismissPrimaryObjectiveHighlight,
}: {
  value: ObservationObjectivesDraft;
  onChange: (next: ObservationObjectivesDraft) => void;
  providerContact?: Record<string, unknown> | null;
  planning?: ProviderPlanningCompletion | null;
  providerContextBusy?: boolean;
  onTrackValidationTargets?: (hints: ObservationValidationTargetHint[]) => void;
  accessReadinessComplete?: boolean;
  highlightPrimaryObjective?: boolean;
  onDismissPrimaryObjectiveHighlight?: () => void;
}) {
  const hasContent = observationObjectivesHasContent(value);

  const unresolvedSignals = React.useMemo(
    () =>
      providerContact && !providerContextBusy
        ? buildNewCaseUnresolvedProviderSignals(providerContact, planning, 5)
        : [],
    [planning, providerContact, providerContextBusy],
  );

  const showUnresolvedSection = Boolean(providerContact) && !providerContextBusy;
  const unresolvedPreview = unresolvedSignals.slice(0, 2);
  const unresolvedOverflow = Math.max(0, unresolvedSignals.length - unresolvedPreview.length);
  const [selectedSignalIds, setSelectedSignalIds] = React.useState<string[]>([]);
  const [carryFeedback, setCarryFeedback] = React.useState("");
  const carryFeedbackTimerRef = React.useRef<number | null>(null);

  const setField = (key: keyof ObservationObjectivesDraft, fieldValue: string) => {
    if (key === "observation_goal") onDismissPrimaryObjectiveHighlight?.();
    onChange({ ...value, [key]: fieldValue });
  };

  const addChip = (chip: string) => {
    onDismissPrimaryObjectiveHighlight?.();
    setField("observation_goal", appendObservationObjectiveChip(value.observation_goal, chip));
    onTrackValidationTargets?.([{ label: chip, source: "chip" }]);
  };

  const setTransientFeedback = React.useCallback((message: string) => {
    if (carryFeedbackTimerRef.current != null) {
      window.clearTimeout(carryFeedbackTimerRef.current);
      carryFeedbackTimerRef.current = null;
    }
    setCarryFeedback(message);
    carryFeedbackTimerRef.current = window.setTimeout(() => {
      setCarryFeedback("");
      carryFeedbackTimerRef.current = null;
    }, 1800);
  }, []);

  const selectedSignals = React.useMemo(
    () => unresolvedSignals.filter((signal) => selectedSignalIds.includes(signal.id)),
    [selectedSignalIds, unresolvedSignals],
  );

  const toggleSignalSelection = React.useCallback((id: string) => {
    setSelectedSignalIds((prev) =>
      prev.includes(id) ? prev.filter((valueId) => valueId !== id) : [...prev, id],
    );
  }, []);

  const carrySelectedSignals = React.useCallback(() => {
    if (selectedSignals.length === 0) return;
    let next = value.observation_signals_to_validate;
    for (const signal of selectedSignals) {
      next = appendObservationSignalsLine(next, signal.text);
    }
    setField("observation_signals_to_validate", next);
    setSelectedSignalIds([]);
    onTrackValidationTargets?.(
      selectedSignals.map((signal) => ({ label: signal.text, source: "provider_signal" })),
    );
    setTransientFeedback(
      selectedSignals.length === 1
        ? "1 signal added to objectives."
        : `${selectedSignals.length} signals added to objectives.`,
    );
  }, [
    onTrackValidationTargets,
    selectedSignals,
    setField,
    setTransientFeedback,
    value.observation_signals_to_validate,
  ]);

  const carryAllSignals = React.useCallback(() => {
    if (unresolvedSignals.length === 0) return;
    let next = value.observation_signals_to_validate;
    for (const signal of unresolvedSignals) {
      next = appendObservationSignalsLine(next, signal.text);
    }
    setField("observation_signals_to_validate", next);
    setSelectedSignalIds([]);
    onTrackValidationTargets?.(
      unresolvedSignals.map((signal) => ({ label: signal.text, source: "provider_signal" })),
    );
    setTransientFeedback(
      unresolvedSignals.length === 1
        ? "1 signal added to objectives."
        : `${unresolvedSignals.length} signals added to objectives.`,
    );
  }, [
    onTrackValidationTargets,
    setField,
    setTransientFeedback,
    unresolvedSignals,
    value.observation_signals_to_validate,
  ]);

  React.useEffect(() => {
    setSelectedSignalIds((prev) => prev.filter((id) => unresolvedSignals.some((signal) => signal.id === id)));
  }, [unresolvedSignals]);

  React.useEffect(() => {
    return () => {
      if (carryFeedbackTimerRef.current != null) {
        window.clearTimeout(carryFeedbackTimerRef.current);
      }
    };
  }, []);

  const signalAlreadyCarried = React.useCallback(
    (signalText: string) => {
      const haystack = value.observation_signals_to_validate.toLowerCase();
      const needle = signalText.trim().toLowerCase();
      return Boolean(needle && haystack.includes(needle));
    },
    [value.observation_signals_to_validate],
  );

  return (
    <section className="new-case-section new-case-obs-objectives" aria-labelledby="new-case-obs-objectives-title">
      <style dangerouslySetInnerHTML={{ __html: sectionCss }} />
      <div>
        <h3 id="new-case-obs-objectives-title" className="new-case-title">
          Observation objectives
        </h3>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>
          These objectives guide post-case intelligence extraction and workflow validation.
        </p>
        {!hasContent ? (
          <p className="new-case-obs-objectives-encourage">Helps structure live notes and post-case debrief.</p>
        ) : null}
      </div>

      {!accessReadinessComplete ? (
        <p className="new-case-obs-context-note" role="note">
          Observation goals can be added while operational details continue evolving. Scheduling, access
          pathway, and credentialing can still be refined in Access & scheduling.
        </p>
      ) : null}

      <label
        className={missionNextFieldLabelClass(highlightPrimaryObjective)}
        {...(highlightPrimaryObjective ? { "data-next-field-highlight": "observation_goal" } : {})}
        style={{ display: "grid", gap: 5 }}
      >
        <span style={{ fontWeight: 700, fontSize: 12 }}>Primary observation objective</span>
        <div className="new-case-obs-chips" role="group" aria-label="Objective examples">
          {OBSERVATION_OBJECTIVE_CHIP_OPTIONS.map((chip) => (
            <button key={chip} type="button" className="new-case-obs-chip" onClick={() => addChip(chip)}>
              {chip}
            </button>
          ))}
        </div>
        <p id="new-case-obs-goal-hint" className="new-case-obs-field-hint">
          What should we know after this case that we do not know today?
        </p>
        <textarea
          value={value.observation_goal}
          onChange={(e) => setField("observation_goal", e.target.value)}
          rows={2}
          placeholder="e.g. workflow fit, access path, technique gaps to confirm in the room"
          style={{ ...sc.input, resize: "vertical" }}
          aria-describedby="new-case-obs-goal-hint"
        />
      </label>

      {showUnresolvedSection && unresolvedSignals.length > 0 ? (
        <details className="new-case-unresolved-signals">
          <summary className="new-case-unresolved-signals-summary" aria-label="Known unresolved signals">
            <div className="new-case-unresolved-signals-summary-head">
              <p className="new-case-unresolved-signals-title">Known unresolved signals</p>
              <span className="new-case-unresolved-signals-count">{unresolvedSignals.length}</span>
            </div>
            <ul className="new-case-unresolved-signals-preview">
              {unresolvedPreview.map((signal) => (
                <li key={`preview:${signal.id}`}>{signal.text}</li>
              ))}
            </ul>
            {unresolvedOverflow > 0 ? (
              <p className="new-case-unresolved-signals-preview-more">+{unresolvedOverflow} more</p>
            ) : null}
          </summary>
          <p className="new-case-unresolved-signals-hint">
            From the provider profile — carry what you want to validate in the room.
          </p>
          <ul className="new-case-unresolved-signals-list">
            {unresolvedSignals.map((signal) => {
              const carried = signalAlreadyCarried(signal.text);
              const selected = selectedSignalIds.includes(signal.id);
              return (
                <li key={signal.id} className="new-case-unresolved-signal">
                  <label className="new-case-unresolved-signal-select">
                    <input
                      type="checkbox"
                      className="new-case-unresolved-signal-checkbox"
                      checked={selected}
                      disabled={carried}
                      onChange={() => toggleSignalSelection(signal.id)}
                    />
                    <p className="new-case-unresolved-signal-text">{signal.text}</p>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="new-case-unresolved-actions">
            <button
              type="button"
              className="new-case-unresolved-action-primary"
              disabled={selectedSignals.length === 0}
              onClick={carrySelectedSignals}
            >
              Carry selected into objectives
            </button>
            <button
              type="button"
              className="new-case-unresolved-action-secondary"
              onClick={carryAllSignals}
            >
              Carry all
            </button>
            {carryFeedback ? (
              <p className="new-case-unresolved-confirm" role="status" aria-live="polite">
                {carryFeedback}
              </p>
            ) : null}
          </div>
        </details>
      ) : null}

      {showUnresolvedSection && unresolvedSignals.length === 0 ? (
        <p className="new-case-unresolved-signals-empty">No unresolved provider signals found.</p>
      ) : null}

      <NewCaseCollapsibleSection
        title="More objectives (optional)"
        hint="Questions and signals to validate"
        defaultOpen={Boolean(value.observation_key_questions.trim() || value.observation_signals_to_validate.trim())}
      >
        <label style={{ display: "grid", gap: 5 }}>
          <span style={{ fontWeight: 700, fontSize: 12 }}>Key questions to answer</span>
          <textarea
            value={value.observation_key_questions}
            onChange={(e) => setField("observation_key_questions", e.target.value)}
            rows={2}
            placeholder="Add follow-up questions for debrief if needed"
            style={{ ...sc.input, resize: "vertical" }}
          />
        </label>
        <label style={{ display: "grid", gap: 5 }}>
          <span style={{ fontWeight: 700, fontSize: 12 }}>Known signals to validate</span>
          <textarea
            value={value.observation_signals_to_validate}
            onChange={(e) => setField("observation_signals_to_validate", e.target.value)}
            rows={2}
            placeholder="Early interest, workflow friction, product gap, access concern..."
            style={{ ...sc.input, resize: "vertical" }}
          />
        </label>
      </NewCaseCollapsibleSection>
    </section>
  );
}
