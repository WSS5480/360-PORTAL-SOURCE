"use client";

import React from "react";
import {
  observationStatusModalCss,
  sc,
  surgicalCaseModalActionsCss,
} from "@/components/sales/salesCommandUi";
import { useNarrowWizardLayout } from "@/app/portal/sales/engagements/new/useNarrowWizardLayout";
import type { ObservationApprovalNextStepChoice } from "@/lib/surgical-sales/observationApprovalSave";
import {
  OBSERVATION_APPROVAL_EDIT_CHOICES,
  missionBoardObservationStatusLabel,
  observationStatusLabel,
  type ObservationApprovalEditChoice,
  type ObservationStatusChoice,
} from "@/lib/surgical-sales/observationStatus";

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  marginBottom: 14,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid color-mix(in srgb, var(--foreground) 12%, var(--border))",
  fontSize: 14,
  fontFamily: "inherit",
  background: "var(--surface)",
  color: "var(--foreground)",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 44,
  fontSize: 16,
  padding: "10px 12px",
  borderRadius: 10,
};

const radioGroupStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const radioLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const statusBadgeStyle = (status: ObservationStatusChoice): React.CSSProperties => ({
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  background:
    status === "permission_confirmed" || status === "observation_scheduled" || status === "observation_completed"
      ? "color-mix(in srgb, #0d9488 14%, var(--surface))"
      : status === "denied"
        ? "color-mix(in srgb, #dc2626 12%, var(--surface))"
        : status === "permission_not_yet_confirmed" || status === "interested"
          ? "color-mix(in srgb, #d97706 12%, var(--surface))"
          : "color-mix(in srgb, var(--foreground) 6%, var(--surface))",
  color: "var(--foreground)",
  border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
});

const compareRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "72px 1fr",
  gap: 8,
  alignItems: "center",
  fontSize: 13,
};

type ModalStep = "edit" | "confirm";

const AFTER_SAVE_OPTIONS: ReadonlyArray<{
  value: ObservationApprovalNextStepChoice;
  label: string;
}> = [
  { value: "finish", label: "Stay on overview" },
  { value: "schedule_observation", label: "Schedule first observation" },
];

function observationStatusSelectLabel(status: ObservationApprovalEditChoice): string {
  if (status === "permission_confirmed") {
    return `${missionBoardObservationStatusLabel(status)} (→ Observation)`;
  }
  return missionBoardObservationStatusLabel(status);
}

