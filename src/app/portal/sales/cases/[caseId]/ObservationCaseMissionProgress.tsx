"use client";

import React from "react";
import { buildObservationMissionProgress } from "@/lib/surgical-sales/buildObservationMissionProgress";
import { observationCaseMissionProgressCss } from "./observationCaseMissionProgressCss";

export function ObservationCaseMissionProgress({
  caseRow,
  compact = false,
  hideTracks = false,
  title,
}: {
  caseRow: Record<string, unknown>;
  compact?: boolean;
  hideTracks?: boolean;
  title?: string;
}) {
  const view = React.useMemo(() => buildObservationMissionProgress({ caseRow }), [caseRow]);
  const sectionTitle = title ?? view.title;
  const showProgressRing = view.confirmedCount > 0;

  return (
    <section
      className={`case-obs-mission-progress${compact ? " case-obs-mission-progress--compact" : ""}`}
      aria-label={view.title}
    >
      <style dangerouslySetInnerHTML={{ __html: observationCaseMissionProgressCss }} />

      <div className="case-obs-mission-progress-head">
        <div className="case-obs-mission-progress-head-main">
          <p className="case-obs-mission-progress-kicker">Mission control</p>
          <h2 className="case-obs-mission-progress-title">{sectionTitle}</h2>
          {!compact ? (
            <p className="case-obs-mission-progress-kicker">{view.percentLabel}</p>
          ) : null}
        </div>
        {showProgressRing ? (
          <div className="case-obs-mission-progress-ring case-obs-mission-progress-ring--summary" aria-hidden>
            <div className="case-obs-mission-progress-ring-label">
              {view.confirmedCount}
              <span className="case-obs-mission-progress-ring-suffix">Captured</span>
            </div>
          </div>
        ) : null}
      </div>

      {hideTracks ? null : (
        <ul className="case-obs-mission-progress-tracks">
          {view.tracks.map((track) => (
            <li
              key={track.id}
              className={`case-obs-mission-progress-track case-obs-mission-progress-track--${track.status}`}
            >
              <div className="case-obs-mission-progress-track-main">
                <span className="case-obs-mission-progress-track-icon" aria-hidden>
                  {track.statusIcon}
                </span>
                <span className="case-obs-mission-progress-track-label">{track.label}</span>
              </div>
              <span className="case-obs-mission-progress-track-meta">{track.statusLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
