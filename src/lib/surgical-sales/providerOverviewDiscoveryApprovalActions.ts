import type { ProviderOverviewTacticalAction } from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";

/** Opens the observation status modal (explicit confirmation required). */
export const UPDATE_OBSERVATION_STATUS_LABEL = "Update observation status";

export const PROVIDER_OVERVIEW_CUSTOM_ACTION = {
  openObservationApproval: "open_observation_approval",
  openOptionalIntelligence: "open_optional_intelligence",
} as const;

export type ProviderOverviewCustomAction =
  (typeof PROVIDER_OVERVIEW_CUSTOM_ACTION)[keyof typeof PROVIDER_OVERVIEW_CUSTOM_ACTION];

/** @deprecated One-click approval removed — use observation status modal instead. */
export function shouldShowDiscoveryObservationApprovalAction(input: {
  pathwayStageId: SalesPathwayStageId;
  contact: Record<string, unknown>;
}): boolean {
  void input;
  return false;
}

/** @deprecated One-click approval removed — status updates use the confirmation modal. */
export function injectDiscoveryObservationApprovalAction(
  actions: ProviderOverviewTacticalAction[],
): ProviderOverviewTacticalAction[] {
  return actions;
}
