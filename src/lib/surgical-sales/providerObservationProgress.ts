import { formatEngagementTouchWhenLabel } from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { observationCountFromProviderContact } from "@/lib/surgical-sales/observationCaseCompletion";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  countObservedProcedures,
  type PathwayGateInput,
} from "@/lib/surgical-sales/pathwayStageGates";
import { SALES_PATHWAY_MIN_OBSERVATIONS } from "@/lib/surgical-sales/salesPathwayCanonical";

export const PROVIDER_OBSERVATION_TARGET = SALES_PATHWAY_MIN_OBSERVATIONS;

export const SCHEDULE_FIRST_OBSERVATION_LABEL = "Add First Observation Case";
export const SCHEDULE_NEXT_OBSERVATION_LABEL = "Add Next Observation Case";
export const PREPARE_DEBRIEF_LABEL = "Prepare Debrief";
export const CREATE_DEBRIEF_STRATEGY_LABEL = PREPARE_DEBRIEF_LABEL;
export const OBSERVATION_PROGRESS_HEADING = "Observation Program Progress";

const OBSERVATION_SERIES_ENGAGEMENT_TYPES = new Set(["or_visit", "or_observation", "observation_request"]);

export type ProviderObservationProgress = {
  /** Completed observations on file — canonical count for pathway rules. */
  completedObservationCount: number;
  completed: number;
  total: number;
  debriefReady: boolean;
  /** Compact progress label — e.g. "2 / 5". */
  summaryLabel: string;
  /** Full display line — e.g. "Observation Progress: 2 / 5". */
  displayLabel: string;
  /** Same as summaryLabel — used by overview badges. */
  label: string;
  remaining: number;
  nextObservationDateLabel: string | null;
};

const OBSERVATION_TOUCH_TYPES = new Set(["or_visit", "or_observation"]);

const SCHEDULED_OBSERVATION_STATUSES = new Set([
  "planned",
  "scheduled",
  "confirmed",
  "in_progress",
  "active",
  "booked",
]);

function formatWhenLabel(raw: string | null | undefined): string | null {
  const when = String(raw ?? "").trim();
  if (!when || /^(date tbd|tbd|none scheduled)$/i.test(when)) return null;
  return when;
}

function isObservationTouchType(type: string): boolean {
  return OBSERVATION_TOUCH_TYPES.has(normalizeEngagementType(type));
}

function isScheduledObservationEngagement(engagement: ProviderEngagementSummary): boolean {
  const status = String(engagement.status ?? "").toLowerCase();
  if (!SCHEDULED_OBSERVATION_STATUSES.has(status)) return false;
  return isObservationTouchType(String(engagement.engagement_type ?? ""));
}

function sortScheduledObservationEngagements(
  engagements: ProviderEngagementSummary[],
): ProviderEngagementSummary[] {
  return [...engagements].sort((a, b) => {
    const ta = a.scheduled_at || (a.engagement_date ? `${a.engagement_date}T12:00:00` : "");
    const tb = b.scheduled_at || (b.engagement_date ? `${b.engagement_date}T12:00:00` : "");
    if (!ta && !tb) return 0;
    if (!ta) return 1;
    if (!tb) return -1;
    return new Date(ta).getTime() - new Date(tb).getTime();
  });
}

/** Next scheduled observation date label for progress cards. */
export function resolveNextObservationDateLabel(input: {
  upcomingEngagement?: {
    engagement_type?: string | null;
    datetime_label?: string | null;
  } | null;
  engagements?: ProviderEngagementSummary[];
}): string | null {
  const upcoming = input.upcomingEngagement;
  if (upcoming && isObservationTouchType(String(upcoming.engagement_type ?? ""))) {
    const label = formatWhenLabel(upcoming.datetime_label);
    if (label) return label;
  }

  const candidates = (input.engagements ?? []).filter(isScheduledObservationEngagement);
  const next = sortScheduledObservationEngagements(candidates)[0] ?? null;

  if (!next) return null;
  return formatWhenLabel(formatEngagementTouchWhenLabel(next));
}

