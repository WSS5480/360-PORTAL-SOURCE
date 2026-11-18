import {
  ENGAGEMENT_EMPTY_PLANNED_NEXT_STEP,
  ENGAGEMENT_EMPTY_PLANNED_OBJECTIVE_LABEL,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import {
  buildEngagementPrimaryAction,
  buildEngagementRecordOpenHref,
  resolveEngagementWorkflowState,
} from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import {
  isEngagementEmptyPlannedView,
  resolveEngagementPathwayPreparationDisplayLabel,
  resolveEngagementPreparationDisplayLabel,
} from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import {
  INTRO_CALL_START_MISSION_OBJECTIVE,
  INTRO_CALL_START_MISSION_PRIMARY_QUESTION,
  isIntroCallPathwayMission,
} from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import {
  buildEngagementCompletedSummary,
  buildEngagementDetailHubActions,
  resolveEngagementDetailHubPhase,
  type EngagementCompletedSummary,
  type EngagementDetailHubAction,
  type EngagementDetailHubPhase,
} from "@/lib/surgical-sales/engagements/buildEngagementDetailHub";
import {
  engagementDetailShowsCompletedSummary,
  engagementDetailShowsPreparationStatus,
  formatEngagementPreparationDisplayStatus,
} from "@/lib/surgical-sales/engagements/engagementStatusDisplay";
import { engagementHasTacticalDebrief } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import {
  engagementRepLifecycleBadgeVariant,
  engagementRepLifecycleNextActionLabel,
  formatEngagementRepLifecycleLabel,
} from "@/lib/surgical-sales/engagements/engagementRepLifecycle";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

export type EngagementRecordView = {
  typeLabel: string;
  statusLabel: string;
  dateLabel: string | null;
  timeLabel: string | null;
  scheduleLabel: string | null;
  locationLabel: string | null;
  objective: string | null;
  objectiveLabel: string;
  primaryQuestionLabel: string | null;
  preparationLabel: string;
  detailPreparationLabel: string;
  statusBadgeVariant: "planned" | "active" | "debrief_needed" | "completed";
  nextStepLabel: string;
  isPathwayMission: boolean;
  isEmptyPlannedView: boolean;
  openHref: string;
  primaryAction: ReturnType<typeof buildEngagementPrimaryAction>;
  workflowState: ReturnType<typeof resolveEngagementWorkflowState>;
  detailPhase: EngagementDetailHubPhase;
  detailActions: EngagementDetailHubAction[];
  showPreparationStatus: boolean;
  showCompletedSummary: boolean;
  completedSummary: EngagementCompletedSummary | null;
};

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") return null;
  const t = String(v).trim();
  return t || null;
}

