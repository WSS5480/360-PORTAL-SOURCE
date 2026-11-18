"use client";

import React from "react";
import {
  ENGAGEMENT_PREP_MODE_DEFINITIONS,
  engagementPrepModeRequiresProduct,
  normalizeEngagementPrepMode,
} from "@/lib/surgical-sales/engagements/engagementPrepMode";

export function PrepEngagementModeSelector({
  prepMode,
  disabled,
  onPrepModeChange,
}: {
  prepMode: string;
  disabled?: boolean;
  onPrepModeChange: (mode: string) => void;
}) {
  const active = normalizeEngagementPrepMode(prepMode);
  const activeDef = ENGAGEMENT_PREP_MODE_DEFINITIONS.find((d) => d.mode === active);

  return (
    <div className={`ew-prep-mode-select ew-prep-mode-select--${active || "unset"}`}>
      <div className="ew-prep-mode-select-field">
        <label htmlFor="ew-prep-engagement-mode" className="ew-prep-mode-select-label">
          Prep mode
        </label>
        <select
          id="ew-prep-engagement-mode"
          className="ew-prep-mode-select-control"
          value={active}
          disabled={disabled}
          onChange={(e) => onPrepModeChange(e.target.value)}
        >
          <option value="">Choose…</option>
          {ENGAGEMENT_PREP_MODE_DEFINITIONS.map((def) => (
            <option key={def.mode} value={def.mode}>
              {def.label}
            </option>
          ))}
        </select>
      </div>
      {activeDef && engagementPrepModeRequiresProduct(activeDef.mode) ? (
        <p className="ew-prep-mode-select-preview-hint">Select product focus below.</p>
      ) : null}
    </div>
  );
}
