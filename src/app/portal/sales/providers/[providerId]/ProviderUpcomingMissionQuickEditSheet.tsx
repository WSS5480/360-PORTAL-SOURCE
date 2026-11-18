"use client";

import React from "react";
import { buildEngagementScheduleFieldsFromBasics } from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";
import {
  ENGAGEMENT_TYPES,
  formatEngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import type { ProviderOverviewMissionQuickEdit } from "@/lib/surgical-sales/buildProviderOverviewMissionStatus";
import { formatPortalApiError } from "@/lib/utils/formatPortalApiError";
import { EngagementArchiveControl } from "@/app/portal/sales/engagements/[engagementId]/EngagementArchiveControl";
import { userFacingError } from "@/lib/errors/userFacingError";

export function ProviderUpcomingMissionQuickEditSheet({
  open,
  quickEdit,
  redirectHref,
  busy,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  quickEdit: ProviderOverviewMissionQuickEdit | null;
  redirectHref: string;
  busy?: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
  onError?: (message: string | null) => void;
}) {
  const [engagementType, setEngagementType] = React.useState("");
  const [engagementDate, setEngagementDate] = React.useState("");
  const [engagementTime, setEngagementTime] = React.useState("");
  const [locationLabel, setLocationLabel] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !quickEdit) return;
    setEngagementType(quickEdit.engagementType);
    setEngagementDate(quickEdit.engagementDate);
    setEngagementTime(quickEdit.engagementTime);
    setLocationLabel(quickEdit.locationLabel);
  }, [open, quickEdit]);

  if (!open || !quickEdit) return null;

  async function handleSave() {
    if (!quickEdit) return;
    setSaving(true);
    onError?.(null);
    try {
      const schedule = buildEngagementScheduleFieldsFromBasics({
        engagement_date: engagementDate,
        engagement_time: engagementTime,
      });
      const res = await fetch(
        `/api/portal/sales/engagements/${encodeURIComponent(quickEdit.engagementId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            engagement_type: engagementType,
            engagement_date: schedule.engagement_date,
            scheduled_at: schedule.scheduled_at,
            scheduled_date: schedule.engagement_date,
            pre_call_hospital_name: locationLabel.trim() || null,
          }),
        },
      );
      const j = (await res.json()) as { ok?: boolean; error?: unknown };
      if (!res.ok || !j.ok) throw new Error(formatPortalApiError(j.error, "Update failed"));
      onClose();
      if (onSaved) await onSaved();
    } catch (e: unknown) {
      onError?.(userFacingError(e, "We could not save that update. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const disabled = busy || saving;

  return (
    <div
      className="engagement-outcome-sheet-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="engagement-outcome-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-mission-quick-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="engagement-outcome-sheet-head">
          <h2 id="provider-mission-quick-edit-title">Edit upcoming mission</h2>
          <button type="button" className="engagement-outcome-sheet-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <p className="engagement-outcome-sheet-hint">
          Update schedule and touch type without leaving Provider Overview.
        </p>

        <label className="engagement-detail-mobile-field">
          <span>Engagement type</span>
          <select
            value={engagementType}
            disabled={disabled}
            onChange={(e) => setEngagementType(e.target.value)}
          >
            {ENGAGEMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatEngagementType(type)}
              </option>
            ))}
          </select>
        </label>

        <label className="engagement-detail-mobile-field">
          <span>Date</span>
          <input
            type="date"
            value={engagementDate}
            disabled={disabled}
            onChange={(e) => setEngagementDate(e.target.value)}
          />
        </label>

        <label className="engagement-detail-mobile-field">
          <span>Time</span>
          <input
            type="time"
            value={engagementTime}
            disabled={disabled}
            onChange={(e) => setEngagementTime(e.target.value)}
          />
        </label>

        <label className="engagement-detail-mobile-field">
          <span>Location</span>
          <input
            type="text"
            value={locationLabel}
            disabled={disabled}
            placeholder={quickEdit.organizationName ?? "Hospital or site"}
            onChange={(e) => setLocationLabel(e.target.value)}
          />
        </label>

        {quickEdit.organizationName ? (
          <p className="engagement-outcome-sheet-hint" style={{ marginTop: 0 }}>
            Organization: {quickEdit.organizationName}
          </p>
        ) : null}

        <div className="engagement-record-danger-zone" style={{ marginTop: 16 }}>
          <p className="engagement-outcome-sheet-hint" style={{ marginBottom: 8 }}>
            Remove this touch from active lists. You can restore it from the engagement record later if needed.
          </p>
          <EngagementArchiveControl
            engagementId={quickEdit.engagementId}
            archived={false}
            redirectHref={redirectHref}
            disabled={disabled}
            className="engagement-record-danger-btn"
            onArchived={async () => {
              onClose();
              if (onSaved) await onSaved();
            }}
            onError={onError}
          />
        </div>

        <footer className="engagement-outcome-sheet-actions">
          <button type="button" onClick={onClose} disabled={disabled}>
            Cancel
          </button>
          <button type="button" className="primary" disabled={disabled} onClick={() => void handleSave()}>
            {saving ? "Saving…" : "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}
