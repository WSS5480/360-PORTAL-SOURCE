/**
 * Provider overview — briefing + outcome CTAs for any incomplete engagement.
 */

import { buildEngagementDebriefHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import {
  buildEngagementPrepareForMeetingHref,
  isUpcomingEngagementStatus,
  pickNextUpcomingEngagement,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { engagementHasTacticalDebrief } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { ENGAGEMENT_LOG_OUTCOME_LABEL } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import {
  isDebriefWorkflowPhase,
  type ProviderEngagementWorkflowAction,
} from "@/lib/surgical-sales/buildProviderEngagementWorkflowAction";
import type { ProviderOverviewTacticalAction } from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";
import { FIELD_OPS_SECONDARY_CTA } from "@/lib/surgical-sales/providerOverviewFieldOpsCta";

export const PROVIDER_OVERVIEW_VIEW_BRIEFING_LABEL = "View Briefing";
export const PROVIDER_OVERVIEW_RECORD_OUTCOME_LABEL = ENGAGEMENT_LOG_OUTCOME_LABEL;

function isCancelledEngagement(engagement: ProviderEngagementSummary): boolean {
  const status = String(engagement.status ?? "").toLowerCase();
  return status === "cancelled" || status === "canceled";
}

function isClosedEngagement(engagement: ProviderEngagementSummary): boolean {
  const status = String(engagement.status ?? "").toLowerCase();
  return status === "closed" || (status === "completed" && engagementHasTacticalDebrief(engagement));
}

function engagementTimestamp(engagement: ProviderEngagementSummary): number {
  const raw =
    engagement.updated_at ||
    engagement.scheduled_at ||
    (engagement.engagement_date ? `${engagement.engagement_date}T12:00:00` : "");
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Active touch, upcoming touch, or completed touch still awaiting debrief — any engagement type. */
export function pickIncompleteProviderEngagement(input: {
  engagements?: ProviderEngagementSummary[];
  workflow?: ProviderEngagementWorkflowAction | null;
}): ProviderEngagementSummary | null {
  if (input.workflow?.engagementId) {
    const match = (input.engagements ?? []).find(
      (engagement) => engagement.id === input.workflow!.engagementId,
    );
    if (match && !isCancelledEngagement(match) && !isClosedEngagement(match)) {
      return match;
    }
  }

  const list = input.engagements ?? [];

  const inProgress = list
    .filter((engagement) => String(engagement.status || "").toLowerCase() === "in_progress")
    .filter((engagement) => !isCancelledEngagement(engagement))
    .sort((a, b) => engagementTimestamp(b) - engagementTimestamp(a));
  if (inProgress[0]) return inProgress[0];

  const awaitingDebrief = list
    .filter((engagement) => String(engagement.status || "").toLowerCase() === "completed")
    .filter((engagement) => !engagementHasTacticalDebrief(engagement))
    .filter((engagement) => !isCancelledEngagement(engagement))
    .sort((a, b) => engagementTimestamp(b) - engagementTimestamp(a));
  if (awaitingDebrief[0]) return awaitingDebrief[0];

  const upcoming = pickNextUpcomingEngagement(list);
  if (upcoming && isUpcomingEngagementStatus(upcoming.status) && !isCancelledEngagement(upcoming)) {
    return upcoming;
  }

  return null;
}

export function hasIncompleteProviderEngagement(input: {
  engagements?: ProviderEngagementSummary[];
  workflow?: ProviderEngagementWorkflowAction | null;
}): boolean {
  return pickIncompleteProviderEngagement(input) != null;
}

export function shouldShowViewBriefingAction(engagement: ProviderEngagementSummary): boolean {
  if (isCancelledEngagement(engagement) || isClosedEngagement(engagement)) return false;
  const status = String(engagement.status ?? "").toLowerCase();
  if (status === "in_progress") return true;
  if (isUpcomingEngagementStatus(engagement.status)) return true;
  if (status === "completed" && !engagementHasTacticalDebrief(engagement)) return true;
  return false;
}

export function shouldShowRecordOutcomeAction(engagement: ProviderEngagementSummary): boolean {
  if (isCancelledEngagement(engagement) || isClosedEngagement(engagement)) return false;
  const status = String(engagement.status ?? "").toLowerCase();
  if (status === "in_progress") return true;
  if (status === "completed" && !engagementHasTacticalDebrief(engagement)) return true;
  if (isUpcomingEngagementStatus(engagement.status)) return true;
  return false;
}

function actionHrefMatches(action: ProviderOverviewTacticalAction, href: string): boolean {
  return Boolean(action.href && action.href === href);
}

function actionLabelMatchesOutcome(action: ProviderOverviewTacticalAction): boolean {
  const label = action.label.trim().toLowerCase();
  return label.includes("debrief") || label.includes("outcome");
}

function actionLabelMatchesBriefing(action: ProviderOverviewTacticalAction): boolean {
  if (
    action.id === "briefing" ||
    action.id === "view-briefing" ||
    action.id === "open-briefing"
  ) {
    return true;
  }
  const label = action.label.trim().toLowerCase();
  return label.includes("briefing");
}

export function buildViewBriefingAction(input: {
  engagement: ProviderEngagementSummary;
  label?: string;
  emphasis?: ProviderOverviewTacticalAction["emphasis"];
}): ProviderOverviewTacticalAction {
  return {
    id: "view-briefing",
    label: input.label ?? PROVIDER_OVERVIEW_VIEW_BRIEFING_LABEL,
    href: buildEngagementPrepareForMeetingHref(input.engagement.id),
    kind: "link",
    emphasis: input.emphasis ?? "secondary",
  };
}

export function buildRecordOutcomeAction(input: {
  engagement: ProviderEngagementSummary;
  label?: string;
  emphasis?: ProviderOverviewTacticalAction["emphasis"];
}): ProviderOverviewTacticalAction {
  return {
    id: "record-outcome",
    label: input.label ?? PROVIDER_OVERVIEW_RECORD_OUTCOME_LABEL,
    href: buildEngagementDebriefHref(input.engagement.id),
    kind: "link",
    emphasis: input.emphasis ?? "secondary",
  };
}

/** Ensures incomplete-engagement briefing/outcome links appear when missing. */
export function ensureIncompleteEngagementTouchActions(
  actions: ProviderOverviewTacticalAction[],
  input: {
    engagements?: ProviderEngagementSummary[];
    workflow?: ProviderEngagementWorkflowAction | null;
    briefingLabel?: string;
    outcomeLabel?: string;
  },
): ProviderOverviewTacticalAction[] {
  const engagement = pickIncompleteProviderEngagement(input);
  if (!engagement) return actions;

  const next = [...actions];
  const debriefIsPrimary =
    Boolean(input.workflow && isDebriefWorkflowPhase(input.workflow.phase)) &&
    next.some((action) => action.emphasis === "primary" && actionLabelMatchesOutcome(action));

  if (shouldShowViewBriefingAction(engagement)) {
    const briefing = buildViewBriefingAction({
      engagement,
      label: input.briefingLabel ?? FIELD_OPS_SECONDARY_CTA.openFieldBriefing,
      emphasis: next.length === 0 ? "primary" : "secondary",
    });
    const hasBriefing = next.some(
      (action) =>
        action.id === "briefing" ||
        action.id === "view-briefing" ||
        action.id === "open-briefing" ||
        actionLabelMatchesBriefing(action),
    );
    if (!hasBriefing) {
      next.push(briefing);
    }
  }

  if (shouldShowRecordOutcomeAction(engagement) && !debriefIsPrimary) {
    const outcome = buildRecordOutcomeAction({
      engagement,
      label: input.outcomeLabel ?? PROVIDER_OVERVIEW_RECORD_OUTCOME_LABEL,
      emphasis: "secondary",
    });
    const hasOutcome = next.some(
      (action) =>
        action.id === "record-outcome" ||
        action.id === "log-outcome" ||
        action.id === "debrief" ||
        actionHrefMatches(action, outcome.href!) ||
        actionLabelMatchesOutcome(action),
    );
    if (!hasOutcome) {
      next.push(outcome);
    }
  }

  return next;
}
