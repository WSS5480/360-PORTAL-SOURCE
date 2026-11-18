import { hasObservationIntelligenceContent } from "@/lib/surgical-sales/buildObservationIntelligenceView";

export type ObservationCaseWorkflowPhase = "prepare" | "observe" | "debrief";

type NoteActivity = { activity_type?: string };

export function countObservationNoteActivities(activities: NoteActivity[] | undefined): number {
  return (activities ?? []).filter(
    (activity) => String(activity.activity_type ?? "").trim().toLowerCase() === "note",
  ).length;
}

export function hasObservationNotesCaptured(
  activities: NoteActivity[] | undefined,
  caseRow: Record<string, unknown>,
): boolean {
  if (hasObservationIntelligenceContent(caseRow)) return true;
  return countObservationNoteActivities(activities) > 0;
}

/** Rep workflow phase — do not surface future-phase UI before it is needed. */
export function resolveObservationCaseWorkflowPhase(input: {
  activities?: NoteActivity[];
  caseRow: Record<string, unknown>;
  readyForDebrief?: boolean;
}): ObservationCaseWorkflowPhase {
  const hasNotes = hasObservationNotesCaptured(input.activities, input.caseRow);
  if (!hasNotes) return "prepare";
  if (input.readyForDebrief) return "debrief";
  return "observe";
}

export function observationCasePhaseShowsPostCaptureSections(phase: ObservationCaseWorkflowPhase): boolean {
  return phase === "observe" || phase === "debrief";
}
