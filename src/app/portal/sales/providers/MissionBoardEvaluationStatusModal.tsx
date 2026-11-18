"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import {
  EVALUATION_ACTIVITY_STATUS_EDIT_CHOICES,
  evaluationActivityStatusLabel,
  type EvaluationActivityStatusChoice,
} from "@/lib/surgical-sales/evaluationActivityStatus";
import { resolveStoredEvaluationPath } from "@/lib/surgical-sales/buildProviderEvaluationPathView";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10051 };
const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(440px, calc(100vw - 24px))",
};

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

const statusBadgeStyle = (status: EvaluationActivityStatusChoice): React.CSSProperties => ({
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  background:
    status === "complete"
      ? "color-mix(in srgb, #0d9488 14%, var(--surface))"
      : status === "active"
        ? "color-mix(in srgb, #2563eb 12%, var(--surface))"
        : status === "planned"
          ? "color-mix(in srgb, #d97706 12%, var(--surface))"
          : "color-mix(in srgb, var(--foreground) 6%, var(--surface))",
  color: "var(--foreground)",
  border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
});

export function MissionBoardEvaluationStatusModal({
  provider,
  currentStatus,
  busy,
  error,
  onClose,
  onSave,
}: {
  provider: ProviderDirectoryRow;
  currentStatus: EvaluationActivityStatusChoice;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (status: EvaluationActivityStatusChoice) => void | Promise<void>;
}) {
  const providerName = providerDisplayName(provider);
  const evaluationPath = resolveStoredEvaluationPath(provider as Record<string, unknown>);
  const [selectedStatus, setSelectedStatus] =
    React.useState<EvaluationActivityStatusChoice>(currentStatus);

  React.useEffect(() => {
    setSelectedStatus(currentStatus);
  }, [currentStatus, provider.id]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const statusChanged = selectedStatus !== currentStatus;

  return (
    <div
      style={backdropStyle}
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        style={panelStyle}
        role="dialog"
        aria-modal
        aria-labelledby="mission-board-evaluation-status-title"
        data-testid="mission-board-evaluation-status-modal"
      >
        <style dangerouslySetInnerHTML={{ __html: surgicalCaseModalActionsCss }} />
        <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>
          {providerName}
        </p>
        <h2
          id="mission-board-evaluation-status-title"
          style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}
        >
          Update evaluation status
        </h2>

        {evaluationPath ? (
          <div style={fieldStyle}>
            <span style={labelStyle}>Evaluation path</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{evaluationPath}</span>
          </div>
        ) : null}

        <div style={fieldStyle}>
          <span style={labelStyle}>Current</span>
          <span style={statusBadgeStyle(currentStatus)} data-testid="evaluation-status-current">
            {evaluationActivityStatusLabel(currentStatus)}
          </span>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Activity status</span>
          <div style={radioGroupStyle} role="radiogroup" aria-label="Evaluation activity status">
            {EVALUATION_ACTIVITY_STATUS_EDIT_CHOICES.map((value) => (
              <label key={value} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="mission-board-evaluation-status"
                  value={value}
                  checked={selectedStatus === value}
                  disabled={busy}
                  onChange={() => setSelectedStatus(value)}
                />
                {evaluationActivityStatusLabel(value)}
              </label>
            ))}
          </div>
        </div>

        {error ? (
          <div role="alert" style={{ ...sc.alertError, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        ) : null}

        <div className="case-modal-actions">
          <button type="button" style={sc.btnGhost} disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            style={sc.btnPrimary}
            disabled={busy || !statusChanged}
            data-testid="mission-board-evaluation-status-save"
            onClick={() => void onSave(selectedStatus)}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