export function ObservationApprovalModal({
  open,
  busy,
  error,
  currentStatus,
  preferScheduleObservation = false,
  onClose,
  onSave,
}: {
  open: boolean;
  busy?: boolean;
  error?: string | null;
  currentStatus: ObservationStatusChoice;
  /** When opened from the pathway timeline, default to scheduling the first observation. */
  preferScheduleObservation?: boolean;
  onClose: () => void;
  onSave: (input: {
    status: ObservationStatusChoice;
    approvedBy: string;
    approvalNote: string;
    nextStep: ObservationApprovalNextStepChoice;
  }) => void | Promise<void>;
}) {
  const isMobile = useNarrowWizardLayout(768);
  const [step, setStep] = React.useState<ModalStep>("edit");
  const [selectedStatus, setSelectedStatus] = React.useState<ObservationStatusChoice>(currentStatus);
  const [approvedBy, setApprovedBy] = React.useState("");
  const [approvalNote, setApprovalNote] = React.useState("");
  const [nextStep, setNextStep] = React.useState<ObservationApprovalNextStepChoice>("finish");

  React.useEffect(() => {
    if (!open) return;
    setStep("edit");
    setSelectedStatus(currentStatus);
    setApprovedBy("");
    setApprovalNote("");
    setNextStep(preferScheduleObservation ? "schedule_observation" : "finish");
  }, [open, currentStatus, preferScheduleObservation]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const statusChanged = selectedStatus !== currentStatus;
  const showApprovedFields =
    selectedStatus === "permission_confirmed" || currentStatus === "permission_confirmed";
  const useConfirmStep = !isMobile && step === "confirm";

  const handleSave = () =>
    void onSave({
      status: selectedStatus,
      approvedBy: isMobile ? "" : approvedBy,
      approvalNote: isMobile ? "" : approvalNote,
      nextStep: selectedStatus === "permission_confirmed" ? nextStep : "finish",
    });

  const backdropStyle: React.CSSProperties = {
    ...sc.modalBackdrop,
    zIndex: 10045,
  };

  const panelStyle: React.CSSProperties = {
    ...sc.modalPanel,
    maxWidth: isMobile ? "100%" : "min(440px, calc(100vw - 24px))",
  };

  const editFields = (
    <>
      {!isMobile ? (
        <div style={fieldStyle} data-obs-status-field>
          <span style={labelStyle}>Current status</span>
          <span style={statusBadgeStyle(currentStatus)} data-testid="observation-status-current">
            {observationStatusLabel(currentStatus)}
          </span>
        </div>
      ) : null}

      <div style={fieldStyle} data-obs-status-field>
        <span style={labelStyle}>New status</span>
        {isMobile ? (
          <select
            aria-label="Observation status"
            value={selectedStatus}
            disabled={busy}
            style={selectStyle}
            onChange={(e) => setSelectedStatus(e.target.value as ObservationStatusChoice)}
          >
            {OBSERVATION_APPROVAL_EDIT_CHOICES.map((value) => (
              <option key={value} value={value}>
                {observationStatusSelectLabel(value)}
              </option>
            ))}
          </select>
        ) : (
          <div style={radioGroupStyle} role="radiogroup" aria-label="Observation status">
            {OBSERVATION_APPROVAL_EDIT_CHOICES.map((value) => (
              <label key={value} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="observation-status"
                  value={value}
                  checked={selectedStatus === value}
                  disabled={busy}
                  onChange={() => setSelectedStatus(value)}
                />
                {observationStatusLabel(value)}
              </label>
            ))}
          </div>
        )}
      </div>

      {selectedStatus === "permission_confirmed" ? (
        <div style={fieldStyle} data-obs-status-field>
          <span style={labelStyle}>After saving</span>
          {isMobile ? (
            <select
              aria-label="After saving"
              value={nextStep}
              disabled={busy}
              style={selectStyle}
              onChange={(e) => setNextStep(e.target.value as ObservationApprovalNextStepChoice)}
            >
              {AFTER_SAVE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <div style={radioGroupStyle} role="radiogroup" aria-label="After saving">
              {AFTER_SAVE_OPTIONS.map(({ value, label }) => (
                <label key={value} style={radioLabelStyle}>
                  <input
                    type="radio"
                    name="observation-status-next-step"
                    value={value}
                    checked={nextStep === value}
                    disabled={busy}
                    onChange={() => setNextStep(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {!isMobile ? (
        <>
          {showApprovedFields ? (
            <div style={fieldStyle} data-obs-status-field>
              <label style={labelStyle} htmlFor="observation-approved-by">
                Approved by
              </label>
              <input
                id="observation-approved-by"
                type="text"
                value={approvedBy}
                disabled={busy}
                placeholder="Optional — e.g. Dr. Smith, OR director"
                style={inputStyle}
                onChange={(e) => setApprovedBy(e.target.value)}
              />
            </div>
          ) : null}

          <div style={fieldStyle} data-obs-status-field>
            <label style={labelStyle} htmlFor="observation-status-note">
              Note
            </label>
            <textarea
              id="observation-status-note"
              value={approvalNote}
              disabled={busy}
              placeholder="Optional context for the team"
              rows={3}
              style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
              onChange={(e) => setApprovalNote(e.target.value)}
            />
          </div>

          {!statusChanged ? (
            <p style={{ ...sc.panelDesc, margin: "0 0 14px", fontSize: 12 }}>
              Select a different status to continue. Only Permission Confirmed advances the provider to
              Observation.
            </p>
          ) : selectedStatus === "interested" || selectedStatus === "permission_not_yet_confirmed" ? (
            <p style={{ ...sc.panelDesc, margin: "0 0 14px", fontSize: 12 }}>
              This records progress in Discovery. It does not move the provider into Observation yet.
            </p>
          ) : null}
        </>
      ) : null}
    </>
  );

  const confirmFields = (
    <>
      <p style={{ ...sc.panelDesc, margin: "0 0 14px", fontSize: 13 }}>
        Confirm this observation status change.
      </p>
      <div style={{ ...fieldStyle, gap: 10 }} data-obs-status-field>
        <div style={compareRowStyle}>
          <span style={{ ...labelStyle, margin: 0 }}>Current</span>
          <span style={statusBadgeStyle(currentStatus)}>{observationStatusLabel(currentStatus)}</span>
        </div>
        <div style={compareRowStyle}>
          <span style={{ ...labelStyle, margin: 0 }}>New</span>
          <span style={statusBadgeStyle(selectedStatus)} data-testid="observation-status-new">
            {observationStatusLabel(selectedStatus)}
          </span>
        </div>
      </div>
      {selectedStatus === "permission_confirmed" ? (
        <p style={{ ...sc.panelDesc, margin: "0 0 14px", fontSize: 12, fontWeight: 600 }}>
          Saving Permission Confirmed moves this provider from Discovery to Observation. Optional intelligence
          (scheduler, credentialing, champion, workflow) does not block this step.
        </p>
      ) : null}
    </>
  );

  const actions = (
    <div className={`case-modal-actions${isMobile ? " observation-status-modal-actions" : ""}`}>
      {useConfirmStep ? (
        <button type="button" style={sc.btnGhost} disabled={busy} onClick={() => setStep("edit")}>
          Back
        </button>
      ) : (
        <button type="button" style={sc.btnGhost} disabled={busy} onClick={onClose}>
          Cancel
        </button>
      )}
      {isMobile || !useConfirmStep ? (
        isMobile ? (
          <button
            type="button"
            style={sc.btnPrimary}
            disabled={busy || !statusChanged}
            data-testid="observation-status-confirm"
            onClick={handleSave}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        ) : (
          <button
            type="button"
            style={sc.btnPrimary}
            disabled={busy || !statusChanged}
            onClick={() => setStep("confirm")}
          >
            Review change
          </button>
        )
      ) : (
        <button
          type="button"
          style={sc.btnPrimary}
          disabled={busy}
          data-testid="observation-status-confirm"
          onClick={handleSave}
        >
          {busy ? "Saving…" : "Confirm"}
        </button>
      )}
    </div>
  );

  return (
    <div
      className={isMobile ? "observation-status-modal-backdrop" : undefined}
      style={backdropStyle}
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        className={isMobile ? "observation-status-modal-panel" : undefined}
        style={panelStyle}
        role="dialog"
        aria-modal
        aria-labelledby="observation-status-title"
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `${surgicalCaseModalActionsCss}\n${observationStatusModalCss}`,
          }}
        />

        {isMobile ? (
          <>
            <div className="observation-status-modal-header">
              <h2 id="observation-status-title">Update observation status</h2>
              {!useConfirmStep ? (
                <p className="observation-status-modal-current">
                  Current:{" "}
                  <span data-testid="observation-status-current">
                    {missionBoardObservationStatusLabel(currentStatus)}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="observation-status-modal-body">
              {!useConfirmStep ? editFields : confirmFields}
            </div>

            {error ? (
              <div
                role="alert"
                className="observation-status-modal-error"
                style={{ ...sc.alertError, fontSize: 13 }}
              >
                {error}
              </div>
            ) : null}

            {actions}
          </>
        ) : (
          <>
            <h2
              id="observation-status-title"
              style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}
            >
              Update observation status
            </h2>

            {!useConfirmStep ? editFields : confirmFields}

            {error ? (
              <div role="alert" style={{ ...sc.alertError, marginBottom: 14, fontSize: 13 }}>
                {error}
              </div>
            ) : null}

            {actions}
          </>
        )}
      </div>
    </div>
  );
}
