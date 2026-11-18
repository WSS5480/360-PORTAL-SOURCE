/**
 * Provider overview command panel — derive CTAs from workflow maturity and real artifacts.
 */

import {
  buildEngagementPrepareForMeetingHref,
  isUpcomingEngagementStatus,
  pickNextUpcomingEngagement,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderEngagementWorkflowAction,
  isDebriefWorkflowPhase,
  PROVIDER_OVERVIEW_DEBRIEF_NOW_CTA,
  type ProviderEngagementWorkflowAction,
} from "@/lib/surgical-sales/buildProviderEngagementWorkflowAction";
import type { ProviderOverviewNextBestActionModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import type { ProviderOverviewTacticalAction } from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";
import { PROVIDER_FIELD_OPS_CTA } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import { isStaleEngagementTypeRecommendation } from "@/lib/surgical-sales/deriveProviderWorkflowRecommendation";
import { FIELD_OPS_SECONDARY_CTA } from "@/lib/surgical-sales/providerOverviewFieldOpsCta";
import {
  resolveProviderOverviewWorkflowCta,
  workflowCtaUsesButton,
} from "@/lib/surgical-sales/providerOverviewWorkflowCta";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import { ensureIncompleteEngagementTouchActions } from "@/lib/surgical-sales/buildProviderOverviewIncompleteEngagementActions";

export const PROVIDER_OVERVIEW_WORKFLOW_CTA = {
  startFirstEngagement: "Start first engagement",
} as const;

export const PROVIDER_OVERVIEW_NO_ACTIVITY_HINT =
  "No field activity logged yet. Begin the first engagement to establish workflow intelligence.";

export type ProviderWorkflowMaturity =
  | "no_engagements"
  | "active_touch"
  | "upcoming_touch"
  | "debrief_pending";

export type DeriveProviderWorkflowActionsInput = {
  engagements?: ProviderEngagementSummary[];
  workflow: ProviderEngagementWorkflowAction | null;
  nextBestAction: ProviderOverviewNextBestActionModel;
  newEngagementHref: string;
  contact?: Record<string, unknown>;
};

export function hasLoggedEngagements(
  engagements: ProviderEngagementSummary[] | undefined,
): boolean {
  return (engagements?.length ?? 0) > 0;
}

export function isFieldBriefingLabel(label: string | null | undefined): boolean {
  const t = String(label ?? "").trim().toLowerCase();
  return t.includes("field briefing") || t.includes("open briefing") || t.includes("view briefing");
}

/** Field briefing requires a real engagement with prepare/debrief context — never the provider tab alone. */
export function resolveFieldBriefingHref(input: {
  engagements?: ProviderEngagementSummary[];
  workflow: ProviderEngagementWorkflowAction | null;
}): string | null {
  if (!hasLoggedEngagements(input.engagements)) return null;

  if (input.workflow?.engagementId) {
    const phase = input.workflow.phase;
    if (
      phase === "run_touch" ||
      phase === "prepare" ||
      phase === "in_progress" ||
      phase === "awaiting_debrief"
    ) {
      return buildEngagementPrepareForMeetingHref(input.workflow.engagementId);
    }
  }

  const upcoming = pickNextUpcomingEngagement(input.engagements ?? []);
  if (upcoming && isUpcomingEngagementStatus(upcoming.status)) {
    const hasSchedule = Boolean(upcoming.scheduled_at?.trim() || upcoming.engagement_date?.trim());
    if (hasSchedule) {
      return buildEngagementPrepareForMeetingHref(upcoming.id);
    }
  }

  return null;
}

export function resolveProviderWorkflowMaturity(input: {
  engagements?: ProviderEngagementSummary[];
  workflow: ProviderEngagementWorkflowAction | null;
}): ProviderWorkflowMaturity {
  if (!hasLoggedEngagements(input.engagements)) return "no_engagements";
  if (input.workflow && isDebriefWorkflowPhase(input.workflow.phase)) {
    return "debrief_pending";
  }
  const upcoming = pickNextUpcomingEngagement(input.engagements ?? []);
  if (upcoming && isUpcomingEngagementStatus(upcoming.status)) {
    return "upcoming_touch";
  }
  if (input.workflow?.engagementId) return "active_touch";
  return "no_engagements";
}

function pushLinkAction(
  actions: ProviderOverviewTacticalAction[],
  action: Omit<ProviderOverviewTacticalAction, "kind"> & { kind?: "link" },
) {
  if (!action.href || !action.label.trim()) return;
  if (actions.some((a) => a.href === action.href && a.label === action.label)) return;
  actions.push({ ...action, kind: "link" });
}

function pushWorkflowCtaAction(
  actions: ProviderOverviewTacticalAction[],
  input: {
    id: string;
    label: string;
    href: string;
    emphasis: ProviderOverviewTacticalAction["emphasis"];
    contact?: Record<string, unknown>;
  },
) {
  if (!input.label.trim()) return;
  const workflowAction = resolveProviderOverviewWorkflowCta({
    label: input.label,
    href: input.href,
    contact: input.contact,
  });
  if (workflowCtaUsesButton(workflowAction)) {
    if (actions.some((a) => a.label === input.label && a.workflowAction?.type === workflowAction.type)) {
      return;
    }
    actions.push({
      id: input.id,
      label: input.label,
      kind: "button",
      emphasis: input.emphasis,
      workflowAction,
    });
    return;
  }
  const href =
    workflowAction.type === "external_link"
      ? workflowAction.href
      : workflowAction.type === "coordinate_observation"
        ? workflowAction.href
        : workflowAction.type === "plan_engagement"
          ? workflowAction.href
          : input.href;
  pushLinkAction(actions, {
    id: input.id,
    label: input.label,
    href,
    emphasis: input.emphasis,
  });
}

export function deriveProviderOverviewWorkflowActions(
  input: DeriveProviderWorkflowActionsInput,
): ProviderOverviewTacticalAction[] {
  const engagements = input.engagements ?? [];
  const workflow = input.workflow;
  const next = input.nextBestAction;
  const contact = input.contact ?? {};
  const fieldBriefingHref = resolveFieldBriefingHref({ engagements, workflow });
  const actions: ProviderOverviewTacticalAction[] = [];

  const needsDebrief = Boolean(workflow && isDebriefWorkflowPhase(workflow.phase));

  if (needsDebrief && workflow) {
    pushLinkAction(actions, {
      id: "debrief",
      label: PROVIDER_OVERVIEW_DEBRIEF_NOW_CTA,
      href: workflow.ctaHref,
      emphasis: "primary",
    });
    if (fieldBriefingHref) {
      pushLinkAction(actions, {
        id: "briefing",
        label: FIELD_OPS_SECONDARY_CTA.openFieldBriefing,
        href: fieldBriefingHref,
        emphasis: "secondary",
      });
    }
  } else if (!hasLoggedEngagements(engagements)) {
    pushLinkAction(actions, {
      id: "start",
      label: PROVIDER_OVERVIEW_WORKFLOW_CTA.startFirstEngagement,
      href: input.newEngagementHref,
      emphasis: "primary",
    });
    if (
      next.href &&
      next.label.trim() &&
      !isFieldBriefingLabel(next.label) &&
      !isStaleEngagementTypeRecommendation(next.label, engagements) &&
      next.href !== input.newEngagementHref
    ) {
      pushWorkflowCtaAction(actions, {
        id: "next",
        label: next.label,
        href: next.href,
        emphasis: "secondary",
        contact,
      });
    }
  } else if (workflow?.phase === "prepare" && workflow.engagementId) {
    pushLinkAction(actions, {
      id: "prep",
      label: workflow.ctaLabel,
      href: workflow.ctaHref,
      emphasis: "primary",
    });
    if (
      next.href &&
      next.label.trim() &&
      next.href !== workflow.ctaHref &&
      !isFieldBriefingLabel(next.label) &&
      !isStaleEngagementTypeRecommendation(next.label, engagements)
    ) {
      pushWorkflowCtaAction(actions, {
        id: "next",
        label: next.label,
        href: next.href,
        emphasis: "secondary",
        contact,
      });
    }
  } else if (
    workflow?.phase === "run_touch" &&
    fieldBriefingHref &&
    isFieldBriefingLabel(workflow.ctaLabel)
  ) {
    pushLinkAction(actions, {
      id: "briefing",
      label: workflow.ctaLabel,
      href: fieldBriefingHref,
      emphasis: "primary",
    });
    if (
      next.href &&
      next.label.trim() &&
      !isFieldBriefingLabel(next.label) &&
      !isStaleEngagementTypeRecommendation(next.label, engagements) &&
      next.href !== fieldBriefingHref
    ) {
      pushWorkflowCtaAction(actions, {
        id: "next",
        label: next.label,
        href: next.href,
        emphasis: "secondary",
        contact,
      });
    }
  } else {
    const workflowPrimary =
      workflow?.ctaHref &&
      workflow.ctaLabel.trim() &&
      !isFieldBriefingLabel(workflow.ctaLabel)
        ? { label: workflow.ctaLabel, href: workflow.ctaHref }
        : null;

    const nextPrimary =
      next.href &&
      next.label.trim() &&
      !isFieldBriefingLabel(next.label) &&
      !isStaleEngagementTypeRecommendation(next.label, engagements)
        ? { label: next.label, href: next.href }
        : null;

    const primary = workflowPrimary ?? nextPrimary;
    if (primary) {
      pushWorkflowCtaAction(actions, {
        id: "next",
        label: primary.label,
        href: primary.href,
        emphasis: "primary",
        contact,
      });
    }

    if (fieldBriefingHref && !actions.some((a) => a.id === "briefing")) {
      pushLinkAction(actions, {
        id: "briefing",
        label: FIELD_OPS_SECONDARY_CTA.openFieldBriefing,
        href: fieldBriefingHref,
        emphasis: actions.length > 0 ? "secondary" : "primary",
      });
    }
  }

  const withTouchActions = ensureIncompleteEngagementTouchActions(actions, {
    engagements,
    workflow,
    briefingLabel: FIELD_OPS_SECONDARY_CTA.openFieldBriefing,
  });

  if (LOG_UPDATE_UI_ENABLED) {
    withTouchActions.push({
      id: "log",
      label: PROVIDER_FIELD_OPS_CTA.logFieldIntel,
      kind: "button",
      emphasis: "ghost",
    });
  }

  const linkActions = withTouchActions.filter((action) => action.kind === "link");
  const nonLinkActions = withTouchActions.filter((action) => action.kind !== "link");
  return [...linkActions.slice(0, 4), ...nonLinkActions].slice(0, 5);
}

export function buildProviderOverviewWorkflowAction(input: {
  engagements?: ProviderEngagementSummary[];
  briefingHref: string;
  fallbackAction: { label: string; href: string };
  completedObservationCount?: number;
}): ProviderEngagementWorkflowAction | null {
  return buildProviderEngagementWorkflowAction({
    engagements: input.engagements,
    briefingHref: input.briefingHref,
    fallbackAction: {
      label: input.fallbackAction.label,
      href: input.fallbackAction.href,
      reason: "",
    },
    completedObservationCount: input.completedObservationCount,
  });
}
