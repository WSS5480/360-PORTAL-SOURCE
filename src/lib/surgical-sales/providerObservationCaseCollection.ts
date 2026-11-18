import {
  formatObservationCaseExecutionStatusLabel,
  resolveObservationCaseExecutionStatus,
} from "@/lib/surgical-sales/observationCaseExecutionStatus";
import { buildProviderObservationCaseWorkflowHref } from "@/lib/surgical-sales/providerDirectoryLinks";
import { PROVIDER_OBSERVATION_TARGET } from "@/lib/surgical-sales/providerObservationProgress";

export type ProviderObservationCasePreview = {
  caseId: string;
  procedureLabel: string | null;
  dateTimeLabel: string | null;
  caseDate: string | null;
  caseTime: string | null;
  facilityLabel: string;
  statusLabel: string;
};

/** @deprecated Use ProviderObservationCasePreview */
export type ProviderMissionBoardObservationCasePreview = ProviderObservationCasePreview;

export type ProviderObservationCaseRollup = {
  completedCount: number;
  upcomingCount: number;
  progressTotal: number;
  scheduledCases: ProviderObservationCasePreview[];
  nextScheduled: ProviderObservationCasePreview | null;
};

const ACTIVE_OBSERVATION_CASE_STATUSES = new Set([
  "draft",
  "planned",
  "scheduled",
  "confirmed",
  "in_progress",
  "active",
  "booked",
  "rescheduled",
]);

function observationCaseSortKey(row: Record<string, unknown>): number {
  const date = String(row.case_date ?? "").trim().slice(0, 10);
  if (!date) return Number.POSITIVE_INFINITY;
  const time = String(row.case_time ?? "12:00").trim().slice(0, 5) || "12:00";
  const parsed = new Date(`${date}T${time}:00`).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function formatObservationDateTimeLabel(caseRow: Record<string, unknown>): string | null {
  const date = String(caseRow.case_date ?? "").trim().slice(0, 10);
  if (!date) return null;

  const parsed = new Date(`${date}T12:00:00`);
  const dateLabel = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const time = String(caseRow.case_time ?? "").trim().slice(0, 5);
  if (!time) return dateLabel;
  return `${dateLabel} · ${time}`;
}

export function isIncompleteObservationCase(row: Record<string, unknown>): boolean {
  if (String(row.case_type || "").toLowerCase() !== "observation") return false;
  const status = String(row.status || "").toLowerCase();
  return status !== "cancelled" && status !== "canceled" && status !== "completed";
}

/** All incomplete observation cases, soonest first. */
export function resolveScheduledObservationCases(
  cases: Array<Record<string, unknown>> | undefined,
): Array<Record<string, unknown>> {
  const upcoming = (cases ?? []).filter(isIncompleteObservationCase);
  return [...upcoming].sort((a, b) => observationCaseSortKey(a) - observationCaseSortKey(b));
}

/** @deprecated Use resolveScheduledObservationCases()[0] */
export function resolveNextScheduledObservationCase(
  cases: Array<Record<string, unknown>> | undefined,
): Record<string, unknown> | null {
  return resolveScheduledObservationCases(cases)[0] ?? null;
}

export function buildProviderObservationCasePreview(input: {
  caseRow: Record<string, unknown>;
  facilityLabel: string;
}): ProviderObservationCasePreview {
  const executionStatus = resolveObservationCaseExecutionStatus({ caseRow: input.caseRow });
  const procedure = String(input.caseRow.procedure_type ?? "").trim();

  return {
    caseId: String(input.caseRow.id ?? ""),
    procedureLabel: procedure || null,
    dateTimeLabel: formatObservationDateTimeLabel(input.caseRow),
    caseDate: String(input.caseRow.case_date ?? "").trim().slice(0, 10) || null,
    caseTime: String(input.caseRow.case_time ?? "").trim().slice(0, 5) || null,
    facilityLabel: input.facilityLabel.trim() || "No organization",
    statusLabel: formatObservationCaseExecutionStatusLabel(executionStatus),
  };
}

/** @deprecated Use buildProviderObservationCasePreview */
export const buildMissionBoardObservationCasePreview = buildProviderObservationCasePreview;

export function buildProviderObservationCaseRollup(input: {
  cases?: Array<Record<string, unknown>>;
  facilityLabel: string;
  completedCount?: number;
  progressTotal?: number;
}): ProviderObservationCaseRollup {
  const scheduledCases = resolveScheduledObservationCases(input.cases).map((caseRow) =>
    buildProviderObservationCasePreview({ caseRow, facilityLabel: input.facilityLabel }),
  );

  return {
    completedCount: Math.max(0, input.completedCount ?? 0),
    upcomingCount: scheduledCases.length,
    progressTotal: input.progressTotal ?? PROVIDER_OBSERVATION_TARGET,
    scheduledCases,
    nextScheduled: scheduledCases[0] ?? null,
  };
}

/** @deprecated Use buildProviderObservationCaseRollup().nextScheduled */
export function resolveMissionBoardObservationCasePreview(input: {
  cases?: Array<Record<string, unknown>>;
  facilityLabel: string;
}): ProviderObservationCasePreview | null {
  return buildProviderObservationCaseRollup(input).nextScheduled;
}

export function observationQueuePrimaryLabel(upcomingCount: number): string {
  if (upcomingCount <= 0) return "Add Observation Case";
  if (upcomingCount === 1) return "Open Next Observation";
  return `View Observation Queue (${upcomingCount})`;
}

export function buildProviderObservationCaseQueueHref(providerId: string): string {
  const id = String(providerId ?? "").trim();
  const params = new URLSearchParams({
    surgeon_contact_id: id,
    case_type: "observation",
  });
  return `/portal/sales/cases?${params.toString()}`;
}

export function observationQueuePrimaryHref(input: {
  providerId: string;
  rollup: ProviderObservationCaseRollup;
}): string {
  if (input.rollup.upcomingCount <= 0) {
    return "";
  }
  if (input.rollup.upcomingCount === 1 && input.rollup.nextScheduled?.caseId) {
    return buildProviderObservationCaseWorkflowHref(input.rollup.nextScheduled.caseId);
  }
  return buildProviderObservationCaseQueueHref(input.providerId);
}

export function formatObservationProgressSummary(rollup: ProviderObservationCaseRollup): string {
  const completed = Math.min(rollup.progressTotal, rollup.completedCount);
  const parts = [`${completed} of ${rollup.progressTotal} complete`];
  if (rollup.upcomingCount > 0) {
    parts.push(`${rollup.upcomingCount} scheduled`);
  }
  return parts.join(" · ");
}

export function resolveProviderObservationRollupFromDirectoryRow(input: {
  provider: {
    observation_count?: number;
    observation_cases?: ProviderObservationCaseRollup | null;
    primary_organization_name?: string | null;
  };
  cases?: Array<Record<string, unknown>>;
  facilityLabel?: string;
}): ProviderObservationCaseRollup {
  if (input.provider.observation_cases) {
    const rollup = input.provider.observation_cases;
    const completedCount = Math.max(
      rollup.completedCount,
      input.provider.observation_count ?? 0,
    );
    if (completedCount === rollup.completedCount) return rollup;
    return { ...rollup, completedCount };
  }

  return buildProviderObservationCaseRollup({
    cases: input.cases,
    facilityLabel:
      input.facilityLabel ??
      (String(input.provider.primary_organization_name ?? "").trim() || "No organization"),
    completedCount: input.provider.observation_count,
  });
}

export function isScheduledObservationCaseStatus(status: string | null | undefined): boolean {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return ACTIVE_OBSERVATION_CASE_STATUSES.has(normalized);
}
