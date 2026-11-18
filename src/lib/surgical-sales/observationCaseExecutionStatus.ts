export const OBSERVATION_CASE_EXECUTION_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "rescheduled",
  "cancelled",
  "debrief_planned",
  "closed",
] as const;

export type ObservationCaseExecutionStatusId = (typeof OBSERVATION_CASE_EXECUTION_STATUSES)[number];

const EXECUTION_STATUS_LABELS: Record<ObservationCaseExecutionStatusId, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
  debrief_planned: "Debrief Planned",
  closed: "Closed",
};

type NoteActivity = { activity_type?: string };

function observationHasDebriefPlanned(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
}): boolean {
  const activities = input.activities ?? [];
  if (
    activities.some(
      (activity) => String(activity.activity_type ?? "").trim().toLowerCase() === "provider_debrief_planned",
    )
  ) {
    return true;
  }
  if (String(input.caseRow.debrief_suggested_next_action ?? "").trim()) return true;
  if (input.caseRow.debrief_convert_to_product_support_case === true) return true;
  return false;
}

/** Rep-facing execution status — not a readiness or access gate. */
export function resolveObservationCaseExecutionStatus(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
}): ObservationCaseExecutionStatusId {
  const status = String(input.caseRow.status ?? "").trim().toLowerCase();

  if (status === "cancelled") {
    return "cancelled";
  }

  if (status === "closed") {
    return "closed";
  }

  if (status === "rescheduled") {
    return "rescheduled";
  }

  if (observationHasDebriefPlanned(input)) {
    return "debrief_planned";
  }

  if (status === "completed") {
    return "completed";
  }

  if (status === "confirmed") {
    return "in_progress";
  }

  return "scheduled";
}

export function formatObservationCaseExecutionStatusLabel(
  status: ObservationCaseExecutionStatusId,
): string {
  return EXECUTION_STATUS_LABELS[status];
}

export function observationCaseShowsDebriefPlanning(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
}): boolean {
  const executionStatus = resolveObservationCaseExecutionStatus(input);
  return executionStatus === "completed" || executionStatus === "debrief_planned";
}
