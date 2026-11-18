import { buildObservationThingsLearnedLabels } from "@/lib/surgical-sales/observationThingsLearnedFindings";

type NoteActivity = { activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null };

/** Concise field-friendly findings derived from captured notes. */
export function buildObservationThingsLearned(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
}): string[] {
  return buildObservationThingsLearnedLabels(input);
}

export function observationThingsLearnedHasContent(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
}): boolean {
  return buildObservationThingsLearned(input).length > 0;
}
