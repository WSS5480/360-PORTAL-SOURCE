import {
  engagementDetailShowsCompletedSummary,
  engagementDetailShowsPreparationStatus,
} from "@/lib/surgical-sales/engagements/engagementStatusDisplay";
import {
  ENGAGEMENT_CONTINUE_DEBRIEF_LABEL,
  ENGAGEMENT_EDIT_ENGAGEMENT_LABEL,
  ENGAGEMENT_VIEW_DEBRIEF_LABEL,
} from "@/lib/surgical-sales/engagements/engagementUiLabels";
import {
  INTRO_DICTATE_COMPLETE_LABEL,
  INTRO_JUST_COMPLETE_LABEL,
} from "@/lib/surgical-sales/introCallEngagementLifecycle";
import {
  buildEngagementActiveHref,
  buildEngagementDebriefHref,
  buildEngagementPrepareForMeetingHref,
  ENGAGEMENT_DETAIL_PREPARE_LABEL,
} from "@/lib/surgical-sales/engagements/engagementLifecycle";
import type { EngagementWorkflowState } from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import { classifyEngagementOutcomeFromDebrief } from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import { parseDebriefIntelligenceSnapshot } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import { isIntroCallPathwayMission } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import { extractRawDebriefFromStoredNotes } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefRawNotes";
import { engagementHasTacticalDebrief } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { readStartMissionSnapshot } from "@/lib/surgical-sales/engagements/startMissionSnapshot";

import type { EngagementRepLifecyclePhase } from "@/lib/surgical-sales/engagements/engagementRepLifecycle";

export type EngagementDetailHubPhase = EngagementRepLifecyclePhase;

export const ENGAGEMENT_DETAIL_START_ENGAGEMENT_LABEL = "Start Engagement";
export const ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL = "Resume Engagement";
/** @deprecated Use ENGAGEMENT_CONTINUE_DEBRIEF_LABEL */
export const ENGAGEMENT_DETAIL_CONTINUE_DEBRIEF_LABEL = ENGAGEMENT_CONTINUE_DEBRIEF_LABEL;
/** @deprecated Use ENGAGEMENT_VIEW_DEBRIEF_LABEL */
export const ENGAGEMENT_DETAIL_VIEW_DEBRIEF_LABEL = ENGAGEMENT_VIEW_DEBRIEF_LABEL;

export type EngagementDetailHubActionLink = {
  kind: "link";
  id: string;
  label: string;
  href: string;
  variant: "primary" | "secondary";
};

export type EngagementDetailHubActionStart = {
  kind: "start";
  id: "start";
  label: string;
  variant: "primary";
};

export type EngagementDetailHubActionEdit = {
  kind: "edit";
  id: "edit";
  label: string;
  variant: "secondary";
};

export type EngagementDetailHubActionQuickComplete = {
  kind: "intro_quick_complete";
  id: "intro_dictate_complete" | "intro_mark_complete";
  label: string;
  variant: "secondary";
};

export type EngagementDetailHubAction =
  | EngagementDetailHubActionLink
  | EngagementDetailHubActionEdit
  | EngagementDetailHubActionStart
  | EngagementDetailHubActionQuickComplete;

export type EngagementCompletedSummary = {
  outcome: string | null;
  completionDateLabel: string | null;
  summary: string | null;
  nextStep: string | null;
};

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function formatTimestampLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function firstFollowUpLine(raw: unknown): string | null {
  const text = trimOrNull(raw);
  if (!text) return null;
  const line = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .find(Boolean);
  return line ?? null;
}

export { resolveEngagementRepLifecyclePhaseFromWorkflow as resolveEngagementDetailHubPhase } from "@/lib/surgical-sales/engagements/engagementRepLifecycle";

