"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import { buildMissionBoardDebriefStatusView } from "@/lib/surgical-sales/missionBoardDebriefStatusView";
import { logMissionBoardDebriefPathwayOutcomeFromLauncher, advancePathwayFromCompletedDebriefClient } from "@/lib/surgical-sales/missionBoardDebriefLauncherClient";
import { MISSION_BOARD_DEBRIEF_LOG_OUTCOME_LABEL } from "@/lib/surgical-sales/missionBoardDebriefComplete";
import { MISSION_BOARD_EVALUATION_PATH_OPTIONS } from "@/lib/surgical-sales/missionBoardEvaluationPathUx";
import type { SalesPathwayEvaluationActivity } from "@/lib/surgical-sales/salesPathwayCanonical";
import {
  defaultMissionBoardDebriefCompleteForm,
  MissionBoardDebriefCompletePanel,
  type MissionBoardDebriefCompleteFormState,
} from "./MissionBoardDebriefCompletePanel";
import { missionBoardDebriefLauncherCss } from "./missionBoardDebriefLauncherCss";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10051 };

const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(520px, calc(100vw - 24px))",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 13,
  lineHeight: 1.45,
  padding: "6px 0",
  borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))",
};

export function MissionBoardDebriefStatusModal({
  provider,
  busy,
  onClose,
  onLaunched,
}: {
  provider: ProviderDirectoryRow;
  busy?: boolean;
  onClose: () => void;
  /** @deprecated Schedule Debrief lives on the card primary CTA */
  onScheduleDebrief?: () => void;
  onLaunched?: () => void | Promise<void>;
  /** @deprecated Completion routes through /debrief */
  onCompleted?: () => void | Promise<void>;
}) {
  const providerName = providerDisplayName(provider);
  const view = React.useMemo(
    () => buildMissionBoardDebriefStatusView({ provider, providerName }),
    [provider, providerName],
  );

  const [submitting, setSubmitting] = React.useState(false);
  const [pathwayOutcomeForm, setPathwayOutcomeForm] = React.useState<MissionBoardDebriefCompleteFormState>(
    defaultMissionBoardDebriefCompleteForm,
  );
  const [advanceEvaluationPath, setAdvanceEvaluationPath] = React.useState<
    SalesPathwayEvaluationActivity | ""
  >("");
  const [error, setError] = React.useState<string | null>(null);

  const disabled = Boolean(busy) || submitting;

  React.useEffect(() => {
    setError(null);
    setPathwayOutcomeForm(defaultMissionBoardDebriefCompleteForm());
    setAdvanceEvaluationPath(
      view.evaluationPath &&
        MISSION_BOARD_EVALUATION_PATH_OPTIONS.some((option) => option.id === view.evaluationPath)
        ? (view.evaluationPath as SalesPathwayEvaluationActivity)
        : "",
    );
  }, [provider.id, view.evaluationPath]);

  async function handleAdvancePathway() {
    if (disabled) return;
    if (!advanceEvaluationPath) {
      setError("Select an evaluation path to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await advancePathwayFromCompletedDebriefClient(provider.id, {
        evaluationPath: advanceEvaluationPath,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }

      await onLaunched?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogPathwayOutcome() {
    if (disabled) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await logMissionBoardDebriefPathwayOutcomeFromLauncher(provider.id, {
        outcomeId: pathwayOutcomeForm.outcomeId,
        opportunityResult: pathwayOutcomeForm.opportunityResult,
        evaluationPath: pathwayOutcomeForm.evaluationPath || null,
        dictation: pathwayOutcomeForm.dictation,
        nextStep: pathwayOutcomeForm.nextStep || null,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      await onLaunched?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${surgicalCaseModalActionsCss}\n${missionBoardDebriefLauncherCss}` }} />
      <div
        style={backdropStyle}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !disabled) onClose();
        }}
      >
        <div
          style={panelStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-board-debrief-status-title"
          data-testid="mission-board-debrief-status-modal"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="mb-debrief-launcher__head">
            <p className="mb-debrief-launcher__kicker">{providerName}</p>
            <h2 id="mission-board-debrief-status-title" className="mb-debrief-launcher__title">
              Debrief Status
            </h2>
            {view.organizationName ? (
              <p className="mb-debrief-launcher__org">{view.organizationName}</p>
            ) : null}
          </header>

          <div className="mb-debrief-launcher__body">
            <div style={rowStyle}>
              <span style={{ color: "var(--muted)", fontWeight: 700 }}>Debrief status</span>
              <span>{view.debriefStatusLine}</span>
            </div>
            {view.engagementLifecycleStatus ? (
              <div style={rowStyle}>
                <span style={{ color: "var(--muted)", fontWeight: 700 }}>Engagement</span>
                <span>{view.engagementLifecycleStatus}</span>
              </div>
            ) : null}
            <div style={rowStyle}>
              <span style={{ color: "var(--muted)", fontWeight: 700 }}>Completion</span>
              <span>{view.debriefCompleted ? "Debrief completed" : "Notes pending"}</span>
            </div>
            <div style={rowStyle}>
              <span style={{ color: "var(--muted)", fontWeight: 700 }}>Product fit</span>
              <span>{view.productFitValidated}</span>
            </div>
            {view.evaluationPath ? (
              <div style={rowStyle}>
                <span style={{ color: "var(--muted)", fontWeight: 700 }}>Evaluation path</span>
                <span>{view.evaluationPath}</span>
              </div>
            ) : null}
          </div>

          {view.needsPathwayAdvance ? (
            <div className="mb-debrief-launcher__body">
              <p className="mb-debrief-launcher__text">
                Debrief is complete. Confirm the evaluation path to unlock the Evaluation stage on the
                pathway.
              </p>
              <label className="mb-debrief-launcher__field">
                <span className="mb-debrief-launcher__label">Evaluation path</span>
                <select
                  className="mb-debrief-launcher__select"
                  value={advanceEvaluationPath}
                  disabled={disabled}
                  data-testid="mission-board-debrief-advance-evaluation-path"
                  onChange={(event) =>
                    setAdvanceEvaluationPath(event.target.value as SalesPathwayEvaluationActivity | "")
                  }
                >
                  <option value="">Select evaluation path…</option>
                  {MISSION_BOARD_EVALUATION_PATH_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {error ? (
                <p className="mb-debrief-launcher__error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="mb-debrief-complete__actions">
                <button
                  type="button"
                  className="mb-debrief-launcher__primary"
                  disabled={disabled}
                  data-testid="mission-board-debrief-advance-pathway"
                  onClick={() => void handleAdvancePathway()}
                >
                  {submitting ? "Saving…" : "Advance to Evaluation"}
                </button>
                <button
                  type="button"
                  className="mb-debrief-launcher__cancel"
                  disabled={disabled}
                  onClick={onClose}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
          <MissionBoardDebriefCompletePanel
            disabled={disabled}
            saving={submitting}
            error={error}
            form={pathwayOutcomeForm}
            onChange={setPathwayOutcomeForm}
            onSubmit={handleLogPathwayOutcome}
            onCancel={onClose}
            submitLabel={MISSION_BOARD_DEBRIEF_LOG_OUTCOME_LABEL}
            cancelLabel="Cancel"
          />
          )}
        </div>
      </div>
    </>
  );
}
