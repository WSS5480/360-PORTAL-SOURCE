"use client";

import React from "react";
import {
  buildObservationIntelligenceTimeline,
  formatObservationIntelligenceTimelineTime,
} from "@/lib/surgical-sales/buildObservationIntelligenceTimeline";
import { observationCaseIntelligenceTimelineCss } from "./observationCaseIntelligenceTimelineCss";

type ActivityInput = {
  id: string;
  activity_type: string;
  body: string;
  created_at: string;
  metadata_json?: Record<string, unknown> | null;
  actor_display_name?: string;
};

export function ObservationCaseIntelligenceTimeline({
  activities,
  caseRow,
  limit,
  emptyMessage = "Intelligence story starts with intro call debriefs, access wins, and observation notes.",
  onViewAll,
  hideTitle = false,
  title = "Intelligence timeline",
}: {
  activities?: ActivityInput[];
  caseRow?: Record<string, unknown>;
  limit?: number;
  emptyMessage?: string;
  onViewAll?: () => void;
  hideTitle?: boolean;
  title?: string;
}) {
  const timeline = React.useMemo(
    () => buildObservationIntelligenceTimeline({ activities, caseRow, limit }),
    [activities, caseRow, limit],
  );

  return (
    <section
      className="case-obs-intel-timeline"
      aria-labelledby={hideTitle ? undefined : "case-obs-intel-timeline-title"}
    >
      <style dangerouslySetInnerHTML={{ __html: observationCaseIntelligenceTimelineCss }} />

      {hideTitle ? null : (
        <h2 id="case-obs-intel-timeline-title" className="case-obs-detail-card-title">
          {title}
        </h2>
      )}

      {timeline.length === 0 ? (
        <p className="case-obs-intel-timeline-empty">{emptyMessage}</p>
      ) : (
        <ol className="case-obs-intel-timeline-list">
          {timeline.map((event) => (
            <li
              key={event.id}
              className={`case-obs-intel-timeline-item case-obs-intel-timeline-item--${event.kind}`}
            >
              <div className="case-obs-intel-timeline-rail" aria-hidden>
                <span className="case-obs-intel-timeline-dot" />
              </div>
              <div className="case-obs-intel-timeline-body">
                <div className="case-obs-intel-timeline-head">
                  <h3 className="case-obs-intel-timeline-title">{event.title}</h3>
                  <time className="case-obs-intel-timeline-time" dateTime={event.timestamp}>
                    {formatObservationIntelligenceTimelineTime(event.timestamp)}
                  </time>
                </div>
                <p className="case-obs-intel-timeline-detail">{event.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {onViewAll ? (
        <button
          type="button"
          className="case-obs-detail-link-btn case-obs-intel-timeline-link-btn"
          onClick={onViewAll}
        >
          View full timeline
        </button>
      ) : null}
    </section>
  );
}
