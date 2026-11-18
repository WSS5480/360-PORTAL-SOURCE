"use client";

import React from "react";
import {
  formatObservationGroupedActivityTime,
  groupObservationActivities,
} from "@/lib/surgical-sales/buildObservationGroupedActivity";
import { PRODUCT_SUPPORT_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/productSupportCaseDetailVocabulary";
import { productSupportObservationClassificationLabel } from "@/lib/surgical-sales/productSupportObservationTimeline";

type ActivityInput = {
  id: string;
  activity_type: string;
  body: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
  actor_display_name?: string;
};

export function ProductSupportCaseActivity({
  activities,
  defaultActor,
}: {
  activities?: ActivityInput[];
  defaultActor?: string;
}) {
  const items = React.useMemo(
    () => groupObservationActivities(activities, defaultActor ?? "Rep", 50),
    [activities, defaultActor],
  );

  const classificationByActivityId = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const activity of activities ?? []) {
      const label = productSupportObservationClassificationLabel(activity.metadata_json);
      if (label) map.set(activity.id, label);
    }
    return map;
  }, [activities]);

  return (
    <section className="case-ps-detail-card" aria-labelledby="case-ps-activity-title">
      <h2 id="case-ps-activity-title" className="case-ps-detail-card-title">
        {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.observationTimeline}
      </h2>
      {items.length > 0 ? (
        <div className="case-ps-activity-timeline">
          {items.map((item) => {
            const sourceActivityId = item.id.startsWith("group:") ? item.id.split(":")[1] : item.id;
            const classification = classificationByActivityId.get(sourceActivityId ?? item.id);
            const label = classification ?? item.label;
            return (
            <div key={item.id} className="case-ps-activity-item">
              <div className="case-ps-activity-row">
                <span className="case-ps-activity-label">{label}</span>
                <time className="case-ps-activity-time" dateTime={item.timestamp}>
                  {formatObservationGroupedActivityTime(item.timestamp)}
                </time>
              </div>
              {item.preview ? <p className="case-ps-activity-preview">{item.preview}</p> : null}
              <span className="case-ps-activity-actor">{item.actor}</span>
            </div>
            );
          })}
        </div>
      ) : (
        <p className="case-ps-detail-card-empty">No activity yet.</p>
      )}
    </section>
  );
}
