"use client";

import React from "react";
import { ObservationCaseIntelligenceTimeline } from "./ObservationCaseIntelligenceTimeline";

type ActivityInput = {
  id: string;
  activity_type: string;
  body: string;
  created_at: string;
  metadata_json?: Record<string, unknown> | null;
  actor_display_name?: string;
};

/** @deprecated Use ObservationCaseIntelligenceTimeline */
export function ObservationCaseFeed({
  activities,
  caseRow,
  limit,
  emptyMessage,
  onViewAll,
  hideTitle,
}: {
  activities?: ActivityInput[];
  caseRow?: Record<string, unknown>;
  limit?: number;
  emptyMessage?: string;
  onViewAll?: () => void;
  hideTitle?: boolean;
}) {
  return (
    <ObservationCaseIntelligenceTimeline
      activities={activities}
      caseRow={caseRow}
      limit={limit}
      emptyMessage={emptyMessage}
      onViewAll={onViewAll}
      hideTitle={hideTitle}
    />
  );
}
