/**
 * Provider overview — human-readable operational status (no abstract symbols).
 */

import type { StageRequirementRowStatus } from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";
import type { ProviderOverviewProgressionDetailRow } from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";
import type { ProviderOverviewDiscoveryOperationalPhase } from "@/lib/surgical-sales/providerOverviewDiscoveryOperationalPhase";

export const PROVIDER_OVERVIEW_STATUS_LABEL = {
  confirmed: "Confirmed",
  awaitingApproval: "Awaiting approval",
  inReview: "In review",
  awaitingValidation: "Awaiting validation",
  pendingProvider: "Pending provider response",
  notYetObserved: "Not yet observed",
  notStartedYet: "Not started yet",
  pending: "Pending",
  deferred: "Deferred",
  canPrepareEarly: "Can prepare early",
  optionalPreWork: "Optional pre-work",
  availableIfKnown: "Available if known",
  /** @deprecated Use notStartedYet */
  notStarted: "Not started yet",
  opensAfterApproval: "Opens after approval",
  /** @deprecated Use opensAfterApproval */
  deferredUntilApproval: "Opens after approval",
} as const;

export function requirementStatusLabel(status: StageRequirementRowStatus): string {
  switch (status) {
    case "complete":
      return PROVIDER_OVERVIEW_STATUS_LABEL.confirmed;
    case "partial":
      return PROVIDER_OVERVIEW_STATUS_LABEL.inReview;
    case "blocked":
      return PROVIDER_OVERVIEW_STATUS_LABEL.pendingProvider;
    case "not_started":
      return PROVIDER_OVERVIEW_STATUS_LABEL.notStartedYet;
    case "pending":
      return PROVIDER_OVERVIEW_STATUS_LABEL.pending;
    case "prepare_early":
      return PROVIDER_OVERVIEW_STATUS_LABEL.canPrepareEarly;
    case "deferred":
      return PROVIDER_OVERVIEW_STATUS_LABEL.deferred;
    case "open":
    default:
      return PROVIDER_OVERVIEW_STATUS_LABEL.awaitingValidation;
  }
}

export function progressionStatusLabel(tone: ProviderOverviewProgressionDetailRow["tone"]): string {
  switch (tone) {
    case "complete":
      return PROVIDER_OVERVIEW_STATUS_LABEL.confirmed;
    case "partial":
      return PROVIDER_OVERVIEW_STATUS_LABEL.inReview;
    case "blocked":
      return PROVIDER_OVERVIEW_STATUS_LABEL.pendingProvider;
    case "open":
    default:
      return PROVIDER_OVERVIEW_STATUS_LABEL.notYetObserved;
  }
}

export function resolveExecutionUnlockCopy(input: {
  primaryActionId: string | null;
  operationalPhase: ProviderOverviewDiscoveryOperationalPhase;
}): string {
  if (input.primaryActionId === "debrief") {
    return "Required before advancing pathway stage";
  }
  if (input.primaryActionId === "next") {
    return "Needed to progress pathway";
  }
  if (input.primaryActionId === "briefing") {
    return input.operationalPhase === "clinical_sponsorship"
      ? "Unlocks observation workflow and OR access prep"
      : "Unlocks observation workflow and scheduling access";
  }
  if (input.primaryActionId === "log") {
    return "Captures field intel for pathway progression";
  }
  return "Enables vendor coordination and pathway movement";
}