/** Completed OR observations on file — not calendar recency alone. */
export function countProviderObservations(input: PathwayGateInput): number {
  return countObservedProcedures(input);
}

export function deriveProviderObservationCount(p: ProviderDirectoryRow): number {
  return observationCountFromProviderContact(p as Record<string, unknown>);
}

/** Alias — completed observations on file for pathway stage rules. */
export function deriveCompletedObservationCount(p: ProviderDirectoryRow): number {
  return deriveProviderObservationCount(p);
}

export function formatObservationProgressLine(
  completed: number,
  total: number = PROVIDER_OBSERVATION_TARGET,
): string {
  const clamped = Math.min(total, Math.max(0, completed));
  return `${OBSERVATION_PROGRESS_HEADING}: ${clamped} / ${total}`;
}

export function resolveObservationStageNextActionLabel(completed: number): string {
  if (completed >= PROVIDER_OBSERVATION_TARGET) return PREPARE_DEBRIEF_LABEL;
  if (completed <= 0) return SCHEDULE_FIRST_OBSERVATION_LABEL;
  if (completed === PROVIDER_OBSERVATION_TARGET - 1) {
    return `Add Observation Case ${PROVIDER_OBSERVATION_TARGET}`;
  }
  return SCHEDULE_NEXT_OBSERVATION_LABEL;
}

/** Rep-facing recommended next step on provider observation progress. */
export function resolveObservationProgressRecommendedStep(completed: number): string {
  if (completed <= 0) return "Helpful next step: Schedule first observation";
  if (completed < PROVIDER_OBSERVATION_TARGET) {
    return "Helpful next step: Complete remaining observations";
  }
  return "Ready to generate provider debrief";
}

/** Observation-series touches should not surface debrief workflow until five are complete. */
export function observationSeriesEngagementEligibleForDebrief(
  engagementType: string | null | undefined,
  completedObservationCount: number,
): boolean {
  const type = normalizeEngagementType(String(engagementType ?? ""));
  if (!type || !OBSERVATION_SERIES_ENGAGEMENT_TYPES.has(type)) return true;
  return completedObservationCount >= PROVIDER_OBSERVATION_TARGET;
}

export function providerDebriefReady(p: ProviderDirectoryRow): boolean {
  return deriveProviderObservationCount(p) >= PROVIDER_OBSERVATION_TARGET;
}

export function buildProviderObservationProgress(
  count: number,
  total: number = PROVIDER_OBSERVATION_TARGET,
  nextObservationDateLabel: string | null = null,
): ProviderObservationProgress {
  const completed = Math.min(total, Math.max(0, count));
  const debriefReady = count >= total;
  const summaryLabel = `${completed} / ${total}`;
  const displayLabel = formatObservationProgressLine(completed, total);

  return {
    completedObservationCount: completed,
    completed,
    total,
    debriefReady,
    summaryLabel,
    displayLabel,
    label: summaryLabel,
    remaining: Math.max(0, total - completed),
    nextObservationDateLabel,
  };
}

export function providerObservationProgressFromRow(
  p: ProviderDirectoryRow,
): ProviderObservationProgress {
  return buildProviderObservationProgress(
    deriveProviderObservationCount(p),
    PROVIDER_OBSERVATION_TARGET,
    resolveNextObservationDateLabel({
      upcomingEngagement: p.upcoming_engagement,
    }),
  );
}

export function formatProviderObservationProgressLabel(
  completed: number,
  total: number = PROVIDER_OBSERVATION_TARGET,
): string {
  return buildProviderObservationProgress(completed, total).summaryLabel;
}

export function providerObservationProgressFromDirectoryRow(
  p: ProviderDirectoryRow,
): ProviderObservationProgress | null {
  const count = deriveProviderObservationCount(p);
  if (count <= 0 && p.relationship_pathway_stage_id !== "observe") return null;
  return providerObservationProgressFromRow(p);
}
