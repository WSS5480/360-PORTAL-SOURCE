import { resolveStoredEvaluationPath } from "@/lib/surgical-sales/buildProviderEvaluationPathView";
import { formatEngagementDisplayStatus } from "@/lib/surgical-sales/engagements/engagementStatusDisplay";
import { debriefLifecycleStatusLine } from "@/lib/surgical-sales/debriefEngagementLifecycle";
import {
  resolveMissionBoardDebriefCardStatus,
  type MissionBoardDebriefCardStatusId,
} from "@/lib/surgical-sales/missionBoardDebriefCardStatus";
import {
  resolveProviderDebriefEngagementPreview,
  type ProviderDebriefEngagementPreview,
} from "@/lib/surgical-sales/missionBoardDebriefEngagement";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

export type MissionBoardDebriefStatusView = {
  providerName: string;
  organizationName: string | null;
  statusId: MissionBoardDebriefCardStatusId;
  debriefStatusLine: string;
  engagementId: string | null;
  engagementLifecycleStatus: string | null;
  debriefCompleted: boolean;
  productFitValidated: string | null;
  evaluationPath: string | null;
  /** Debrief saved but pathway still on Debrief — rep should advance to Evaluation. */
  needsPathwayAdvance: boolean;
};

function formatProductFit(value: unknown): string {
  const token = String(value ?? "").trim().toLowerCase();
  if (token === "yes") return "Validated";
  if (token === "no") return "Not validated";
  return "Unknown";
}

export function buildMissionBoardDebriefStatusView(input: {
  provider: ProviderDirectoryRow;
  providerName: string;
}): MissionBoardDebriefStatusView {
  const debrief: ProviderDebriefEngagementPreview | null = resolveProviderDebriefEngagementPreview(
    input.provider,
  );
  const statusId = resolveMissionBoardDebriefCardStatus(debrief);
  const contact = input.provider as Record<string, unknown>;
  const evaluationPath = resolveStoredEvaluationPath(contact);

  return {
    providerName: input.providerName,
    organizationName: input.provider.primary_organization_name?.trim() || null,
    statusId,
    debriefStatusLine: debriefLifecycleStatusLine(statusId),
    engagementId: debrief?.id ?? null,
    engagementLifecycleStatus: debrief
      ? formatEngagementDisplayStatus(debrief.status ?? "planned")
      : null,
    debriefCompleted: Boolean(debrief?.debrief_completed),
    productFitValidated: formatProductFit(contact.provider_product_fit_validated),
    evaluationPath: evaluationPath ?? null,
    needsPathwayAdvance:
      Boolean(debrief?.debrief_completed) && formatProductFit(contact.provider_product_fit_validated) !== "Validated",
  };
}
