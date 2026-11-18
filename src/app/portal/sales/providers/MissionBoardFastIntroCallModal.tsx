"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import { INTRO_SCHEDULE_LABEL } from "@/lib/surgical-sales/introCallEngagementLifecycle";
import { createMissionBoardIntroCall } from "@/lib/surgical-sales/missionBoardFastIntroCall";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import { userFacingError } from "@/lib/errors/userFacingError";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10046 };
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

export function MissionBoardFastIntroCallModal({
  provider,
  busy,
  error,
  onClose,
  onCreate,
}: {
  provider: ProviderDirectoryRow;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onCreate: () => void | Promise<void>;
}) {
  const [engagementDate, setEngagementDate] = React.useState("");
  const [engagementTime, setEngagementTime] = React.useState("");
  const [note, setNote] = React.useState("");
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const providerLabel = providerDisplayName(provider);
  const organizationLabel = provider.primary_organization_name?.trim() || "No organization";
  const organizationId = String(
    provider.primary_organization_id || provider.organization_id || provider.account_id || "",
  ).trim();

  React.useEffect(() => {
    setEngagementDate("");
    setEngagementTime("");
    setNote("");
    setLocalError(null);
  }, [provider.id]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose, saving]);

  async function handleCreate() {
    if (busy || saving) return;
    if (!engagementDate.trim()) {
      setLocalError("Date is required.");
      return;
    }
    if (!organizationId) {
      setLocalError("Provider organization is required.");
      return;
    }

    setSaving(true);
    setLocalError(null);
    try {
      await createMissionBoardIntroCall({
        providerId: provider.id,
        organizationId,
        providerLabel,
        organizationLabel,
        engagementDate: engagementDate.trim(),
        engagementTime: engagementTime.trim(),
        note,
      });
      await onCreate();
    } catch (err) {
      setLocalError(userFacingError(err, "Could not create intro call."));
    } finally {
      setSaving(false);
    }
  }

  const displayError = localError || error;
  const isBusy = busy || saving;

  return (
    <div
      style={backdropStyle}
      onMouseDown={(e) => e.target === e.currentTarget && !isBusy && onClose()}
    >
      <div
        style={panelStyle}
        role="dialog"
        aria-modal
        aria-labelledby="mission-board-intro-call-title"
        data-testid="mission-board-intro-call-modal"
      >
        <style dangerouslySetInnerHTML={{ __html: surgicalCaseModalActionsCss }} />
        <h2
          id="mission-board-intro-call-title"
          style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}
        >
          {INTRO_SCHEDULE_LABEL}
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.45, color: "var(--muted)" }}>
          {providerLabel} · {organizationLabel}
        </p>

        <label style={fieldStyle} htmlFor="mission-board-intro-call-date">
          <span style={labelStyle}>Date</span>
          <input
            id="mission-board-intro-call-date"
            type="date"
            style={inputStyle}
            value={engagementDate}
            onChange={(e) => setEngagementDate(e.target.value)}
            disabled={isBusy}
            required
          />
        </label>

        <label style={fieldStyle} htmlFor="mission-board-intro-call-time">
          <span style={labelStyle}>Time</span>
          <input
            id="mission-board-intro-call-time"
            type="time"
            style={inputStyle}
            value={engagementTime}
            onChange={(e) => setEngagementTime(e.target.value)}
            disabled={isBusy}
          />
        </label>

        <label style={fieldStyle} htmlFor="mission-board-intro-call-note">
          <span style={labelStyle}>Optional note</span>
          <textarea
            id="mission-board-intro-call-note"
            style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isBusy}
            rows={3}
          />
        </label>

        {displayError ? (
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#b91c1c" }}>{displayError}</p>
        ) : null}

        <div className="case-modal-actions">
          <button type="button" style={sc.btnGhost} disabled={isBusy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" style={sc.btnPrimary} disabled={isBusy} onClick={() => void handleCreate()}>
            {isBusy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
