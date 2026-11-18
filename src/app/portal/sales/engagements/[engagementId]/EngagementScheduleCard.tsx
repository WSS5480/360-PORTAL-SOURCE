"use client";

import React from "react";
import {
  buildEngagementEditPatch,
  readEngagementEditDraft,
  type EngagementEditDraft,
} from "@/lib/surgical-sales/engagements/engagementEditDraft";
import { readEngagementScheduleDraft } from "@/lib/surgical-sales/engagements/buildEngagementRecordView";
import { formatPortalApiError } from "@/lib/utils/formatPortalApiError";
import { readResponseJson } from "@/lib/utils/readResponseJson";
import { userFacingError } from "@/lib/errors/userFacingError";

export function EngagementScheduleCard({
  engagementId,
  engagement,
  disabled = false,
  onSaved,
  onError,
  onSavingChange,
}: {
  engagementId: string;
  engagement: Record<string, unknown>;
  disabled?: boolean;
  onSaved?: () => void | Promise<void>;
  onError?: (message: string | null) => void;
  onSavingChange?: (busy: boolean) => void;
}) {
  const scheduleSeed = React.useMemo(() => readEngagementScheduleDraft(engagement), [engagement]);
  const locationSeed = String(engagement.pre_call_hospital_name ?? "").trim();

  const [engagementDate, setEngagementDate] = React.useState(scheduleSeed.engagement_date);
  const [engagementTime, setEngagementTime] = React.useState(scheduleSeed.engagement_time);
  const [location, setLocation] = React.useState(locationSeed);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setEngagementDate(scheduleSeed.engagement_date);
    setEngagementTime(scheduleSeed.engagement_time);
    setLocation(locationSeed);
  }, [scheduleSeed.engagement_date, scheduleSeed.engagement_time, locationSeed]);

  const dirty =
    engagementDate !== scheduleSeed.engagement_date ||
    engagementTime !== scheduleSeed.engagement_time ||
    location !== locationSeed;

  async function saveSchedule() {
    if (!dirty || disabled || saving) return;
    setSaving(true);
    onSavingChange?.(true);
    onError?.(null);
    try {
      const base = readEngagementEditDraft(engagement);
      const draft: EngagementEditDraft = {
        ...base,
        engagementDate,
        engagementTime,
        locationLabel: location,
      };
      const patch = buildEngagementEditPatch(draft, engagement);
      const res = await fetch(`/api/portal/sales/engagements/${encodeURIComponent(engagementId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await readResponseJson<{ ok?: boolean; error?: unknown }>(res);
      if (!res.ok || !j.ok) {
        throw new Error(formatPortalApiError(j.error, "Could not update schedule"));
      }
      await onSaved?.();
    } catch (e: unknown) {
      onError?.(userFacingError(e, "Could not update schedule"));
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  }

  return (
    <section className="engagement-detail-hub-card" aria-labelledby="engagement-schedule-heading">
      <div className="engagement-detail-hub-card-head">
        <h2 id="engagement-schedule-heading" className="engagement-detail-hub-card-title">
          Scheduling
        </h2>
        {dirty ? (
          <button
            type="button"
            className="engagement-detail-hub-card-save"
            disabled={disabled || saving}
            onClick={() => void saveSchedule()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        ) : null}
      </div>
      <div className="engagement-detail-hub-schedule-grid">
        <label className="engagement-detail-hub-field">
          <span>Date</span>
          <input
            type="date"
            value={engagementDate}
            disabled={disabled || saving}
            onChange={(e) => setEngagementDate(e.target.value)}
          />
        </label>
        <label className="engagement-detail-hub-field">
          <span>Time</span>
          <input
            type="time"
            value={engagementTime}
            disabled={disabled || saving}
            onChange={(e) => setEngagementTime(e.target.value)}
          />
        </label>
        <label className="engagement-detail-hub-field engagement-detail-hub-field--full">
          <span>Location</span>
          <input
            type="text"
            value={location}
            placeholder="Hospital, site, or room"
            disabled={disabled || saving}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
      </div>
    </section>
  );
}
