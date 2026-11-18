"use client";

import type { ReactNode } from "react";

export function ProviderOverviewProviderHeader({
  displayName,
  organizationName,
  specialty,
  pathwayStageLabel,
  pathwayProgressPercent,
  stageObjective,
  pathwayTracker,
}: {
  displayName: string;
  organizationName?: string | null;
  specialty?: string | null;
  pathwayStageLabel: string;
  pathwayProgressPercent: number;
  stageObjective?: string | null;
  pathwayTracker: ReactNode;
}) {
  return (
    <header className="pov-cc-hero mc-deck__inner" data-testid="pov-provider-header">
      <div className="pov-cc-hero__top mc-deck__bar">
        <div className="pov-cc-hero__identity mc-deck__identity">
          <p className="pov-cc-hero__kicker mc-deck__kicker">Field mission</p>
          <h1 className="pov-cc-hero__name mc-deck__name">{displayName}</h1>
          <div className="pov-cc-hero__meta-grid">
            <p className="pov-cc-hero__meta">
              {organizationName?.trim() ? (
                organizationName.trim()
              ) : (
                <span className="pov-cc-hero__meta--muted">No primary organization</span>
              )}
            </p>
            {specialty?.trim() ? (
              <p className="pov-cc-hero__meta pov-cc-hero__meta--specialty">{specialty.trim()}</p>
            ) : null}
          </div>
        </div>
        <div className="pov-cc-hero__status">
          <div className="pov-cc-hero__stage-badge">
            <span className="pov-cc-hero__stage-label">Active stage</span>
            <span className="pov-cc-hero__stage-pill mc-badge mc-badge--stage">{pathwayStageLabel}</span>
          </div>
          <div
            className="pov-cc-hero__progress-ring"
            aria-label={`Pathway progress ${pathwayProgressPercent}%`}
            style={{ "--pov-progress": `${pathwayProgressPercent}%` } as React.CSSProperties}
          >
            <span className="pov-cc-hero__progress-value">{pathwayProgressPercent}%</span>
          </div>
        </div>
      </div>

      <div className="pov-cc-hero__pathway">
        <div className="pov-cc-hero__pathway-head">
          <div className="pov-cc-hero__pathway-copy">
            <p className="pov-cc-hero__pathway-kicker">360 Medical Sales Pathway</p>
            {stageObjective?.trim() ? (
              <p className="pov-cc-hero__objective">{stageObjective.trim()}</p>
            ) : null}
          </div>
        </div>
        {pathwayTracker}
      </div>
    </header>
  );
}
