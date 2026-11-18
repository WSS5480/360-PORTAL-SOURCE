"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import { ObservationCaseNoteCapture } from "@/app/portal/sales/cases/[caseId]/ObservationCaseNoteCapture";
import type { ProviderObservationCasePreview } from "@/lib/surgical-sales/providerObservationCaseCollection";
import { runMissionBoardObservationDictateComplete } from "@/lib/surgical-sales/missionBoardObservationDictateComplete";
import { observationFieldExecutionCss } from "@/app/portal/sales/cases/[caseId]/observationFieldExecutionCss";
import { userFacingError } from "@/lib/errors/userFacingError";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10049 };
const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(480px, calc(100vw - 24px))",
};

export function MissionBoardObservationDictateCompleteModal({
  providerName,
  observation,
  busy,
  onClose,
  onCompleted,
}: {
  providerName: string;
  observation: ProviderObservationCasePreview;
  busy?: boolean;
  onClose: () => void;
  onCompleted: (result: { title: string; detail?: string | null }) => void | Promise<void>;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const caseId = observation.caseId;
  const caseLabel = observation.procedureLabel || "Observation case";
  const disabled = Boolean(busy) || submitting;

  async function handleSaveNote(body: string, meta?: { captureMode?: "voice" | "quick" }) {
    if (!caseId || disabled) {
      throw new Error("Could not save note.");
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await runMissionBoardObservationDictateComplete({
        caseId,
        noteBody: body,
        captureMode: meta?.captureMode,
      });
      await onCompleted(result.toast);
      return result.feedback ?? undefined;
    } catch (caught: unknown) {
      const message = userFacingError(caught, "Could not complete observation.");
      setError(message);
      throw caught instanceof Error ? caught : new Error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${surgicalCaseModalActionsCss}\n${observationFieldExecutionCss}` }} />
      <div
        className="mission-board-dictate-complete-backdrop"
        style={backdropStyle}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !disabled) onClose();
        }}
      >
        <div
          className="mission-board-dictate-complete-modal"
          style={panelStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-board-dictate-complete-title"
          data-testid="mission-board-dictate-complete-modal"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="mission-board-dictate-complete-header" style={{ marginBottom: 14 }}>
            <h2 id="mission-board-dictate-complete-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              Dictate &amp; Complete
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
              {providerName} · {caseLabel}
              {observation.dateTimeLabel ? ` · ${observation.dateTimeLabel}` : ""}
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
              Saves to this observation case, then marks it complete.
            </p>
          </header>

          <ObservationCaseNoteCapture
            disabled={disabled}
            layout="briefing"
            includeStyles={false}
            quickNoteId={`mission-board-dictate-complete-${caseId}`}
            onSaveNote={handleSaveNote}
            onBeginCapture={() => undefined}
          />

          {error ? (
            <p
              className="mission-board-dictate-complete-error"
              role="alert"
              style={{ color: "var(--danger)", fontSize: 13 }}
            >
              {error}
            </p>
          ) : null}

          <footer
            className="mission-board-dictate-complete-footer"
            style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}
          >
            <button type="button" style={sc.btnSecondary} onClick={onClose} disabled={disabled}>
              Cancel
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
