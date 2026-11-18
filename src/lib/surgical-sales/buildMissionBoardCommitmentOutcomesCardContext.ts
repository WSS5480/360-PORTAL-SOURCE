import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { resolveStoredEvaluationPath } from "@/lib/surgical-sales/buildProviderEvaluationPathView";
import {
  buildProviderCommitmentView,
  buildProviderOutcomesTrackingView,
  hasEvaluationMarkedSuccessful,
  hasStructuredCommitmentSaved,
  isEvaluationReadyForCommitment,
  type ProviderCommitmentView,
  type ProviderOutcomesTrackingView,
} from "@/lib/surgical-sales/providerCommitmentOutcomes";

export type MissionBoardCommitmentCardContext = {
  evaluationPathCompleted: string | null;
  productPath: string | null;
  commitmentStatus: string;
  commitment: ProviderCommitmentView | null;
};

export type MissionBoardOutcomesCardContext = {
  commitmentSummary: string | null;
  productPath: string | null;
  startDate: string | null;
  trackingStatus: string;
  outcomes: ProviderOutcomesTrackingView | null;
};

export function buildMissionBoardCommitmentCardContext(
  provider: ProviderDirectoryRow,
): MissionBoardCommitmentCardContext {
  const contact = provider as Record<string, unknown>;
  const evaluationPath = resolveStoredEvaluationPath(contact);
  const commitment = buildProviderCommitmentView(contact);

  let commitmentStatus = "Not confirmed";
  if (commitment) {
    commitmentStatus = commitment.statusLabel;
  } else if (isEvaluationReadyForCommitment(contact) || hasEvaluationMarkedSuccessful(contact)) {
    commitmentStatus = "Ready to confirm";
  }

  return {
    evaluationPathCompleted: evaluationPath,
    productPath: commitment?.productPath ?? evaluationPath,
    commitmentStatus,
    commitment,
  };
}

export function buildMissionBoardOutcomesCardContext(
  provider: ProviderDirectoryRow,
  activityCounts?: { outcomeUpdates?: number; productUseLogs?: number; lastUpdateAt?: string | null },
): MissionBoardOutcomesCardContext {
  const contact = provider as Record<string, unknown>;
  const commitment = buildProviderCommitmentView(contact);
  const outcomes = buildProviderOutcomesTrackingView(contact, activityCounts);

  return {
    commitmentSummary: commitment?.summaryLabel ?? outcomes?.summaryLabel ?? null,
    productPath: outcomes?.productPath ?? commitment?.productPath ?? resolveStoredEvaluationPath(contact),
    startDate: outcomes?.startDate ?? commitment?.startDate ?? null,
    trackingStatus: outcomes?.statusLabel ?? "Not started",
    outcomes,
  };
}

export function providerHasCommitmentForOverview(contact: Record<string, unknown>): boolean {
  return hasStructuredCommitmentSaved(contact);
}
