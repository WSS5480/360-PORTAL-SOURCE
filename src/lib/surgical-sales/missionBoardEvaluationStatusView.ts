import {
  providerEvaluationPathFromDirectoryRow,
  resolveStoredEvaluationPath,
} from "@/lib/surgical-sales/buildProviderEvaluationPathView";
import { formatEngagementDisplayStatus } from "@/lib/surgical-sales/engagements/engagementStatusDisplay";
import { missionEngagementTypeLabel } from "@/lib/surgical-sales/buildProviderMissionEngagementPreview";
import {
  deriveEvaluationLifecyclePrimaryAction,
  evaluationLifecycleStatusLine,
  resolveEvaluationLifecyclePhase,
  type EvaluationLifecyclePhase,
} from "@/lib/surgical-sales/evaluationEngagementLifecycle";
import { resolveProviderEvaluationEngagementPreview } from "@/lib/surgical-sales/missionBoardEvaluationEngagement";
import { hasEvaluationMarkedSuccessful } from "@/lib/surgical-sales/providerCommitmentOutcomes";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

export type MissionBoardEvaluationStatusView = {
  providerName: string;
  organizationName: string | null;
  evaluationPath: string | null;
  activityStatusLabel: string;
  lifecyclePhase: EvaluationLifecyclePhase;
  lifecycleStatusLine: string;
  engagementId: string | null;
  engagementTypeLabel: string | null;
  engagementLifecycleStatus: string | null;
  markedSuccessful: boolean;
  primaryActionLabel: string | null;
  primaryActionHref: string | null;
  primaryActionRequiresBeginCall: boolean;
};

export function buildMissionBoardEvaluationStatusView(input: {
  provider: ProviderDirectoryRow;
  providerName: string;
}): MissionBoardEvaluationStatusView {
  const contact = input.provider as Record<string, unknown>;
  const evaluationPath = resolveStoredEvaluationPath(contact);
  const evaluationView = providerEvaluationPathFromDirectoryRow(input.provider);
  const preview = resolveProviderEvaluationEngagementPreview(input.provider);
  const lifecyclePhase = resolveEvaluationLifecyclePhase(preview);
  const lifecycle = deriveEvaluationLifecyclePrimaryAction(preview);

  return {
    providerName: input.providerName,
    organizationName: input.provider.primary_organization_name?.trim() || null,
    evaluationPath,
    activityStatusLabel: evaluationView.statusLabel,
    lifecyclePhase,
    lifecycleStatusLine: evaluationLifecycleStatusLine(lifecyclePhase),
    engagementId: preview?.id ?? null,
    engagementTypeLabel: preview?.engagement_type
      ? missionEngagementTypeLabel(preview.engagement_type)
      : null,
    engagementLifecycleStatus: preview
      ? formatEngagementDisplayStatus(preview.status ?? "planned")
      : null,
    markedSuccessful: hasEvaluationMarkedSuccessful(contact),
    primaryActionLabel: lifecycle?.label ?? null,
    primaryActionHref: lifecycle?.href ?? null,
    primaryActionRequiresBeginCall: lifecycle?.requiresBeginCall ?? false,
  };
}
