/**
 * Provider overview — compact operational pills for discovery workflow rows.
 */

import type { DiscoveryIntelligenceSignalRow } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import {
  DISCOVERY_FIELD_STATUS,
  discoverySignalStatusSlug,
  isDiscoverySignalStatusResolved,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import type { StageRequirementRow, StageRequirementRowStatus } from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";

const F = DISCOVERY_FIELD_STATUS;

export const OVERVIEW_DISCOVERY_ROW_LABELS: Record<DiscoveryStructuredSignalId, string> = {
  observation_approval: "Observation approval",
  scheduling_owner: "Scheduling owner",
  facility_vendor_pathway: "Facility/vendor pathway",
  observation_logistics: "Observation logistics",
  workflow_visibility: "Procedure workflow understanding",
  product_alignment: "Product alignment",
  case_opportunity: "Case opportunity",
  clinical_champion: "Clinical champion",
  decision_influence: "Decision influence",
  opportunity_clinical_frustrations: "Clinical frustrations",
  opportunity_workflow_inefficiencies: "Workflow inefficiencies",
  opportunity_products_in_use: "Products in use",
  opportunity_product_gaps: "Product gaps",
  opportunity_outcome_priorities: "Outcome priorities",
  opportunity_staff_frustrations: "Staff frustrations",
  opportunity_future_signals: "Future signals",
};

/** User-facing pill copy for overview rows. */
export function formatDiscoveryOperationalPillLabel(
  _signalId: DiscoveryStructuredSignalId,
  statusLabel: string,
): string {
  if (statusLabel === F.unknown) return "Pending";
  return statusLabel;
}

export function discoveryOperationalPillSlug(
  signalId: DiscoveryStructuredSignalId,
  statusLabel: string,
): string {
  if (statusLabel === F.unknown) {
    return signalId === "observation_approval" ? "pending" : discoverySignalStatusSlug(statusLabel);
  }
  return discoverySignalStatusSlug(statusLabel);
}

export function mapDiscoveryStatusToRowStatus(
  _signalId: DiscoveryStructuredSignalId,
  statusLabel: string,
): StageRequirementRowStatus {
  if (statusLabel === F.validated || statusLabel === F.notApplicable) return "complete";
  if (statusLabel === F.blocked) return "blocked";
  if (statusLabel === F.captured) return "partial";
  return "open";
}

function workflowRowId(signalId: DiscoveryStructuredSignalId): string {
  return signalId === "observation_approval" ? "observation_approval_status" : signalId;
}

export function mapDiscoveryIntelligenceRowToWorkflowRow(
  row: DiscoveryIntelligenceSignalRow,
): StageRequirementRow | null {
  const signalId = row.signalId;
  if (!signalId) return null;

  const status = mapDiscoveryStatusToRowStatus(signalId, row.statusLabel);
  const statusLabel = formatDiscoveryOperationalPillLabel(signalId, row.statusLabel);

  return {
    id: workflowRowId(signalId),
    label: OVERVIEW_DISCOVERY_ROW_LABELS[signalId] ?? row.label,
    status,
    marker: "",
    statusLabel,
    rawStatusLabel: row.statusLabel,
    pillSlug: discoveryOperationalPillSlug(signalId, row.statusLabel),
    signalId,
    primaryDbKey: row.primaryDbKey,
    sectionId: row.sectionId,
  };
}

export function buildDiscoveryGroupWorkflowRows(
  rows: DiscoveryIntelligenceSignalRow[],
): StageRequirementRow[] {
  return rows
    .map((row) => mapDiscoveryIntelligenceRowToWorkflowRow(row))
    .filter((row): row is StageRequirementRow => row != null);
}