export function readEngagementTextField(engagement: Record<string, unknown>, key: string): string {
  const value = engagement[key];
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function formatEngagementDateTime(engagement: Record<string, unknown>): {
  dateLabel: string | null;
  timeLabel: string | null;
} {
  const scheduled = trimOrNull(engagement.scheduled_at);
  const dateOnly = trimOrNull(engagement.engagement_date) ?? trimOrNull(engagement.scheduled_date);

  if (scheduled) {
    const d = new Date(scheduled);
    if (!Number.isNaN(d.getTime())) {
      return {
        dateLabel: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        timeLabel: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      };
    }
  }

  if (dateOnly) {
    const d = new Date(`${dateOnly}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return {
        dateLabel: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        timeLabel: null,
      };
    }
  }

  return { dateLabel: null, timeLabel: null };
}

export function resolveEngagementObjective(engagement: Record<string, unknown>): string | null {
  return trimOrNull(engagement.observation_goal) ?? trimOrNull(engagement.engagement_purpose);
}

export function readEngagementScheduleDraft(engagement: Record<string, unknown>): {
  engagement_date: string;
  engagement_time: string;
} {
  const dateOnly = trimOrNull(engagement.engagement_date) ?? trimOrNull(engagement.scheduled_date) ?? "";
  const scheduled = trimOrNull(engagement.scheduled_at);
  if (scheduled) {
    const d = new Date(scheduled);
    if (!Number.isNaN(d.getTime())) {
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const hasTime = hours !== 0 || minutes !== 0;
      return {
        engagement_date: dateOnly || d.toISOString().slice(0, 10),
        engagement_time: hasTime
          ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
          : "",
      };
    }
  }
  return { engagement_date: dateOnly, engagement_time: "" };
}

export function buildEngagementRecordView(params: {
  engagementId: string;
  engagement: Record<string, unknown>;
}): EngagementRecordView {
  const { engagement, engagementId } = params;
  const typeLabel = formatEngagementType(String(engagement.engagement_type ?? ""));
  const { dateLabel, timeLabel } = formatEngagementDateTime(engagement);
  const scheduleLabel =
    dateLabel != null
      ? timeLabel != null
        ? `${dateLabel} · ${timeLabel}`
        : dateLabel
      : null;
  const objective = resolveEngagementObjective(engagement);
  const isPathwayMission = isIntroCallPathwayMission(String(engagement.engagement_type ?? ""));
  const isEmptyPlannedView = isPathwayMission ? false : isEngagementEmptyPlannedView(engagement);
  const locationLabel = trimOrNull(engagement.pre_call_hospital_name);
  const workflowState = resolveEngagementWorkflowState({
    status: String(engagement.status ?? "planned"),
    isMeetingPrepared: Boolean(engagement.is_meeting_prepared),
    preparedAt: engagement.prepared_at ? String(engagement.prepared_at) : null,
    planningStatus: engagement.planning_status ? String(engagement.planning_status) : null,
    briefingStatus: engagement.briefing_status ? String(engagement.briefing_status) : null,
    hasDebrief: engagementHasTacticalDebrief({
      notes: engagement.notes ? String(engagement.notes) : null,
      debrief_completed: Boolean(engagement.debrief_completed),
      debrief_completed_at: engagement.debrief_completed_at
        ? String(engagement.debrief_completed_at)
        : null,
    }),
    engagement,
  });
  const primary = buildEngagementPrimaryAction({
    engagementId,
    state: workflowState,
    engagementType: String(engagement.engagement_type ?? ""),
  });
  const hubHref = buildEngagementRecordOpenHref(engagementId);
  const detailPhase = resolveEngagementDetailHubPhase(workflowState);
  const detailActions = buildEngagementDetailHubActions({
    engagementId,
    phase: detailPhase,
    workflowState,
    engagementType: String(engagement.engagement_type ?? ""),
  });
  const showPreparationStatus = engagementDetailShowsPreparationStatus(engagement);
  const showCompletedSummary = engagementDetailShowsCompletedSummary(engagement);
  const completedSummary = showCompletedSummary ? buildEngagementCompletedSummary(engagement) : null;

  const objectiveLabel = isPathwayMission
    ? objective?.trim() || INTRO_CALL_START_MISSION_OBJECTIVE
    : objective?.trim() || ENGAGEMENT_EMPTY_PLANNED_OBJECTIVE_LABEL;
  const primaryQuestionLabel = isPathwayMission ? INTRO_CALL_START_MISSION_PRIMARY_QUESTION : null;
  const preparationLabel = isPathwayMission
    ? resolveEngagementPathwayPreparationDisplayLabel(engagement)
    : resolveEngagementPreparationDisplayLabel(engagement);
  const detailPreparationLabel = formatEngagementPreparationDisplayStatus(engagement) ?? "";
  const statusBadgeVariant = engagementRepLifecycleBadgeVariant(detailPhase);
  const statusLabel = formatEngagementRepLifecycleLabel(detailPhase);
  const nextStepLabel = engagementRepLifecycleNextActionLabel(workflowState);

  return {
    typeLabel,
    statusLabel,
    dateLabel,
    timeLabel,
    scheduleLabel,
    locationLabel,
    objective,
    objectiveLabel,
    primaryQuestionLabel,
    preparationLabel,
    detailPreparationLabel,
    statusBadgeVariant,
    nextStepLabel: isEmptyPlannedView ? ENGAGEMENT_EMPTY_PLANNED_NEXT_STEP : nextStepLabel,
    isPathwayMission,
    isEmptyPlannedView,
    openHref: hubHref,
    primaryAction: primary,
    workflowState,
    detailPhase,
    detailActions,
    showPreparationStatus,
    showCompletedSummary,
    completedSummary,
  };
}
