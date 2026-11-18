"use client";

import React from "react";
import type { ObservationMissionBriefingPillarId } from "@/lib/surgical-sales/buildObservationMissionBriefing";
import {
  briefingSuggestionApplyLabel,
  buildObservationBriefingSuggestions,
} from "@/lib/surgical-sales/buildObservationBriefingSuggestions";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  applyObservationBriefingSuggestion,
  observationBriefingDraftValue,
  observationBriefingPatchForDraft,
  observationBriefingSectionConfig,
} from "@/lib/surgical-sales/observationBriefingSections";
import { patchObservationCase } from "./caseObservationPatch";
import { observationBriefingSectionEditorCss } from "./observationBriefingSectionEditorCss";
import { userFacingError } from "@/lib/errors/userFacingError";

export function ObservationBriefingSectionEditor({
  caseId,
  pillarId,
  caseRow,
  engagement,
  providerContact,
  providerIntelligence,
  planning,
  procedureLabel,
  disabled,
  onClose,
  onSaved,
}: {
  caseId: string;
  pillarId: ObservationMissionBriefingPillarId;
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  planning?: ProviderPlanningCompletion | null;
  procedureLabel?: string | null;
  disabled?: boolean;
  onClose: () => void;
  onSaved: (savedCase: Record<string, unknown>) => void;
}) {
  const section = observationBriefingSectionConfig(pillarId);
  const [draft, setDraft] = React.useState(() =>
    observationBriefingDraftValue(pillarId, caseRow, engagement, {
      providerContact,
      providerIntelligence,
      planning,
      procedureLabel,
    }),
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDraft(
      observationBriefingDraftValue(pillarId, caseRow, engagement, {
        providerContact,
        providerIntelligence,
        planning,
        procedureLabel,
      }),
    );
    setError(null);
  }, [caseRow, engagement, pillarId, planning, procedureLabel, providerContact, providerIntelligence]);

  const suggestions = React.useMemo(
    () =>
      buildObservationBriefingSuggestions({
        pillarId,
        caseRow,
        engagement,
        providerContact,
        providerIntelligence,
        planning,
        procedureLabel,
      }),
    [caseRow, engagement, pillarId, planning, procedureLabel, providerContact, providerIntelligence],
  );

  const applySuggestion = React.useCallback(
    (text: string) => {
      const actionLabel = briefingSuggestionApplyLabel(draft, text);
      const resolvedMode = !draft.trim() || actionLabel === "Apply" ? "replace" : "insert";
      setDraft((current) => applyObservationBriefingSuggestion(pillarId, current, text, resolvedMode));
    },
    [draft, pillarId],
  );

  const applyCombinedSuggestion = React.useCallback(() => {
    const text = suggestions.combinedText ?? suggestions.items[0]?.text;
    if (!text) return;
    setDraft(text);
  }, [suggestions.combinedText, suggestions.items]);

  const save = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const savedCase = await patchObservationCase(caseId, observationBriefingPatchForDraft(pillarId, draft));
      onSaved(savedCase);
      onClose();
    } catch (e: unknown) {
      setError(userFacingError(e, "Could not save briefing section"));
    } finally {
      setBusy(false);
    }
  }, [caseId, draft, onClose, onSaved, pillarId]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="case-obs-briefing-editor-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="case-obs-briefing-editor-panel" role="dialog" aria-modal="true" aria-labelledby="case-obs-briefing-editor-title">
        <style dangerouslySetInnerHTML={{ __html: observationBriefingSectionEditorCss }} />

        <header className="case-obs-briefing-editor-head">
          <div>
            <h2 id="case-obs-briefing-editor-title" className="case-obs-briefing-editor-title">
              {section.title}
            </h2>
            <p className="case-obs-briefing-editor-subtitle">
              Pre-filled from mission templates and prior intelligence. Edit only what you want to change.
            </p>
          </div>
          <button type="button" className="case-obs-briefing-editor-close" onClick={onClose} aria-label="Close editor">
            Close
          </button>
        </header>

        <div className="case-obs-briefing-editor-body">
          <div>
            <label className="case-obs-briefing-editor-field-label" htmlFor="case-obs-briefing-editor-draft">
              Your briefing
            </label>
            <textarea
              id="case-obs-briefing-editor-draft"
              className="case-obs-briefing-editor-textarea"
              value={draft}
              disabled={disabled || busy}
              placeholder={section.placeholder}
              rows={section.suggestionMode === "paragraph" ? 5 : 7}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>

          {suggestions.items.length > 0 ? (
            <div className="case-obs-briefing-editor-suggestions">
              <div className="case-obs-briefing-editor-suggestions-head">
                <h3 className="case-obs-briefing-editor-suggestions-title">Suggested</h3>
                {section.suggestionMode === "paragraph" && suggestions.combinedText ? (
                  <button
                    type="button"
                    className="case-obs-briefing-editor-suggestion-apply case-obs-briefing-editor-suggestion-apply--primary"
                    disabled={disabled || busy}
                    onClick={applyCombinedSuggestion}
                  >
                    Apply suggestion
                  </button>
                ) : null}
              </div>
              <p className="case-obs-briefing-editor-suggestions-note">
                Generated from intro call debriefs, discovery intelligence, provider intelligence, and previous
                observations.
              </p>
              <ul className="case-obs-briefing-editor-suggestions-list">
                {suggestions.items.map((suggestion) => {
                  const actionLabel = briefingSuggestionApplyLabel(draft, suggestion.text);
                  const alreadyAdded = actionLabel === "Added";
                  return (
                    <li key={suggestion.id} className="case-obs-briefing-editor-suggestion">
                      <p className="case-obs-briefing-editor-suggestion-text">{suggestion.text}</p>
                      <div className="case-obs-briefing-editor-suggestion-meta">
                        <span className="case-obs-briefing-editor-suggestion-source">{suggestion.source}</span>
                        <button
                          type="button"
                          className={`case-obs-briefing-editor-suggestion-apply${actionLabel === "Apply" ? " case-obs-briefing-editor-suggestion-apply--primary" : ""}`}
                          disabled={disabled || busy || alreadyAdded}
                          onClick={() => applySuggestion(suggestion.text)}
                        >
                          {actionLabel}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="case-obs-briefing-editor-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="case-obs-briefing-editor-actions">
            <button
              type="button"
              className="case-obs-briefing-editor-btn case-obs-briefing-editor-btn--secondary"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="case-obs-briefing-editor-btn case-obs-briefing-editor-btn--primary"
              disabled={disabled || busy}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
