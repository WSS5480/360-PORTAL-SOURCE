"use client";

import React from "react";
import {
  buildProductSupportObservationTimelineEntries,
  formatProductSupportTimelineTime,
} from "@/lib/surgical-sales/buildProductSupportObservationTimelineEntries";
import { PRODUCT_SUPPORT_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/productSupportCaseDetailVocabulary";

type ActivityInput = {
  id: string;
  activity_type: string;
  body: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
  actor_display_name?: string;
};

export function ProductSupportCaseTimeline({
  activities,
  defaultActor,
}: {
  activities?: ActivityInput[];
  defaultActor?: string;
}) {
  const entries = React.useMemo(
    () => buildProductSupportObservationTimelineEntries(activities, defaultActor ?? "Rep", 50),
    [activities, defaultActor],
  );

  return (
    <section className="case-ps-detail-card" aria-labelledby="case-ps-timeline-title">
      <h2 id="case-ps-timeline-title" className="case-ps-detail-card-title">
        {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.observationTimeline}
      </h2>
      {entries.length > 0 ? (
        <div className="case-ps-timeline">
          {entries.map((entry) => (
            <article key={entry.id} className="case-ps-timeline-item" data-kind={entry.kind}>
              <div className="case-ps-timeline-row">
                <span className="case-ps-timeline-label">{entry.label}</span>
                <time className="case-ps-timeline-time" dateTime={entry.timestamp}>
                  {formatProductSupportTimelineTime(entry.timestamp)}
                </time>
              </div>
              {entry.body ? <p className="case-ps-timeline-body">{entry.body}</p> : null}
              <span className="case-ps-timeline-actor">{entry.actor}</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="case-ps-detail-card-empty">Capture an observation to start the timeline.</p>
      )}
    </section>
  );
}
