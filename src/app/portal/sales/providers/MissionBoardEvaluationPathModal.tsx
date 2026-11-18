"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import {
  fetchMissionBoardEvaluationPath,
  saveMissionBoardEvaluationPath,
} from "@/lib/surgical-sales/missionBoardEvaluationPathClient";
import {
  buildMissionBoardEvaluationPathViewFromDirectoryRow,
  type MissionBoardEvaluationPathView,
} from "@/lib/surgical-sales/missionBoardEvaluationPathView";
import {
  MISSION_BOARD_EVALUATION_PATH_MODAL_TITLE,
  MISSION_BOARD_EVALUATION_PATH_OPTIONS,
} from "@/lib/surgical-sales/missionBoardEvaluationPathUx";
import type { SalesPathwayEvaluationActivity } from "@/lib/surgical-sales/salesPathwayCanonical";
import { missionBoardEvaluationPathCss } from "./missionBoardEvaluationPathCss";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10051 };
const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(520px, calc(100vw - 24px))",
};

export function MissionBoardEvaluationPathModal({
  provider,
  busy,
  onClose,
  onSaved,
}: {
  provider: ProviderDirectoryRow;
  busy?: boolean;
  onClose: () => void;
  onSaved?: (detail?: string | null) => void | Promise<void>;
}) {
  const providerName = providerDisplayName(provider);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loadWarning, setLoadWarning] = React.useState<string | null>(null);
  const [view, setView] = React.useState<MissionBoardEvaluationPathView | null>(null);
  const [selectedPath, setSelectedPath] = React.useState<SalesPathwayEvaluationActivity | "">("");
  const [targetDate, setTargetDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const disabled = Boolean(busy) || saving;

  const applyView = React.useCallback((nextView: MissionBoardEvaluationPathView) => {
    setView(nextView);
    setSelectedPath(nextView.selectedPath ?? nextView.recommendedPath);
    setTargetDate(nextView.targetDate ?? "");
    setNotes(nextView.notes ?? "");
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const fallbackView = buildMissionBoardEvaluationPathViewFromDirectoryRow(provider);
    applyView(fallbackView);
    setLoading(true);
    setError(null);
    setLoadWarning(null);

    async function load() {
      const result = await fetchMissionBoardEvaluationPath(provider.id);
      if (cancelled) return;
      if (result.ok) {
        applyView(result.view);
      } else {
        setLoadWarning(
          `${result.message} Showing saved path from the Mission Board — you can still change and save.`,
        );
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [applyView, provider, provider.id]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !disabled) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [disabled, onClose]);

  async function handleSave() {
    if (disabled || !selectedPath) {
      setError("Select an evaluation path.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await saveMissionBoardEvaluationPath({
        providerId: provider.id,
        evaluationPath: selectedPath,
        targetDate: targetDate.trim() || null,
        notes: notes.trim() || null,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const syncDetail = result.engagementSyncWarning
        ? `Path saved. Engagement type was not updated: ${result.engagementSyncWarning}`
        : null;
      await onSaved?.(syncDetail);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `${surgicalCaseModalActionsCss}\n${missionBoardEvaluationPathCss}`,
        }}
      />
      <div
        className="mission-board-evaluation-path-backdrop"
        style={backdropStyle}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !disabled) onClose();
        }}
      >
        <div
          className="mission-board-evaluation-path-modal"
          style={panelStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-board-evaluation-path-title"
          data-testid="mission-board-evaluation-path-modal"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="mb-eval-path__head">
            <p className="mb-eval-path__kicker">{providerName}</p>
            <h2 id="mission-board-evaluation-path-title" className="mb-eval-path__title">
              {MISSION_BOARD_EVALUATION_PATH_MODAL_TITLE}
            </h2>
            {view?.organizationName ? (
              <p className="mb-eval-path__org">{view.organizationName}</p>
            ) : null}
          </header>

          {loading ? (
            <p className="mb-eval-path__context-text" role="status">Refreshing evaluation context…</p>
          ) : view ? (
            <div className="mission-board-evaluation-path-modal">
              {view.debriefOutcomeSummary ? (
                <section className="mb-eval-path__context">
                  <p className="mb-eval-path__context-label">Debrief outcome</p>
                  <p className="mb-eval-path__context-text">{view.debriefOutcomeSummary}</p>
                </section>
              ) : null}

              {view.primaryOpportunity ? (
                <section className="mb-eval-path__context">
                  <p className="mb-eval-path__context-label">Primary opportunity</p>
                  <p className="mb-eval-path__context-text">{view.primaryOpportunity}</p>
                </section>
              ) : null}

              {!view.selectedPath ? (
                <section className="mb-eval-path__context">
                  <p className="mb-eval-path__context-label">Recommended path</p>
                  <p className="mb-eval-path__context-text">{view.recommendedPath}</p>
                </section>
              ) : null}

              <div className="mb-eval-path__options" role="radiogroup" aria-label="Evaluation path">
                {MISSION_BOARD_EVALUATION_PATH_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="mb-eval-path__option"
                    data-selected={selectedPath === option.id ? "true" : "false"}
                    aria-pressed={selectedPath === option.id}
                    disabled={disabled}
                    onClick={() => setSelectedPath(option.id)}
                  >
                    <span className="mb-eval-path__option-title">{option.label}</span>
                    <span className="mb-eval-path__option-desc">{option.description}</span>
                  </button>
                ))}
              </div>

              <div className="mb-eval-path__field">
                <label className="mb-eval-path__field-label" htmlFor="mb-eval-path-target-date">
                  Target date (optional)
                </label>
                <input
                  id="mb-eval-path-target-date"
                  type="date"
                  className="mb-eval-path__field-input"
                  value={targetDate}
                  disabled={disabled}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>

              <div className="mb-eval-path__field">
                <label className="mb-eval-path__field-label" htmlFor="mb-eval-path-notes">
                  Notes (optional)
                </label>
                <textarea
                  id="mb-eval-path-notes"
                  className="mb-eval-path__field-input"
                  rows={3}
                  value={notes}
                  disabled={disabled}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          {loadWarning ? (
            <p className="mb-eval-path__context-text" role="status">
              {loadWarning}
            </p>
          ) : null}

          {error ? <p className="mb-eval-path__error">{error}</p> : null}

          <div className="surgical-case-modal-actions">
            <button type="button" className="sc-btn sc-btn--ghost" disabled={disabled} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--primary"
              data-testid="mission-board-evaluation-path-save"
              disabled={disabled || !selectedPath}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Save path"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
