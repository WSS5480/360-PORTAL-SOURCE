import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { resolveSalesPathwayStageFromProviderRow } from "@/lib/surgical-sales/pathway/resolveSalesPathwayStage";
import { buildProviderPathwayNextAction } from "@/lib/surgical-sales/buildProviderPathwayNextAction";
import {
  providerMissionHealthRank,
} from "@/lib/surgical-sales/providerMissionHealth";
import {
  SALES_PATHWAY_STAGE_IDS,
  SALES_PATHWAY_STAGE_OBJECTIVES,
  SALES_PATHWAY_MISSION_BOARD_LABELS,
  normalizeSalesPathwayStageId,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";

/** One column per official 360 Medical Sales Pathway stage — provider sits in exactly one. */
export type ProviderMissionBoardColumnId = SalesPathwayStageId;

export const PROVIDER_MISSION_BOARD_COLUMN_LABELS = SALES_PATHWAY_MISSION_BOARD_LABELS;

export const PROVIDER_MISSION_BOARD_COLUMNS: ReadonlyArray<{
  id: ProviderMissionBoardColumnId;
  label: string;
  title: string;
  objective: string;
}> = SALES_PATHWAY_STAGE_IDS.map((id) => ({
  id,
  label: PROVIDER_MISSION_BOARD_COLUMN_LABELS[id],
  title: PROVIDER_MISSION_BOARD_COLUMN_LABELS[id],
  objective: SALES_PATHWAY_STAGE_OBJECTIVES[id],
}));

/** Pathway stage — API-precomputed when present; otherwise evidence-gated from row intelligence. */
export function deriveProviderMissionBoardColumn(p: ProviderDirectoryRow): ProviderMissionBoardColumnId | null {
  if (p.archived_at) return null;
  if (isProviderSalesCustomer(p)) return null;
  const precomputed = normalizeSalesPathwayStageId(p.relationship_pathway_stage_id);
  if (precomputed) return precomputed;
  return resolveSalesPathwayStageFromProviderRow(p);
}

/** Rep-facing next step for mission board cards — aligned to active pathway stage. */
export function deriveProviderMissionBoardNextAction(p: ProviderDirectoryRow): string {
  if (isProviderSalesCustomer(p)) return "Customer";
  return buildProviderPathwayNextAction(p).label;
}

export { buildProviderPathwayNextAction };
export { buildProviderMissionBoardCardModel } from "@/lib/surgical-sales/buildProviderMissionBoardCardModel";
export type {
  ProviderMissionBoardCardModel,
} from "@/lib/surgical-sales/buildProviderMissionBoardCardModel";

export function sortProvidersForMissionBoard(a: ProviderDirectoryRow, b: ProviderDirectoryRow): number {
  const rankDiff = providerMissionHealthRank(a) - providerMissionHealthRank(b);
  if (rankDiff !== 0) return rankDiff;

  const ta = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
  const tb = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta;

  return String(a.id).localeCompare(String(b.id));
}

export function groupProvidersByMissionBoardColumn(
  providers: ProviderDirectoryRow[],
  sortFn: (a: ProviderDirectoryRow, b: ProviderDirectoryRow) => number = sortProvidersForMissionBoard,
): Map<ProviderMissionBoardColumnId, ProviderDirectoryRow[]> {
  const grouped = new Map<ProviderMissionBoardColumnId, ProviderDirectoryRow[]>(
    PROVIDER_MISSION_BOARD_COLUMNS.map((column) => [column.id, []]),
  );

  for (const provider of providers) {
    const columnId = deriveProviderMissionBoardColumn(provider);
    if (!columnId) continue;
    grouped.get(columnId)!.push(provider);
  }

  for (const column of PROVIDER_MISSION_BOARD_COLUMNS) {
    grouped.set(column.id, [...(grouped.get(column.id) ?? [])].sort(sortFn));
  }

  return grouped;
}

export function countProvidersNeedingMissionAction(providers: ProviderDirectoryRow[]): number {
  return providers.filter((p) => {
    const rank = providerMissionHealthRank(p);
    return rank <= 1;
  }).length;
}
