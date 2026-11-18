"use client";

import { ObservationCaseNoteLog } from "./ObservationCaseNoteLog";

type ActivityInput = {
  id: string;
  activity_type: string;
  body: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
  actor_display_name?: string;
};

export function CaseObservationActivityTimeline({
  activities,
}: {
  activities?: ActivityInput[];
  caseRow?: Record<string, unknown>;
  defaultActor?: string;
}) {
  return <ObservationCaseNoteLog activities={activities} />;
}
