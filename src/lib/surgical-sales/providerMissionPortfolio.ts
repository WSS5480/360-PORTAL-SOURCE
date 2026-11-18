import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  deriveProviderMissionBoardColumn,
  type ProviderMissionBoardColumnId,
} from "@/lib/surgical-sales/providerMissionBoard";
import {
  SALES_PATHWAY_MISSION_BOARD_LABELS,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";

/** Pathway stage filters for the mission command center — one metric per sales pathway stage. */
export type ProviderMissionMetricId = SalesPathwayStageId;

export type ProviderMissionMetricDefinition = {
  id: ProviderMissionMetricId;
  label: string;
  title: string;
  columnId: ProviderMissionBoardColumnId;
};

export const PROVIDER_MISSION_METRICS: readonly ProviderMissionMetricDefinition[] = (
  [
    "discovery",
    "observe",
    "debrief",
    "evaluation",
    "commitment",
    "outcomes",
  ] as const
).map((id) => ({
  id,
  label: SALES_PATHWAY_MISSION_BOARD_LABELS[id],
  title: SALES_PATHWAY_MISSION_BOARD_LABELS[id],
  columnId: id,
}));

export type ProviderMissionMetricSummary = ProviderMissionMetricDefinition & {
  count: number;
};

export type ProviderMissionPortfolioSummary = {
  metrics: ProviderMissionMetricSummary[];
};

const METRIC_BY_ID = new Map(PROVIDER_MISSION_METRICS.map((metric) => [metric.id, metric]));

export function providerMissionMetricDefinition(
  metricId: ProviderMissionMetricId,
): ProviderMissionMetricDefinition {
  return METRIC_BY_ID.get(metricId)!;
}

export function providerMatchesMissionMetric(
  provider: ProviderDirectoryRow,
  metricId: ProviderMissionMetricId,
): boolean {
  return deriveProviderMissionBoardColumn(provider) === metricId;
}

export function filterProvidersByMissionMetric(
  providers: ProviderDirectoryRow[],
  metricId: ProviderMissionMetricId | null,
): ProviderDirectoryRow[] {
  if (!metricId) return providers;
  return providers.filter((provider) => providerMatchesMissionMetric(provider, metricId));
}

export function buildProviderMissionPortfolioSummary(
  providers: ProviderDirectoryRow[],
): ProviderMissionPortfolioSummary {
  const counts = new Map<ProviderMissionMetricId, number>(
    PROVIDER_MISSION_METRICS.map((metric) => [metric.id, 0]),
  );

  for (const provider of providers) {
    if (provider.archived_at || provider.onboarding_status === "draft") continue;

    const columnId = deriveProviderMissionBoardColumn(provider);
    if (!columnId) continue;

    counts.set(columnId, (counts.get(columnId) ?? 0) + 1);
  }

  return {
    metrics: PROVIDER_MISSION_METRICS.map((metric) => ({
      ...metric,
      count: counts.get(metric.id) ?? 0,
    })),
  };
}

/** @deprecated Use buildProviderMissionPortfolioSummary */
export type ProviderOperationsPortfolioSummary = {
  total: number;
  needsAction: number;
  upcomingEngagements: number;
  debriefsDue: number;
};

/** @deprecated Use buildProviderMissionPortfolioSummary */
export function buildProviderOperationsPortfolioSummary(
  providers: ProviderDirectoryRow[],
): ProviderOperationsPortfolioSummary {
  const summary = buildProviderMissionPortfolioSummary(providers);
  const observe = summary.metrics.find((m) => m.id === "observe")?.count ?? 0;
  const debrief = summary.metrics.find((m) => m.id === "debrief")?.count ?? 0;
  return {
    total: providers.length,
    needsAction: debrief,
    upcomingEngagements: observe,
    debriefsDue: debrief,
  };
}