export function buildEngagementDetailHubActions(input: {
  engagementId: string;
  phase: EngagementDetailHubPhase;
  /** When phase is planned, distinguishes Prepare vs Start Engagement as the single primary step. */
  workflowState?: EngagementWorkflowState;
  engagementType?: string | null;
}): EngagementDetailHubAction[] {
  const { engagementId } = input;
  const introQuickCompleteActions: EngagementDetailHubActionQuickComplete[] = isIntroCallPathwayMission(
    String(input.engagementType ?? ""),
  )
    ? [
        {
          kind: "intro_quick_complete",
          id: "intro_dictate_complete",
          label: INTRO_DICTATE_COMPLETE_LABEL,
          variant: "secondary",
        },
        {
          kind: "intro_quick_complete",
          id: "intro_mark_complete",
          label: INTRO_JUST_COMPLETE_LABEL,
          variant: "secondary",
        },
      ]
    : [];
  switch (input.phase) {
    case "planned": {
      const readyToStart = input.workflowState === "prepared";
      return [
        {
          kind: "edit",
          id: "edit",
          label: ENGAGEMENT_EDIT_ENGAGEMENT_LABEL,
          variant: "secondary",
        },
        ...(readyToStart
          ? ([
              {
                kind: "link" as const,
                id: "prepare",
                label: ENGAGEMENT_DETAIL_PREPARE_LABEL,
                href: buildEngagementPrepareForMeetingHref(engagementId),
                variant: "secondary" as const,
              },
              {
                kind: "start" as const,
                id: "start" as const,
                label: ENGAGEMENT_DETAIL_START_ENGAGEMENT_LABEL,
                variant: "primary" as const,
              },
              ...introQuickCompleteActions,
            ] satisfies EngagementDetailHubAction[])
          : ([
              {
                kind: "link" as const,
                id: "prepare",
                label: ENGAGEMENT_DETAIL_PREPARE_LABEL,
                href: buildEngagementPrepareForMeetingHref(engagementId),
                variant: "primary" as const,
              },
              ...introQuickCompleteActions,
            ] satisfies EngagementDetailHubAction[])),
      ];
    }
    case "active":
      return [
        {
          kind: "link",
          id: "resume",
          label: ENGAGEMENT_DETAIL_RESUME_ENGAGEMENT_LABEL,
          href: buildEngagementActiveHref(engagementId),
          variant: "primary",
        },
        ...introQuickCompleteActions,
        {
          kind: "edit",
          id: "edit",
          label: ENGAGEMENT_EDIT_ENGAGEMENT_LABEL,
          variant: "secondary",
        },
      ];
    case "debrief_needed":
      return [
        {
          kind: "link",
          id: "continue_debrief",
          label: ENGAGEMENT_DETAIL_CONTINUE_DEBRIEF_LABEL,
          href: buildEngagementDebriefHref(engagementId),
          variant: "primary",
        },
      ];
    case "completed":
      return [
        {
          kind: "link",
          id: "view_debrief",
          label: ENGAGEMENT_VIEW_DEBRIEF_LABEL,
          href: buildEngagementDebriefHref(engagementId, true),
          variant: "primary",
        },
      ];
  }
}

function visitOutcomeLabelFromDebriefSnapshot(
  engagement: Record<string, unknown>,
): string | null {
  const parsed = parseDebriefIntelligenceSnapshot(engagement.debrief_intelligence_snapshot);
  const embedded = parsed?.visitOutcome;
  if (embedded && typeof embedded === "object" && !Array.isArray(embedded)) {
    const label = trimOrNull((embedded as { label?: string }).label);
    if (label) return label;
  }

  const narrative = extractRawDebriefFromStoredNotes(
    engagement.notes ? String(engagement.notes) : null,
  );
  if (
    narrative &&
    engagementHasTacticalDebrief({
      notes: engagement.notes ? String(engagement.notes) : null,
      debrief_completed: Boolean(engagement.debrief_completed),
      debrief_completed_at: trimOrNull(engagement.debrief_completed_at),
    })
  ) {
    return classifyEngagementOutcomeFromDebrief(narrative).label;
  }

  return null;
}

export function buildEngagementCompletedSummary(
  engagement: Record<string, unknown>,
): EngagementCompletedSummary {
  const session = readStartMissionSnapshot(engagement.debrief_intelligence_snapshot);
  const outcomeFromVisit =
    visitOutcomeLabelFromDebriefSnapshot(engagement) ?? trimOrNull(session?.outcome_label);
  const nextAction = trimOrNull(engagement.next_action);
  const outcome = outcomeFromVisit ?? nextAction;

  const completionDateLabel =
    formatTimestampLabel(trimOrNull(engagement.debrief_completed_at)) ??
    formatTimestampLabel(trimOrNull(engagement.updated_at));

  const debriefNarrative = extractRawDebriefFromStoredNotes(
    engagement.notes ? String(engagement.notes) : null,
  );
  const liveNotes = trimOrNull(session?.live_notes);
  const summary = debriefNarrative || liveNotes;

  const parsedSnapshot = parseDebriefIntelligenceSnapshot(engagement.debrief_intelligence_snapshot);
  const snapshotFollowUps = Array.isArray(parsedSnapshot?.followUpTasks)
    ? parsedSnapshot!.followUpTasks!.map((line) => String(line).trim()).filter(Boolean)
    : [];

  const followUp =
    snapshotFollowUps[0] ??
    firstFollowUpLine(engagement.follow_up_tasks);
  const nextStep =
    snapshotFollowUps.length > 1
      ? snapshotFollowUps.slice(1).join(" · ")
      : followUp && followUp !== outcome
        ? followUp
        : nextAction && nextAction !== outcome
          ? nextAction
          : followUp ?? nextAction;

  return {
    outcome,
    completionDateLabel,
    summary,
    nextStep,
  };
}

export { engagementDetailShowsCompletedSummary, engagementDetailShowsPreparationStatus };
