import { buildEngagementDebriefHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import { buildEngagementSurfaceActionsFromSummary } from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import {
  isUpcomingEngagementStatus,
  pickNextUpcomingEngagement,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { normalizeEngagementType, type EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { ProviderRepPrimaryAction } from "@/lib/surgical-sales/buildProviderRepPrimaryAction";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  engagementHasTacticalDebrief,
  engagementNeedsTacticalDebrief,
} from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { observationSeriesEngagementEligibleForDebrief } from "@/lib/surgical-sales/providerObservationProgress";

export type ProviderEngagementWorkflowPhase =
  | "in_progress"
  | "awaiting_debrief"
  | "prepare"
  | "run_touch"
  | "none";

export type ProviderEngagementWorkflowAction = {
  phase: ProviderEngagementWorkflowPhase;
  headline: string;
  detail: string | null;
  ctaLabel: string;
  ctaHref: string;
  engagementId: string | null;
  engagementTypeLabel: string | null;
};

const IN_PROGRESS_HEADLINE: Partial<Record<EngagementType, string>> = {
  intro_call: "Intro Call engagement in progress",
  observation_request: "Observation request in progress",
  or_visit: "OR visit in progress",
  follow_up: "Follow-up in progress",
  product_demo: "Product demo in progress",
  office_visit_360: "360 Experience in progress",
};

/** @deprecated Use engagementWorkflowPrimaryCtaLabel — completed */
export const PROVIDER_OVERVIEW_DEBRIEF_NOW_CTA = "Debrief";

export { engagementNeedsTacticalDebrief } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";

export function isDebriefWorkflowPhase(phase: ProviderEngagementWorkflowPhase | undefined): boolean {
  return phase === "awaiting_debrief";
}

/** Most recent completed or in-progress touch missing a tactical debrief. */
export function pickEngagementNeedingDebrief(
  engagements: ProviderEngagementSummary[] | undefined,
  completedObservationCount = 0,
): ProviderEngagementSummary | null {
  const engagement = pickActiveWorkflowEngagement(engagements, { completedObservationCount });
  if (!engagement || !engagementNeedsTacticalDebrief(engagement)) return null;
  if (
    !observationSeriesEngagementEligibleForDebrief(
      engagement.engagement_type,
      completedObservationCount,
    )
  ) {
    return null;
  }
  return engagement;
}

export function buildProviderOverviewDebriefRecommendedMove(
  workflow: Pick<ProviderEngagementWorkflowAction, "engagementTypeLabel">,
): string {
  const typeLabel = workflow.engagementTypeLabel?.trim() || "touchpoint";
  return `Debrief the recent ${typeLabel} so intelligence can be mapped while details are fresh.`;
}

function engagementTimestamp(e: ProviderEngagementSummary): number {
  const raw =
    e.updated_at || e.scheduled_at || (e.engagement_date ? `${e.engagement_date}T12:00:00` : "");
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Active touch beats calendar-planned work on overview. */
export function pickActiveWorkflowEngagement(
  engagements: ProviderEngagementSummary[] | undefined,
  options?: { completedObservationCount?: number },
): ProviderEngagementSummary | null {
  const completedObservationCount = options?.completedObservationCount ?? 0;
  const list = engagements ?? [];
  const eligibleForDebrief = (engagement: ProviderEngagementSummary) =>
    observationSeriesEngagementEligibleForDebrief(
      engagement.engagement_type,
      completedObservationCount,
    );

  const inProgress = list
    .filter((e) => String(e.status || "").toLowerCase() === "in_progress")
    .filter(eligibleForDebrief)
    .sort((a, b) => engagementTimestamp(b) - engagementTimestamp(a));
  if (inProgress[0]) return inProgress[0];

  const awaitingDebrief = list
    .filter((e) => String(e.status || "").toLowerCase() === "completed")
    .filter((e) => !engagementHasTacticalDebrief(e))
    .filter(eligibleForDebrief)
    .sort((a, b) => engagementTimestamp(b) - engagementTimestamp(a));
  if (awaitingDebrief[0]) return awaitingDebrief[0];

  return pickNextUpcomingEngagement(list);
}

function buildDebriefHref(engagementId: string): string {
  return buildEngagementDebriefHref(engagementId);
}

function inProgressHeadline(engagement: ProviderEngagementSummary): string {
  const type = normalizeEngagementType(engagement.engagement_type);
  if (type && IN_PROGRESS_HEADLINE[type]) return IN_PROGRESS_HEADLINE[type]!;
  const label = engagement.engagement_type_label || "Engagement";
  return `${label} in progress`;
}

function plannedHeadline(engagement: ProviderEngagementSummary): string {
  const title = engagement.title?.trim() || engagement.engagement_type_label;
  const when =
    engagement.scheduled_at || engagement.engagement_date ? "on the calendar" : "upcoming";
  return `${title} ${when}`;
}

export function buildProviderEngagementWorkflowAction(input: {
  engagements?: ProviderEngagementSummary[];
  briefingHref: string;
  fallbackAction: ProviderRepPrimaryAction;
  completedObservationCount?: number;
}): ProviderEngagementWorkflowAction | null {
  const engagement = pickActiveWorkflowEngagement(input.engagements, {
    completedObservationCount: input.completedObservationCount ?? 0,
  });
  if (!engagement) {
    return null;
  }

  const surface = buildEngagementSurfaceActionsFromSummary(engagement);
  const primary = surface.primary;
  const title = engagement.title?.trim() || engagement.engagement_type_label;
  const status = String(engagement.status || "").toLowerCase();

  if (status === "in_progress") {
    return {
      phase: "run_touch",
      headline: scanLine(inProgressHeadline(engagement), 72),
      detail: scanLine(`${title} — live engagement in progress.`, 160),
      ctaLabel: primary.label,
      ctaHref: primary.href,
      engagementId: engagement.id,
      engagementTypeLabel: engagement.engagement_type_label,
    };
  }

  if (primary.state === "completed") {
    if (
      !observationSeriesEngagementEligibleForDebrief(
        engagement.engagement_type,
        input.completedObservationCount ?? 0,
      )
    ) {
      return null;
    }
    return {
      phase: "awaiting_debrief",
      headline: scanLine(`${title} complete`, 72),
      detail: scanLine("Capture the debrief while the operational details are still fresh.", 160),
      ctaLabel: primary.label,
      ctaHref: primary.href,
      engagementId: engagement.id,
      engagementTypeLabel: engagement.engagement_type_label,
    };
  }

  if (!isUpcomingEngagementStatus(engagement.status)) {
    return null;
  }

  const phase: ProviderEngagementWorkflowPhase =
    primary.state === "prepared" ? "run_touch" : "prepare";

  return {
    phase,
    headline: scanLine(plannedHeadline(engagement), 72),
    detail: scanLine(
      primary.state === "prepared"
        ? `${title} is prepared — begin when you are on site.`
        : `${title} — prepare for this touch.`,
      160,
    ),
    ctaLabel: primary.label,
    ctaHref: primary.href,
    engagementId: engagement.id,
    engagementTypeLabel: engagement.engagement_type_label,
  };
}

export function workflowActionOverridesPrimary(
  workflow: ProviderEngagementWorkflowAction | null,
): boolean {
  return workflow != null && isDebriefWorkflowPhase(workflow.phase);
}
