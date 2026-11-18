/**
 * Provider overview — mission status / field briefing preparation panel.
 */

import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";
import { ENGAGEMENT_DELETE_LABEL } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import {
  buildEngagementPrimaryActionFromSummary,
  buildEngagementSurfaceActionsFromSummary,
  ENGAGEMENT_WORKFLOW_NEXT_STEP,
  ENGAGEMENT_WORKFLOW_STATE_LABELS,
  resolveEngagementWorkflowStateFromSummary,
  type EngagementWorkflowState,
} from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import {
  formatEngagementWhen,
  isUpcomingEngagementStatus,
  pickNextUpcomingEngagement,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { readEngagementScheduleDraft } from "@/lib/surgical-sales/engagements/buildEngagementRecordView";
import {
  pickEngagementNeedingDebrief,
  type ProviderEngagementWorkflowAction,
} from "@/lib/surgical-sales/buildProviderEngagementWorkflowAction";
import type {
  ProviderOverviewNextBestActionModel,
  ProviderOverviewUpcomingTouchModel,
} from "@/lib/surgical-sales/buildProviderOverviewBody";
import type { ProviderOverviewTacticalHeroModel } from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";
import { isIntroCallScheduled } from "@/lib/surgical-sales/discoveryIntroCallActivity";
import {
  buildProviderOverviewMissionPosture,
  type ProviderOverviewMissionBriefingStatus,
  type ProviderOverviewMissionPosture,
} from "@/lib/surgical-sales/buildProviderOverviewMissionPosture";
import {
  ENGAGEMENT_PREPARATION_DISPLAY_LABELS,
  resolveEngagementPreparationDisplayId,
  type EngagementPreparationDisplayId,
} from "@/lib/surgical-sales/engagements/engagementStatusDisplay";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  buildProviderOverviewMissionControlPanel,
  missionControlPanelBriefingLines,
  type ProviderOverviewMissionControlPanel,
} from "@/lib/surgical-sales/buildProviderOverviewMissionControlPanel";
export type { ProviderOverviewMissionControlPanel } from "@/lib/surgical-sales/buildProviderOverviewMissionControlPanel";

/** Preparation sub-status on provider overview mission card. */
export type ProviderOverviewFieldBriefingDisplayStatus = EngagementPreparationDisplayId;

export const PROVIDER_OVERVIEW_FIELD_BRIEFING_STATUS_LABELS: Record<
  ProviderOverviewFieldBriefingDisplayStatus,
  string
> = ENGAGEMENT_PREPARATION_DISPLAY_LABELS;

export type ProviderOverviewMissionSecondaryAction = {
  id: string;
  label: string;
  href?: string;
  customAction?:
    | "openObservationApproval"
    | "logFieldIntel"
    | "editMissionSchedule"
    | "deleteEngagement";
};

export type ProviderOverviewMissionQuickEdit = {
  engagementId: string;
  engagementType: string;
  engagementDate: string;
  engagementTime: string;
  organizationId: string | null;
  organizationName: string | null;
  locationLabel: string;
};

type ProviderOverviewMissionBase = {
  posture: ProviderOverviewMissionPosture;
  briefingStatus: ProviderOverviewMissionBriefingStatus;
  missionPanel: ProviderOverviewMissionControlPanel;
  currentObjective: string;
  primaryCta: { label: string; href: string } | null;
  secondaryActions: ProviderOverviewMissionSecondaryAction[];
};

export type ProviderOverviewScheduledMissionModel = ProviderOverviewMissionBase & {
  mode: "scheduled_mission";
  engagementId: string;
  engagementTypeLabel: string;
  whenLabel: string;
  engagementStatusLabel: string;
  workflowState: EngagementWorkflowState;
  workflowStateLabel: string;
  fieldBriefingStatus: ProviderOverviewFieldBriefingDisplayStatus;
  fieldBriefingStatusLabel: string;
  nextStepLine: string;
  openHref: string;
  quickEdit: ProviderOverviewMissionQuickEdit;
};

export type ProviderOverviewDebriefMissionModel = ProviderOverviewMissionBase & {
  mode: "debrief_mission";
  engagementId: string;
  engagementTypeLabel: string;
  whenLabel: string;
  engagementStatusLabel: string;
  workflowState: "completed";
  workflowStateLabel: string;
  nextStepLine: string;
  openHref: string;
  quickEdit: ProviderOverviewMissionQuickEdit;
};

export type ProviderOverviewFallbackMissionModel = ProviderOverviewMissionBase & {
  mode: "fallback";
  nextActionLabel: string;
  nextActionDetail?: string | null;
};

export type ProviderOverviewMissionStatusModel =
  | ProviderOverviewScheduledMissionModel
  | ProviderOverviewDebriefMissionModel
  | ProviderOverviewFallbackMissionModel;

export type ProviderOverviewActiveEngagementTone = "live" | "ready" | "pending" | "debrief";

