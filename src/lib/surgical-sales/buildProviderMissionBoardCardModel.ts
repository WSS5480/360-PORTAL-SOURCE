/**
 * Provider Mission Board card — compact execution view.
 */

import {
  EVALUATION_PATH_NEEDED_LABEL,
  providerEvaluationPathFromDirectoryRow,
  resolveStoredEvaluationPath,
} from "@/lib/surgical-sales/buildProviderEvaluationPathView";
import { buildMissionBoardEvaluationCardContext } from "@/lib/surgical-sales/buildMissionBoardEvaluationCardContext";
import {
  buildMissionBoardCommitmentCardContext,
  buildMissionBoardOutcomesCardContext,
} from "@/lib/surgical-sales/buildMissionBoardCommitmentOutcomesCardContext";
import type { SalesPathwayEvaluationActivity } from "@/lib/surgical-sales/salesPathwayCanonical";
import { buildProviderDiscoveryState } from "@/lib/surgical-sales/buildProviderDiscoveryState";
import {
  deriveMissionBoardNextCaseActions,
  deriveMissionBoardObservationViewAllLabel,
  deriveMissionBoardSecondaryActions,
  deriveMissionBoardStagePrimaryAction,
  type MissionBoardCardSecondaryAction,
  type MissionBoardPrimaryActionKind,
} from "@/lib/surgical-sales/deriveMissionBoardCardActions";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerDirectoryLinks, providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import { deriveProviderLastTouch } from "@/lib/surgical-sales/providerDirectoryOperations";
import {
  resolveProviderObservationRollupFromDirectoryRow,
  type ProviderObservationCasePreview,
  type ProviderObservationCaseRollup,
} from "@/lib/surgical-sales/providerObservationCaseCollection";
import {
  resolveMissionBoardDebriefCardContext,
} from "@/lib/surgical-sales/missionBoardDebriefCardStatus";
import {
  SALES_PATHWAY_STAGE_SHORT_LABELS,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";

export type { MissionBoardCardSecondaryAction };

export type ProviderMissionBoardCardModel = {
  providerId: string;
  detailHref: string;
  providerName: string;
  organization: string;
  pathwayStageId: SalesPathwayStageId;
  stageLabel: string;
  progressLabel: string;
  progressCompleted: number | null;
  progressTotal: number | null;
  scheduledObservationCount: number;
  lastTouch: string;
  primaryCta: {
    label: string;
    href: string;
    kind: MissionBoardPrimaryActionKind;
    caseId?: string;
    debriefLauncherPanel?: "default" | "dictate";
  };
  secondaryActions: MissionBoardCardSecondaryAction[];
  observationCases: ProviderObservationCaseRollup;
  nextScheduledObservation: ProviderObservationCasePreview | null;
  nextCaseActions: MissionBoardCardSecondaryAction[];
  observationViewAllLabel: string | null;
  /** @deprecated Use progressLabel */
  stageStatus: string;
  /** @deprecated Use primaryCta.label */
  nextAction: string;
  upcomingActivity: string | null;
  evaluationDebriefOutcomeSummary: string | null;
  evaluationPrimaryOpportunity: string | null;
  evaluationRecommendedPath: SalesPathwayEvaluationActivity | null;
  evaluationSelectedPath: SalesPathwayEvaluationActivity | null;
  commitmentEvaluationPath: string | null;
  commitmentProductPath: string | null;
  commitmentStatus: string | null;
  outcomesCommitmentSummary: string | null;
  outcomesProductPath: string | null;
  outcomesStartDate: string | null;
  outcomesTrackingStatus: string | null;
};

function formatUpcomingActivity(provider: ProviderDirectoryRow): string | null {
  const eng = provider.upcoming_engagement;
  if (!eng) return null;

  const typeLabel = String(eng.type_label ?? "Engagement").trim();
  const when = String(eng.datetime_label ?? "").trim();
  if (!when || /^(date tbd|tbd)$/i.test(when)) {
    return typeLabel;
  }
  return `${when} · ${typeLabel}`;
}

function formatMissionBoardStatusLine(label: string): string {
  return label
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function resolveMissionBoardProgress(
  provider: ProviderDirectoryRow,
  stageId: SalesPathwayStageId,
  observationCases: ProviderObservationCaseRollup,
): Pick<
  ProviderMissionBoardCardModel,
  "progressLabel" | "progressCompleted" | "progressTotal" | "scheduledObservationCount"
> {
  switch (stageId) {
    case "discovery": {
      const missionBoardProgressLabel = buildProviderDiscoveryState({
        contact: provider as Record<string, unknown>,
      }).discoveryReadiness.missionBoardProgressLabel;
      return {
        progressLabel: missionBoardProgressLabel,
        progressCompleted: null,
        progressTotal: null,
        scheduledObservationCount: observationCases.upcomingCount,
      };
    }
    case "observe": {
      const completed = Math.min(observationCases.progressTotal, observationCases.completedCount);
      return {
        progressLabel: `${completed} of ${observationCases.progressTotal} complete`,
        progressCompleted: observationCases.completedCount,
        progressTotal: observationCases.progressTotal,
        scheduledObservationCount: observationCases.upcomingCount,
      };
    }
    case "debrief": {
      const debriefCtx = resolveMissionBoardDebriefCardContext(provider);
      return {
        progressLabel: debriefCtx.statusLine,
        progressCompleted: null,
        progressTotal: null,
        scheduledObservationCount: observationCases.upcomingCount,
      };
    }
    case "evaluation": {
      const selectedPath = resolveStoredEvaluationPath(provider as Record<string, unknown>);
      if (selectedPath) {
        const evaluation = providerEvaluationPathFromDirectoryRow(provider);
        return {
          progressLabel: `${evaluation.pathLabel} · ${evaluation.statusLabel}`,
          progressCompleted: null,
          progressTotal: null,
          scheduledObservationCount: observationCases.upcomingCount,
        };
      }
      return {
        progressLabel: EVALUATION_PATH_NEEDED_LABEL,
        progressCompleted: null,
        progressTotal: null,
        scheduledObservationCount: observationCases.upcomingCount,
      };
    }
    case "commitment": {
      const commitment = buildMissionBoardCommitmentCardContext(provider);
      return {
        progressLabel: commitment.commitmentStatus,
        progressCompleted: null,
        progressTotal: null,
        scheduledObservationCount: observationCases.upcomingCount,
      };
    }
    case "outcomes": {
      const outcomes = buildMissionBoardOutcomesCardContext(provider);
      return {
        progressLabel: outcomes.trackingStatus,
        progressCompleted: null,
        progressTotal: null,
        scheduledObservationCount: observationCases.upcomingCount,
      };
    }
    default:
      return {
        progressLabel: "In progress",
        progressCompleted: null,
        progressTotal: null,
        scheduledObservationCount: observationCases.upcomingCount,
      };
  }
}

export function buildProviderMissionBoardCardModel(
  provider: ProviderDirectoryRow,
): ProviderMissionBoardCardModel {
  const discoveryState = buildProviderDiscoveryState({
    contact: provider as Record<string, unknown>,
    providerId: provider.id,
    relationship_pathway_stage_id: provider.relationship_pathway_stage_id,
  });
  const pathwayStageId = discoveryState.discoveryStage.stageId;
  const links = providerDirectoryLinks(provider);
  const observationCases = resolveProviderObservationRollupFromDirectoryRow({ provider });
  const progress = resolveMissionBoardProgress(provider, pathwayStageId, observationCases);
  const primary = deriveMissionBoardStagePrimaryAction(provider, pathwayStageId);
  const evaluationContext =
    pathwayStageId === "evaluation"
      ? buildMissionBoardEvaluationCardContext({ provider })
      : null;
  const commitmentContext =
    pathwayStageId === "commitment"
      ? buildMissionBoardCommitmentCardContext(provider)
      : null;
  const outcomesContext =
    pathwayStageId === "outcomes" ? buildMissionBoardOutcomesCardContext(provider) : null;

  return {
    providerId: provider.id,
    detailHref: links.detailHref,
    providerName: providerDisplayName(provider),
    organization: provider.primary_organization_name?.trim() || "No organization",
    pathwayStageId,
    stageLabel: SALES_PATHWAY_STAGE_SHORT_LABELS[pathwayStageId],
    progressLabel: formatMissionBoardStatusLine(progress.progressLabel),
    progressCompleted: progress.progressCompleted,
    progressTotal: progress.progressTotal,
    scheduledObservationCount: progress.scheduledObservationCount,
    lastTouch: deriveProviderLastTouch(provider),
    primaryCta: {
      ...primary,
      debriefLauncherPanel: primary.debriefLauncherPanel,
    },
    secondaryActions: deriveMissionBoardSecondaryActions(provider, pathwayStageId),
    observationCases,
    nextScheduledObservation: observationCases.nextScheduled,
    nextCaseActions:
      pathwayStageId === "observe" ? deriveMissionBoardNextCaseActions(provider) : [],
    observationViewAllLabel:
      pathwayStageId === "observe" ? deriveMissionBoardObservationViewAllLabel(provider) : null,
    stageStatus: progress.progressLabel,
    nextAction: primary.label,
    upcomingActivity: formatUpcomingActivity(provider),
    evaluationDebriefOutcomeSummary: evaluationContext?.debriefOutcomeSummary ?? null,
    evaluationPrimaryOpportunity: evaluationContext?.primaryOpportunity ?? null,
    evaluationRecommendedPath: evaluationContext?.recommendedPath ?? null,
    evaluationSelectedPath: evaluationContext?.selectedPath ?? null,
    commitmentEvaluationPath: commitmentContext?.evaluationPathCompleted ?? null,
    commitmentProductPath: commitmentContext?.productPath ?? null,
    commitmentStatus: commitmentContext?.commitmentStatus ?? null,
    outcomesCommitmentSummary: outcomesContext?.commitmentSummary ?? null,
    outcomesProductPath: outcomesContext?.productPath ?? null,
    outcomesStartDate: outcomesContext?.startDate ?? null,
    outcomesTrackingStatus: outcomesContext?.trackingStatus ?? null,
  };
}
