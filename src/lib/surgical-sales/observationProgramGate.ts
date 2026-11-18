import { buildProviderDebriefPlan } from "@/lib/surgical-sales/engagements/buildProviderDebriefPlan";
import type { ProviderDebriefPlanActivityInput } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import {
  isObservationCaseComplete,
  observationCountFromProviderContact,
} from "@/lib/surgical-sales/observationCaseCompletion";
import {
  buildProviderObservationProgress,
  PROVIDER_OBSERVATION_TARGET,
  type ProviderObservationProgress,
} from "@/lib/surgical-sales/providerObservationProgress";

export { isObservationCaseComplete };

export const OBSERVATION_PROGRAM_PROGRESS_HEADING = "Observation Program Progress";
export const GENERATE_DEBRIEF_LABEL = "Prepare Debrief";
export const OBSERVATION_DEBRIEF_UNLOCK_THRESHOLD = PROVIDER_OBSERVATION_TARGET;

export function formatObservationProgramProgressCount(
  completed: number,
  total: number = OBSERVATION_DEBRIEF_UNLOCK_THRESHOLD,
): string {
  const clamped = Math.min(total, Math.max(0, completed));
  return `${clamped} / ${total} Complete`;
}

export function providerObservationProgramDebriefUnlocked(
  completedCount: number,
  total: number = OBSERVATION_DEBRIEF_UNLOCK_THRESHOLD,
): boolean {
  return completedCount >= total;
}

export function countCompletedObservationCases(
  caseRow: Record<string, unknown>,
  priorCases: Array<Record<string, unknown>> | undefined,
): number {
  const completed = (row: Record<string, unknown>) => isObservationCaseComplete(row);

  const currentId = String(caseRow.id ?? "").trim();
  const mergedPriorCases = (priorCases ?? []).map((row) => {
    const rowId = String(row.id ?? "").trim();
    if (currentId && rowId === currentId) {
      return { ...row, ...caseRow };
    }
    return row;
  });
  const priorIds = new Set(mergedPriorCases.map((row) => String(row.id ?? "").trim()).filter(Boolean));

  let count = mergedPriorCases.filter(completed).length;
  if (completed(caseRow) && (!currentId || !priorIds.has(currentId))) {
    count += 1;
  }
  return count;
}

export function resolveProviderCompletedObservationCount(input: {
  providerContact?: Record<string, unknown> | null;
  caseRow: Record<string, unknown>;
  priorCases?: Array<Record<string, unknown>>;
}): number {
  const caseBasedCount = countCompletedObservationCases(input.caseRow, input.priorCases);
  const fromProvider = observationCountFromProviderContact(input.providerContact);
  const currentComplete = isObservationCaseComplete(input.caseRow);

  if (currentComplete) {
    return Math.max(caseBasedCount, fromProvider);
  }

  // Provider counts can include the in-progress current case before it is marked complete.
  if (fromProvider === caseBasedCount + 1) {
    return caseBasedCount;
  }

  if (fromProvider > caseBasedCount) {
    return fromProvider;
  }

  if (fromProvider > 0) return fromProvider;
  return caseBasedCount;
}

export function resolveObservationProgramProgress(input: {
  providerContact?: Record<string, unknown> | null;
  caseRow: Record<string, unknown>;
  priorCases?: Array<Record<string, unknown>>;
}): ProviderObservationProgress {
  const count = resolveProviderCompletedObservationCount(input);
  return buildProviderObservationProgress(count, OBSERVATION_DEBRIEF_UNLOCK_THRESHOLD);
}

export type ObservationProgramDebriefPreview = {
  topics: string[];
  validatedFindingCount: number;
  observationCasesIncluded: number;
};

export function buildObservationProgramDebriefPreview(input: {
  caseRow: Record<string, unknown>;
  activities?: ProviderDebriefPlanActivityInput[];
  providerContact?: Record<string, unknown> | null;
  priorCases?: Array<Record<string, unknown>>;
}): ObservationProgramDebriefPreview | null {
  const progress = resolveObservationProgramProgress(input);
  if (!progress.debriefReady) return null;

  const plan = buildProviderDebriefPlan({
    caseRow: input.caseRow,
    activities: input.activities ?? [],
    providerContact: input.providerContact ?? null,
    priorObservationCases: input.priorCases ?? [],
  });

  const objectiveTopics = plan.suggestedObjectives.map((objective) => objective.text).filter(Boolean);
  const learningTopics = plan.whatWeLearned
    .filter((item) => item.confidence !== "Low")
    .map((item) => item.signal)
    .filter(Boolean);
  const topics = [...new Set([...objectiveTopics, ...learningTopics])].slice(0, 6);

  return {
    topics,
    validatedFindingCount: plan.whatWeLearned.length,
    observationCasesIncluded: progress.completed,
  };
}
