import {
  DEBRIEF_COMPLETION_CONTEXT_KEY,
  DEBRIEF_NEXT_STEP_KEY,
  DEBRIEF_VALIDATION_ANALYZED_AT_KEY,
  DEBRIEF_VALIDATION_RESULTS_KEY,
  type DebriefCompletionContext,
  type DebriefCompletionContextSnapshot,
  type DebriefNextStepSnapshot,
  type DebriefPatternValidationResult,
} from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";
import { serializeDebriefCompletionContextForSnapshot } from "@/lib/surgical-sales/engagements/postObservationDebriefCompletion";

const DEBRIEF_COMPLETION_SNAPSHOT_KEYS = [
  DEBRIEF_COMPLETION_CONTEXT_KEY,
  DEBRIEF_VALIDATION_RESULTS_KEY,
  DEBRIEF_NEXT_STEP_KEY,
  DEBRIEF_VALIDATION_ANALYZED_AT_KEY,
] as const;

/** Copy completion-validation extras onto a persisted debrief snapshot record. */
export function applyDebriefCompletionSnapshotExtras(
  record: Record<string, unknown>,
  existingDebriefSnapshot?: unknown,
): Record<string, unknown> {
  if (!existingDebriefSnapshot || typeof existingDebriefSnapshot !== "object" || Array.isArray(existingDebriefSnapshot)) {
    return record;
  }
  const existing = existingDebriefSnapshot as Record<string, unknown>;
  const next = { ...record };
  for (const key of DEBRIEF_COMPLETION_SNAPSHOT_KEYS) {
    if (key in existing) next[key] = existing[key];
  }
  return next;
}

export function mergeDebriefCompletionAnalyzeSnapshot(
  existing: unknown,
  patch: {
    completionContext: DebriefCompletionContext;
    validationResults: DebriefPatternValidationResult[];
    nextStep: DebriefNextStepSnapshot;
    analyzedAt?: string;
  },
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  base[DEBRIEF_COMPLETION_CONTEXT_KEY] = serializeDebriefCompletionContextForSnapshot(
    patch.completionContext,
  );
  base[DEBRIEF_VALIDATION_RESULTS_KEY] = patch.validationResults;
  base[DEBRIEF_NEXT_STEP_KEY] = patch.nextStep;
  base[DEBRIEF_VALIDATION_ANALYZED_AT_KEY] = patch.analyzedAt ?? new Date().toISOString();
  return base;
}

export function readDebriefCompletionContextFromSnapshot(
  debriefSnapshot: unknown,
): DebriefCompletionContextSnapshot | null {
  if (!debriefSnapshot || typeof debriefSnapshot !== "object") return null;
  const raw = (debriefSnapshot as Record<string, unknown>)[DEBRIEF_COMPLETION_CONTEXT_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as DebriefCompletionContextSnapshot;
}

export function readDebriefValidationResultsFromSnapshot(
  debriefSnapshot: unknown,
): DebriefPatternValidationResult[] {
  if (!debriefSnapshot || typeof debriefSnapshot !== "object") return [];
  const raw = (debriefSnapshot as Record<string, unknown>)[DEBRIEF_VALIDATION_RESULTS_KEY];
  if (!Array.isArray(raw)) return [];
  return raw as DebriefPatternValidationResult[];
}

export function readDebriefNextStepFromSnapshot(debriefSnapshot: unknown): DebriefNextStepSnapshot | null {
  if (!debriefSnapshot || typeof debriefSnapshot !== "object") return null;
  const raw = (debriefSnapshot as Record<string, unknown>)[DEBRIEF_NEXT_STEP_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as DebriefNextStepSnapshot;
}