export function hasActiveProviderOverviewEngagement(
  status: ProviderOverviewMissionStatusModel,
): boolean {
  return status.mode === "scheduled_mission" || status.mode === "debrief_mission";
}

export function resolveProviderOverviewActiveEngagementPresentation(
  status: ProviderOverviewScheduledMissionModel | ProviderOverviewDebriefMissionModel,
): {
  badgeLabel: string;
  tone: ProviderOverviewActiveEngagementTone;
  headline: string;
  metaLine: string;
  nextStepLine: string;
  primaryCta: { label: string; href: string };
} {
  const headline = status.engagementTypeLabel;
  const metaParts = [status.whenLabel, status.workflowStateLabel].filter(Boolean);
  if (status.mode === "scheduled_mission" && status.fieldBriefingStatus !== "ready") {
    metaParts.push(status.fieldBriefingStatusLabel);
  }
  const metaLine = metaParts.join(" · ");

  if (status.mode === "debrief_mission" || status.workflowState === "completed") {
    return {
      badgeLabel: "Finish debrief",
      tone: "debrief",
      headline,
      metaLine,
      nextStepLine: status.nextStepLine,
      primaryCta: status.primaryCta ?? { label: "Log outcome", href: status.openHref },
    };
  }

  if (status.workflowState === "in_progress") {
    return {
      badgeLabel: "In progress",
      tone: "live",
      headline,
      metaLine,
      nextStepLine: status.nextStepLine,
      primaryCta: status.primaryCta ?? { label: "Resume engagement", href: status.openHref },
    };
  }

  if (status.workflowState === "prepared") {
    return {
      badgeLabel: "Ready to start",
      tone: "ready",
      headline,
      metaLine,
      nextStepLine: status.nextStepLine,
      primaryCta: status.primaryCta ?? { label: "Start engagement", href: status.openHref },
    };
  }

  return {
    badgeLabel: "Not finished",
    tone: "pending",
    headline,
    metaLine,
    nextStepLine: status.nextStepLine,
    primaryCta: status.primaryCta ?? { label: "Prepare", href: status.openHref },
  };
}

export function resolveProviderOverviewFieldBriefingDisplayStatus(
  engagement: ProviderEngagementSummary,
): ProviderOverviewFieldBriefingDisplayStatus {
  return resolveEngagementPreparationDisplayId(engagement);
}

