import { buildEngagementHubHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import { buildEngagementCompletedSummary } from "@/lib/surgical-sales/engagements/buildEngagementDetailHub";
import {
  formatEngagementDebriefDisplayStatus,
  formatEngagementDisplayStatusForRow,
  formatEngagementPreparationDisplayStatus,
  isEngagementPreparationApplicable,
} from "@/lib/surgical-sales/engagements/engagementStatusDisplay";
import type { ProviderEngagementSummary } from "./providerEngagementSummary";
import {
  assessEngagementSalesExecutionNeedsAction,
  engagementRecordNeedsAction,
} from "@/lib/surgical-sales/salesExecutionNeedsAction";

export { engagementNotesHaveTacticalDebrief } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { isUpcomingEngagementStatus } from "./providerEngagementSummary";
import { formatEngagementTabDateLabel } from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";

export function formatEngagementTabWhen(row: ProviderEngagementSummary): string {
  return formatEngagementTabDateLabel(row);
}

/** List/index secondary column — preparation before execution, debrief or outcome after. */
export function formatEngagementTabPrepStatus(row: ProviderEngagementSummary): string {
  if (row.is_legacy_draft) return "—";
  const prep = formatEngagementPreparationDisplayStatus(row);
  if (prep) return prep;
  return formatEngagementDisplayStatusForRow(row);
}

export function formatEngagementTabOutcomeLabel(row: ProviderEngagementSummary): string | null {
  const summary = buildEngagementCompletedSummary(row as unknown as Record<string, unknown>);
  return summary.outcome;
}

export function formatEngagementTabDebriefStatus(row: ProviderEngagementSummary): string {
  if (row.is_legacy_draft) return "—";
  return formatEngagementDebriefDisplayStatus(row) ?? "—";
}

export type ProviderEngagementTabIndexField = {
  label: string;
  value: string;
};

export function resolveProviderEngagementTabIndexField(
  row: ProviderEngagementSummary,
): ProviderEngagementTabIndexField {
  if (row.is_legacy_draft) {
    return { label: "Preparation status", value: "—" };
  }
  if (isEngagementPreparationApplicable(row)) {
    return {
      label: "Status",
      value: formatEngagementDisplayStatusForRow(row),
    };
  }
  return {
    label: "Status",
    value: formatEngagementDisplayStatusForRow(row),
  };
}

export const PROVIDER_ENGAGEMENT_TAB_OPEN_LABEL = "Open";

export type ProviderEngagementTabRowModel = {
  row: ProviderEngagementSummary;
  typeLabel: string;
  whenLabel: string;
  statusLabel: string;
  prepStatusLabel: string;
  indexField: ProviderEngagementTabIndexField;
  openHref: string;
  isLegacy: boolean;
};

export function buildProviderEngagementTabRowModel(
  row: ProviderEngagementSummary,
  _providerId: string,
): ProviderEngagementTabRowModel {
  const isLegacy = Boolean(row.is_legacy_draft);
  const indexField = resolveProviderEngagementTabIndexField(row);

  return {
    row,
    typeLabel: row.engagement_type_label,
    whenLabel: formatEngagementTabWhen(row) || "—",
    statusLabel: isLegacy ? "Draft" : row.status_label?.trim() || "—",
    prepStatusLabel: formatEngagementTabPrepStatus(row),
    indexField,
    openHref: isLegacy && row.legacy_new_engagement_href
      ? row.legacy_new_engagement_href
      : buildEngagementHubHref(row.id),
    isLegacy,
  };
}

export function partitionProviderEngagementsForTab(engagements: ProviderEngagementSummary[]): {
  upcoming: ProviderEngagementSummary[];
  completed: ProviderEngagementSummary[];
  needsAttention: ProviderEngagementSummary[];
} {
  const upcoming: ProviderEngagementSummary[] = [];
  const completed: ProviderEngagementSummary[] = [];
  const needsAttention: ProviderEngagementSummary[] = [];

  for (const row of engagements) {
    if (engagementRecordNeedsAction(row)) {
      needsAttention.push(row);
      continue;
    }
    if (isUpcomingEngagementStatus(row.status)) {
      upcoming.push(row);
      continue;
    }
    if (String(row.status ?? "").toLowerCase() === "completed") {
      completed.push(row);
      continue;
    }
    completed.push(row);
  }

  return { upcoming, completed, needsAttention };
}
