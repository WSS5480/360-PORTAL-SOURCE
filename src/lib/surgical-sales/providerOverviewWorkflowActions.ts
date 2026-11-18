/**
 * Inline actions for provider overview discovery workflow rows.
 */

import type {
  ProviderOverviewStageRequirementsModel,
  StageRequirementRow,
  WorkflowRowAction,
} from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import { discoveryIntelligenceRowActionsFlat } from "@/lib/surgical-sales/discoveryIntelligenceRowActions";
import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { intelligenceMetadataFromContact } from "@/lib/surgical-sales/providerCreateWizard";
import type { IntelligenceFieldAttribution } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { OR_ACCESS_CONSTRAINT_NONE_TOKEN } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";

export type {
  WorkflowRowAction,
  WorkflowRowActionKind,
  ProviderOverviewWorkflowApiAction,
} from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";

const OBSERVATION_APPROVAL_DB_KEY = "provider_observation_feasibility";

export function formatWorkflowConfirmedDate(meta?: IntelligenceFieldAttribution | null): string | null {
  const iso = meta?.validated_at?.trim() || meta?.confirmed_at?.trim() || meta?.updated_at?.trim();
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function enrichDiscoveryWorkflowRow(
  row: StageRequirementRow,
  contact: Record<string, unknown>,
): StageRequirementRow {
  if (!row.signalId) return row;

  const statusLabel = row.rawStatusLabel?.trim();
  if (!statusLabel) return row;

  const actions = discoveryIntelligenceRowActionsFlat({
    signalId: row.signalId as DiscoveryStructuredSignalId,
    statusLabel,
    sectionId: row.sectionId,
  });

  if (!actions.length) return row;

  if (row.signalId === "observation_approval" && hasProviderObservationApprovalValidated(contact)) {
    const meta = intelligenceMetadataFromContact(contact)[OBSERVATION_APPROVAL_DB_KEY];
    return {
      ...row,
      statusDetail: formatWorkflowConfirmedDate(meta),
      actions,
    };
  }

  return { ...row, actions };
}

export function enrichProviderOverviewWorkflowRequirements(
  requirements: ProviderOverviewStageRequirementsModel,
  contact: Record<string, unknown>,
): ProviderOverviewStageRequirementsModel {
  const enrichRows = (rows: StageRequirementRow[]) =>
    rows.map((row) => enrichDiscoveryWorkflowRow(row, contact));

  return {
    ...requirements,
    accessWorkflow: enrichRows(requirements.accessWorkflow),
    discoveryIntelligenceGroups: requirements.discoveryIntelligenceGroups.map((group) => ({
      ...group,
      rows: enrichRows(group.rows),
    })),
  };
}

/** Planning patch values for workflow API actions. */
export function planningPatchForWorkflowApiAction(
  action: import("@/lib/surgical-sales/buildProviderOverviewStageRequirementsView").ProviderOverviewWorkflowApiAction,
): Record<string, string | null> {
  switch (action) {
    case "mark_observation_approved":
      return { [OBSERVATION_APPROVAL_DB_KEY]: "approved" };
    case "mark_observation_interested":
      return { provider_evaluation_openness: "open" };
    case "mark_observation_declined":
      return { provider_evaluation_openness: "closed" };
    case "undo_observation_approval":
      return { [OBSERVATION_APPROVAL_DB_KEY]: null };
    case "mark_access_path_known":
      return { provider_observation_access_path: OR_ACCESS_CONSTRAINT_NONE_TOKEN };
    case "mark_pathway_partially_known":
      return { provider_observation_credentialing_needed: "in_progress" };
    case "mark_credentialing_known":
      return { provider_observation_credentialing_needed: "cleared" };
    case "mark_champion_confirmed":
      return { provider_champion_potential: "high" };
    default:
      return {};
  }
}
