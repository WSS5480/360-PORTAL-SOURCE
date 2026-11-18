import type { ProviderDebriefPlan } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import type { DebriefPrepareObservationIntelligenceInput } from "@/lib/surgical-sales/engagements/buildDebriefPrepareObservedProgramFacts";
import { buildEngagementDebriefHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import { resolveDebriefLifecyclePhase, type DebriefLifecyclePhase } from "@/lib/surgical-sales/debriefEngagementLifecycle";
import { buildDebriefMissionCommandActions } from "@/lib/surgical-sales/missionBoardEngagementCommand";
import { MISSION_BOARD_DEBRIEF_START_LABEL } from "@/lib/surgical-sales/missionBoardDebriefLauncherUx";
import { summarizeMissionBoardDebriefLauncherIntelligence } from "@/lib/surgical-sales/missionBoardDebriefLauncherIntelligence";
import type { ProviderDebriefEngagementPreview } from "@/lib/surgical-sales/missionBoardDebriefEngagement";

export type MissionBoardDebriefLauncherEngagement = {
  engagementId: string;
  status: string;
  lifecyclePhase: DebriefLifecyclePhase;
  prepareHref: string;
  activeHref: string;
  debriefReviewHref: string;
  debriefCompleteHref: string;
  resume: boolean;
  primaryActionLabel: string;
  /** Active or debrief-needed — link to /debrief completion. */
  showCompleteDebrief: boolean;
  /** Scheduled — show Prepare secondary (primary may already be Prepare). */
  showPrepareFullBriefing: boolean;
  /** @deprecated Use showCompleteDebrief */
  canDictateAndComplete: boolean;
  /** @deprecated Use showCompleteDebrief */
  canQuickComplete: boolean;
  isDebriefComplete: boolean;
};

export type MissionBoardDebriefLauncherView = {
  providerName: string;
  organizationName: string | null;
  objective: string;
  whatWeKnow: string[];
  biggestUnknown: string | null;
  suggestedOpeningQuestion: string | null;
  existingEngagement: MissionBoardDebriefLauncherEngagement | null;
  completedObservationCount: number;
};

export function buildMissionBoardDebriefLauncherEngagement(input: {
  debrief: ProviderDebriefEngagementPreview;
  debriefCompletedOverride?: boolean;
}): MissionBoardDebriefLauncherEngagement {
  const actions = buildDebriefMissionCommandActions({
    debrief: input.debrief,
    debriefCompletedOverride: input.debriefCompletedOverride,
  });
  const lifecyclePhase = resolveDebriefLifecyclePhase(input.debrief);

  return {
    engagementId: actions.engagementId!,
    status: actions.status ?? "planned",
    lifecyclePhase,
    prepareHref: actions.prepareHref!,
    activeHref: actions.activeHref!,
    debriefCompleteHref: buildEngagementDebriefHref(input.debrief.id),
    debriefReviewHref: actions.debriefReviewHref!,
    resume: actions.resume,
    primaryActionLabel: actions.primaryLabel,
    showCompleteDebrief: actions.showCompleteDebrief,
    canDictateAndComplete: actions.showCompleteDebrief,
    canQuickComplete: actions.showCompleteDebrief,
    showPrepareFullBriefing: actions.showPrepareFullBriefing,
    isDebriefComplete: actions.isComplete,
  };
}

export function buildMissionBoardDebriefLauncherView(input: {
  providerName: string;
  organizationName: string | null;
  plan: ProviderDebriefPlan;
  completedObservationCount: number;
  existingEngagement: MissionBoardDebriefLauncherEngagement | null;
  observationIntelligence?: DebriefPrepareObservationIntelligenceInput | null;
}): MissionBoardDebriefLauncherView {
  const summary = summarizeMissionBoardDebriefLauncherIntelligence({
    plan: input.plan,
    providerName: input.providerName,
    completedObservationCount: input.completedObservationCount,
    observationIntelligence: input.observationIntelligence,
  });

  return {
    providerName: input.providerName,
    organizationName: input.organizationName,
    objective: summary.objective,
    whatWeKnow: summary.whatWeKnow,
    biggestUnknown: summary.biggestUnknown,
    suggestedOpeningQuestion: summary.suggestedOpeningQuestion,
    existingEngagement: input.existingEngagement,
    completedObservationCount: input.completedObservationCount,
  };
}

/** @deprecated Use resolveDebriefMissionCommandPrimaryLabel via missionBoardEngagementCommand */
export function resolveMissionBoardDebriefPrimaryActionLabel(input: {
  hasExistingEngagement: boolean;
  engagementStatus?: string | null;
}): string {
  if (!input.hasExistingEngagement) {
    return MISSION_BOARD_DEBRIEF_START_LABEL;
  }
  const status = String(input.engagementStatus ?? "planned").trim().toLowerCase();
  return buildDebriefMissionCommandActions({
    debrief: {
      id: "preview",
      status,
      debrief_completed: status === "completed",
    },
  }).primaryLabel;
}
