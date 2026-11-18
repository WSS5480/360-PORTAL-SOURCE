/**
 * Unified rep-facing finding counts and repetition language for Observation Intelligence.
 * Validation is based on completed observations; in-progress repeats are surfaced separately.
 */

import type { AggregatedFindingEvidence } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";
import type { IntelligenceSignal } from "@/lib/surgical-sales/caseIntelligenceSignals";
import { countCompletedObservationCases } from "@/lib/surgical-sales/observationProgramGate";
import { staffEfficiencyRepLabel } from "@/lib/surgical-sales/staffEfficiencyRepLabels";

export type RepFindingEvidenceCounts = {
  observationCount: number;
  completedObservationCount: number;
  capturedFromCurrentNote: boolean;
};

export const REP_PENDING_CURRENT_OBSERVATION =
  "Also noted in this case (not yet marked complete)";

/** Case rows only — never profile observation_count. Used to gate completed-case copy. */
export function repProgramCompletedCaseCountFromCases(input: {
  caseRow: Record<string, unknown>;
  priorCases?: Array<Record<string, unknown>>;
}): number {
  return countCompletedObservationCases(input.caseRow, input.priorCases ?? []);
}

export function repDisplayCompletedObservationCount(
  finding: AggregatedFindingEvidence,
  programCompletedCount: number,
): number {
  return Math.min(
    Math.max(0, finding.completedObservationCount),
    Math.max(0, programCompletedCount),
  );
}

export function repFindingCountsFromFinding(
  finding: AggregatedFindingEvidence,
  programCompletedCount?: number,
): RepFindingEvidenceCounts {
  const completedObservationCount =
    programCompletedCount === undefined
      ? finding.completedObservationCount
      : repDisplayCompletedObservationCount(finding, programCompletedCount);

  return {
    observationCount: finding.observationCount,
    completedObservationCount,
    capturedFromCurrentNote: finding.capturedFromCurrentNote,
  };
}

export function repFindingCountsFromSignal(signal: IntelligenceSignal): RepFindingEvidenceCounts {
  return {
    observationCount: signal.evidenceCount,
    completedObservationCount: signal.completedCaseCount,
    capturedFromCurrentNote: false,
  };
}

/** Completed-case count for rep-facing validation copy — never inflates with in-progress notes. */
export function repCompletedCaseCount(
  counts: RepFindingEvidenceCounts,
  options?: { includeCurrentCaseIfComplete?: boolean },
): number {
  void options;
  return Math.max(0, counts.completedObservationCount);
}

export function hasPendingRepeatInCurrentCase(counts: RepFindingEvidenceCounts): boolean {
  return counts.observationCount > counts.completedObservationCount;
}

export function formatRepCompletedCasesPhrase(completedCount: number): string {
  if (completedCount >= 3) return `across ${completedCount} completed cases`;
  if (completedCount === 2) return "across 2 completed cases";
  if (completedCount === 1) return "in 1 completed case";
  return "";
}

export function appendRepPendingSuffix(
  line: string,
  counts: RepFindingEvidenceCounts,
): string {
  if (!line || !hasPendingRepeatInCurrentCase(counts)) return line;
  return `${line} · ${REP_PENDING_CURRENT_OBSERVATION}`;
}

function capitalizeTopic(topic: string): string {
  if (!topic) return topic;
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}

export function repWorkflowTopicFromLabel(label: string): string {
  return label
    .replace(/\s+observed$/i, "")
    .replace(/^visualization challenge before fixation$/i, "visualization before fixation")
    .replace(/^workflow delay$/i, "workflow delay")
    .trim()
    .toLowerCase();
}

export function formatRepObservedWithCompletedCount(baseLabel: string, completedCount: number): string {
  const base = baseLabel.replace(/\s+observed$/i, "").trim();
  if (completedCount >= 2) {
    return `${base} observed ${formatRepCompletedCasesPhrase(completedCount)}`;
  }
  if (completedCount === 1) {
    return `${base} observed in 1 completed case`;
  }
  return baseLabel;
}

export function formatRepProviderHistoryWorkflowLine(
  topic: string,
  counts: RepFindingEvidenceCounts,
): string {
  const completed = repCompletedCaseCount(counts);
  const display = capitalizeTopic(topic);
  if (completed >= 2) {
    return appendRepPendingSuffix(
      `${display} observed ${formatRepCompletedCasesPhrase(completed)}`,
      counts,
    );
  }
  if (completed === 1) {
    return appendRepPendingSuffix(`${display} observed in 1 completed case`, counts);
  }
  return "";
}

export function formatRepProviderHistoryProductLine(
  product: string,
  counts: RepFindingEvidenceCounts,
): string {
  const completed = repCompletedCaseCount(counts);
  const name = product.replace(/\s+observed$/i, "").trim();
  if (completed >= 2) {
    return appendRepPendingSuffix(
      `${name} observed ${formatRepCompletedCasesPhrase(completed)}`,
      counts,
    );
  }
  if (completed === 1) {
    return appendRepPendingSuffix(`${name} observed in 1 completed case`, counts);
  }
  return "";
}

export function formatRepStaffPositiveLine(
  label: string,
  counts: RepFindingEvidenceCounts,
): string {
  const repLabel = staffEfficiencyRepLabel(label);
  const completed = repCompletedCaseCount(counts);
  if (completed >= 2) {
    return appendRepPendingSuffix(`${repLabel} across completed cases`, counts);
  }
  if (completed === 1) {
    return appendRepPendingSuffix(repLabel, counts);
  }
  return repLabel;
}

export function formatRepBriefingPriorCountSuffix(completedCount: number): string | null {
  if (completedCount >= 3) return ` across ${completedCount} completed cases`;
  if (completedCount === 2) return " in multiple completed cases";
  if (completedCount === 1) return " in 1 completed case";
  return null;
}

export function formatRepPriorEvidenceCountPhrase(completedCount: number): string {
  if (completedCount >= 2) {
    return `observed in ${completedCount} completed cases`;
  }
  if (completedCount === 1) {
    return "observed in 1 completed case";
  }
  return "observed once";
}