function engagementSortTimestamp(e: ProviderEngagementSummary): number {
  const raw = e.updated_at || e.scheduled_at || (e.engagement_date ? `${e.engagement_date}T12:00:00` : "");
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function resolveMissionEngagement(input: {
  engagements?: ProviderEngagementSummary[];
  workflow: ProviderEngagementWorkflowAction | null;
  completedObservationCount?: number;
}): ProviderEngagementSummary | null {
  const inProgress = (input.engagements ?? [])
    .filter((e) => String(e.status || "").toLowerCase() === "in_progress")
    .sort((a, b) => engagementSortTimestamp(b) - engagementSortTimestamp(a));
  if (inProgress[0]) return inProgress[0];

  const debrief = pickEngagementNeedingDebrief(
    input.engagements,
    input.completedObservationCount ?? 0,
  );
  if (debrief) return debrief;

  const upcoming = pickNextUpcomingEngagement(input.engagements);
  if (upcoming && isUpcomingEngagementStatus(upcoming.status)) {
    return upcoming;
  }

  if (
    input.workflow?.engagementId &&
    input.workflow.phase === "prepare"
  ) {
    return (input.engagements ?? []).find((e) => e.id === input.workflow!.engagementId) ?? null;
  }

  return null;
}

export function buildMissionQuickEdit(engagement: ProviderEngagementSummary): ProviderOverviewMissionQuickEdit {
  const schedule = readEngagementScheduleDraft(engagement as unknown as Record<string, unknown>);
  const locationLabel =
    engagement.pre_call_hospital_name?.trim() ||
    engagement.organization_name?.trim() ||
    "";

  return {
    engagementId: engagement.id,
    engagementType: engagement.engagement_type,
    engagementDate: schedule.engagement_date,
    engagementTime: schedule.engagement_time,
    organizationId: engagement.organization_id ?? null,
    organizationName: engagement.organization_name ?? null,
    locationLabel,
  };
}

function buildMissionSecondaryActions(
  engagement?: ProviderEngagementSummary | null,
): ProviderOverviewMissionSecondaryAction[] {
  const actions: ProviderOverviewMissionSecondaryAction[] = [];

  if (engagement) {
    actions.push(
      {
        id: "edit-schedule",
        label: "Edit schedule",
        customAction: "editMissionSchedule",
      },
      {
        id: "delete-engagement",
        label: ENGAGEMENT_DELETE_LABEL,
        customAction: "deleteEngagement",
      },
    );
  }

  actions.push(
    {
      id: "update-observation-status",
      label: "Update observation status",
      customAction: "openObservationApproval",
    },
    {
      id: "log-field-intel",
      label: BRIEF.logFieldIntel,
      customAction: "logFieldIntel",
    },
  );

  return actions;
}

function shouldSuppressPrepareIntroCallLabel(
  label: string,
  engagements?: ProviderEngagementSummary[],
): boolean {
  if (!isIntroCallScheduled({ engagements })) return false;
  return /\bprepare intro call\b/i.test(label.trim());
}

export function buildProviderOverviewMissionStatus(input: {
  contact: Record<string, unknown>;
  providerId: string;
  planning?: ProviderPlanningCompletion | null;
  cases?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  workflow: ProviderEngagementWorkflowAction | null;
  upcoming: ProviderOverviewUpcomingTouchModel;
  currentGoal: string;
  nextBestAction: ProviderOverviewNextBestActionModel;
  hero: ProviderOverviewTacticalHeroModel;
  newEngagementHref: string;
  completedObservationCount?: number;
}): ProviderOverviewMissionStatusModel {
  const engagement = resolveMissionEngagement(input);
  const posture = buildProviderOverviewMissionPosture({
    contact: input.contact,
    providerId: input.providerId,
    planning: input.planning,
    engagements: input.engagements,
    cases: input.cases,
    opportunities: input.opportunities,
    relationshipStage: input.relationshipStage,
    newEngagementHref: input.newEngagementHref,
    currentGoal: input.currentGoal,
    nextBestAction: input.nextBestAction,
    hero: input.hero,
    activeEngagement: engagement,
  });

  const secondaryActions = buildMissionSecondaryActions(engagement);

  const missionPanel = buildProviderOverviewMissionControlPanel({
    contact: input.contact,
    providerId: input.providerId,
    planning: input.planning,
    engagements: input.engagements,
    cases: input.cases,
    newEngagementHref: input.newEngagementHref,
    primaryCtaHref: posture.primaryCta?.href ?? null,
  });

  const briefingFromPanel = {
    lines: missionControlPanelBriefingLines(missionPanel),
    summary: missionControlPanelBriefingLines(missionPanel).join(" "),
  };

  const shared = {
    posture,
    briefingStatus: briefingFromPanel,
    missionPanel,
    currentObjective: missionPanel.missionObjective,
    primaryCta: posture.primaryCta ?? (
      missionPanel.recommendedAction.href
        ? { label: missionPanel.recommendedAction.label, href: missionPanel.recommendedAction.href }
        : { label: missionPanel.recommendedAction.label, href: input.newEngagementHref }
    ),
    secondaryActions,
  };

  if (engagement) {
    const typeLabel = posture.nextEngagement;
    const whenLabel = formatEngagementWhen(engagement) || "Date pending";
    const statusLabel = engagement.status_label?.trim() || "Scheduled";
    const workflowState = resolveEngagementWorkflowStateFromSummary(engagement);
    const surface = buildEngagementSurfaceActionsFromSummary(engagement);
    const primary = surface.primary;
    const workflowStateLabel = ENGAGEMENT_WORKFLOW_STATE_LABELS[workflowState];
    const nextStepLine = ENGAGEMENT_WORKFLOW_NEXT_STEP[workflowState];
    const primaryCta = posture.primaryCta ?? { label: primary.label, href: primary.href };
    const openHref = primary.href;
    const quickEdit = buildMissionQuickEdit(engagement);

    if (workflowState === "completed") {
      return {
        mode: "debrief_mission",
        engagementId: engagement.id,
        engagementTypeLabel: typeLabel,
        whenLabel,
        engagementStatusLabel: statusLabel,
        workflowState: "completed",
        workflowStateLabel,
        nextStepLine,
        openHref,
        quickEdit,
        ...shared,
        primaryCta,
      };
    }

    const briefingStatus = resolveProviderOverviewFieldBriefingDisplayStatus(engagement);

    return {
      mode: "scheduled_mission",
      engagementId: engagement.id,
      engagementTypeLabel: typeLabel,
      whenLabel,
      engagementStatusLabel: statusLabel,
      workflowState,
      workflowStateLabel,
      fieldBriefingStatus: briefingStatus,
      fieldBriefingStatusLabel: PROVIDER_OVERVIEW_FIELD_BRIEFING_STATUS_LABELS[briefingStatus],
      nextStepLine,
      openHref,
      quickEdit,
      ...shared,
      primaryCta,
    };
  }

  let nextActionLabel = posture.nextEngagement;
  const fallbackDetail = input.nextBestAction.detail?.trim() || null;

  if (shouldSuppressPrepareIntroCallLabel(nextActionLabel, input.engagements)) {
    nextActionLabel = ENGAGEMENT_WORKFLOW_NEXT_STEP.planned;
  }

  return {
    mode: "fallback",
    nextActionLabel,
    nextActionDetail: fallbackDetail ?? posture.nextEngagementDetail,
    ...shared,
  };
}
