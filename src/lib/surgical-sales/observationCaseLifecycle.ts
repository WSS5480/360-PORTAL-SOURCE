import { buildObservationFieldInsights } from "@/lib/surgical-sales/buildObservationFieldInsights";
import { countObservationNoteActivities } from "@/lib/surgical-sales/observationCaseWorkflowPhase";
import {
  formatObservationCaseExecutionStatusLabel,
  type ObservationCaseExecutionStatusId,
  resolveObservationCaseExecutionStatus,
} from "@/lib/surgical-sales/observationCaseExecutionStatus";

export type ObservationCaseCompletionSummary = {
  notesCapturedCount: number;
  intelligenceItemsCount: number;
  completedAt: string | null;
};

export function resolveObservationLifecycleStatus(input: {
  caseRow: Record<string, unknown>;
  activities?: Array<{ activity_type?: string }>;
}): ObservationCaseExecutionStatusId {
  return resolveObservationCaseExecutionStatus(input);
}

export function observationLifecycleStatusLabel(
  status: ObservationCaseExecutionStatusId,
): string {
  return formatObservationCaseExecutionStatusLabel(status);
}

export function canStartObservationLifecycle(status: ObservationCaseExecutionStatusId): boolean {
  return status === "scheduled" || status === "rescheduled";
}

export function canReopenObservationLifecycle(status: ObservationCaseExecutionStatusId): boolean {
  return status === "completed" || status === "debrief_planned" || status === "cancelled";
}

export function canRescheduleObservationLifecycle(status: ObservationCaseExecutionStatusId): boolean {
  return status === "scheduled" || status === "in_progress";
}

export function canCancelObservationLifecycle(status: ObservationCaseExecutionStatusId): boolean {
  return status === "scheduled" || status === "in_progress" || status === "rescheduled";
}

export function canMarkObservationCompletedWithoutNotes(
  status: ObservationCaseExecutionStatusId,
): boolean {
  return status === "scheduled";
}

export function canCompleteObservationLifecycle(status: ObservationCaseExecutionStatusId): boolean {
  return status === "in_progress";
}

export function canContinueObservationLifecycle(status: ObservationCaseExecutionStatusId): boolean {
  return status === "in_progress";
}

export function canViewObservationFindings(status: ObservationCaseExecutionStatusId): boolean {
  return status === "completed" || status === "debrief_planned" || status === "closed";
}

export function countObservationIntelligenceItems(input: {
  caseRow: Record<string, unknown>;
  activities?: Array<{
    activity_type?: string;
    body?: string;
    metadata_json?: Record<string, unknown> | null;
  }>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
}): number {
  const priorCases = input.priorCases?.map((row, index) => ({
    ...row,
    id: String(row.id ?? `prior-case-${index}`),
  }));
  return buildObservationFieldInsights({ ...input, priorCases })
    .filter((section) => section.id !== "unknown")
    .reduce((total, section) => total + section.items.length, 0);
}

export function buildObservationCaseCompletionSummary(input: {
  caseRow: Record<string, unknown>;
  activities?: Array<{
    activity_type?: string;
    body?: string;
    metadata_json?: Record<string, unknown> | null;
  }>;
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
}): ObservationCaseCompletionSummary {
  const notesCapturedCount = countObservationNoteActivities(input.activities);
  const intelligenceItemsCount = countObservationIntelligenceItems(input);
  const completedAtRaw = input.caseRow.observation_completed_at;
  const completedAt =
    typeof completedAtRaw === "string" && completedAtRaw.trim() ? completedAtRaw.trim() : null;

  return {
    notesCapturedCount,
    intelligenceItemsCount,
    completedAt,
  };
}

/** DB status values for explicit lifecycle transitions. */
export const OBSERVATION_LIFECYCLE_STATUS = {
  scheduled: "scheduled",
  inProgress: "confirmed",
  completed: "completed",
  rescheduled: "rescheduled",
  cancelled: "cancelled",
} as const;
