/**
 * Provider overview — derive operational next steps from engagement history and workflow maturity.
 * Engagement record types (Intro call, Follow-up) are not repeated as CTAs after completion.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { buildEngagementDebriefHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import { buildEngagementPrepareForMeetingHref } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { formatEngagementType, normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  engagementHasTacticalDebrief,
  engagementNeedsTacticalDebrief,
} from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { mapContactFieldReadinessStatus } from "@/lib/surgical-sales/buildProviderDiscoveryIntelligenceGroups";
import { buildProviderEngagementTypeHref } from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import {
  type DiscoveryWorkflowMovePhase,
  resolveDiscoveryWorkflowMovePhase,
} from "@/lib/surgical-sales/providerOverviewDiscoveryNextMove";
import {
  isCredentialingWorkflowComplete,
  isObservationAccessConditionallyAllowed,
  OBSERVATION_CREDENTIALING_NEEDED_DB_KEY,
  PROVIDER_PROGRESSION_CTA_LOG_CREDENTIALING_STATUS,
  PROVIDER_PROGRESSION_CTA_START_CREDENTIALING,
} from "@/lib/surgical-sales/observationAccessWorkflowState";
import { PROVIDER_OVERVIEW_DEBRIEF_NOW_CTA } from "@/lib/surgical-sales/buildProviderEngagementWorkflowAction";

const INTRO_ENGAGEMENT_TYPES = new Set(["intro_call", "office_visit_360"]);

import { PROVIDER_ACCESS_FOLLOW_UP_CTA } from "@/lib/surgical-sales/providerObservationCta";
import { providerPostIntroAccessWorkRemaining } from "@/lib/surgical-sales/providerObservationReadiness";

export const PROVIDER_PROGRESSION_CTA = {
  startIntroCall: "Start intro call",
  createAccessFollowUp: PROVIDER_ACCESS_FOLLOW_UP_CTA,
  planEngagement: "Plan engagement",
  continueDiscovery: "Continue discovery",
  coordinateObservation: "Coordinate observation",
  validateSchedulingWorkflow: "Validate scheduling workflow",
  validateAccessWorkflow: "Validate access workflow",
  followUp: "Follow up",
  scheduleObservation: "Schedule observation",
  confirmSchedulingPathway: "Confirm scheduling pathway",
  prepareForTouch: "Prepare for touch",
} as const;

function providerProfileWorkflowHref(providerId: string, workflow: string, dbKey?: string): string {
  const params = new URLSearchParams({ tab: "overview", workflow });
  if (dbKey) params.set("field", dbKey);
  return `/portal/sales/providers/${encodeURIComponent(providerId)}?${params.toString()}`;
}

function introEngagements(engagements: ProviderEngagementSummary[]): ProviderEngagementSummary[] {
  return engagements.filter((e) => {
    const type = normalizeEngagementType(e.engagement_type);
    return Boolean(type && INTRO_ENGAGEMENT_TYPES.has(type));
  });
}

function pickIntroNeedingDebrief(
  engagements: ProviderEngagementSummary[],
): ProviderEngagementSummary | null {
  return introEngagements(engagements).find((e) => engagementNeedsTacticalDebrief(e)) ?? null;
}

function isActiveIntroEngagementStatus(status: string | null | undefined): boolean {
  const s = String(status ?? "").toLowerCase();
  return s === "planned" || s === "scheduled" || s === "in_progress";
}

function pickUpcomingIntroEngagement(
  engagements: ProviderEngagementSummary[],
): ProviderEngagementSummary | null {
  const upcoming = introEngagements(engagements).filter((e) =>
    isActiveIntroEngagementStatus(e.status),
  );
  if (upcoming.length === 0) return null;
  const sorted = [...upcoming].sort((a, b) => {
    const priority = (status: string) => {
      const s = status.toLowerCase();
      if (s === "in_progress") return 0;
      if (s === "scheduled" || s === "planned") return 1;
      return 2;
    };
    const pa = priority(String(a.status || ""));
    const pb = priority(String(b.status || ""));
    if (pa !== pb) return pa - pb;
    const ta = new Date(a.scheduled_at || (a.engagement_date ? `${a.engagement_date}T12:00:00` : "")).getTime();
    const tb = new Date(b.scheduled_at || (b.engagement_date ? `${b.engagement_date}T12:00:00` : "")).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return ta - tb;
  });
  return sorted[0] ?? null;
}

export function hasCompletedDebriefedIntro(
  engagements: ProviderEngagementSummary[] | undefined,
): boolean {
  return introEngagements(engagements ?? []).some(
    (e) =>
      String(e.status || "").toLowerCase() === "completed" && engagementHasTacticalDebrief(e),
  );
}

export function hasCompletedIntroTouch(
  engagements: ProviderEngagementSummary[] | undefined,
): boolean {
  return introEngagements(engagements ?? []).some(
    (e) => String(e.status || "").toLowerCase() === "completed",
  );
}

export function hasUpcomingIntroEngagement(
  engagements: ProviderEngagementSummary[] | undefined,
): boolean {
  return pickUpcomingIntroEngagement(engagements ?? []) !== null;
}

/** True when the label mirrors a finished engagement type rather than a next operational step. */
export function isStaleEngagementTypeRecommendation(
  label: string | null | undefined,
  engagements: ProviderEngagementSummary[] | undefined,
  contact?: Record<string, unknown>,
): boolean {
  if (!label?.trim()) return false;
  if (
    !hasCompletedIntroTouch(engagements) &&
    !(contact && providerPostIntroAccessWorkRemaining(contact))
  ) {
    return false;
  }
  const normalized = label.trim().toLowerCase();
  if (normalized.includes("debrief")) return false;
  if (
    normalized === PROVIDER_PROGRESSION_CTA.startIntroCall.toLowerCase() ||
    normalized === "schedule intro call" ||
    normalized === "create intro call" ||
    normalized.includes("intro call")
  ) {
    return (
      hasCompletedDebriefedIntro(engagements) ||
      hasCompletedIntroTouch(engagements) ||
      Boolean(contact && providerPostIntroAccessWorkRemaining(contact))
    );
  }
  for (const type of INTRO_ENGAGEMENT_TYPES) {
    if (normalized === formatEngagementType(type).toLowerCase()) {
      return true;
    }
  }
  return false;
}

function nextIncompleteAccessDbKey(contact: Record<string, unknown>): string {
  const credKeys = ["provider_observation_credentialing_needed", "provider_credentialing_status"] as const;
  const credDone = credKeys.every(
    (key) => mapContactFieldReadinessStatus(key, contact) === "complete",
  );
  if (!credDone) return "provider_observation_credentialing_needed";
  return "provider_observation_best_days_case_types";
}

function resolvePostIntroProgressionAction(input: {
  contact: Record<string, unknown>;
  phase: DiscoveryWorkflowMovePhase;
  providerId: string;
  newEngagementHref: string;
}): { label: string; href: string } {
  switch (input.phase) {
    case "needs_scheduling_owner":
      return {
        label: PROVIDER_PROGRESSION_CTA.validateSchedulingWorkflow,
        href: providerProfileWorkflowHref(input.providerId, "scheduling_owner"),
      };
    case "needs_access_pathway":
      return {
        label: PROVIDER_PROGRESSION_CTA.confirmSchedulingPathway,
        href: providerProfileWorkflowHref(
          input.providerId,
          "capture_field",
          "provider_observation_access_path",
        ),
      };
    case "needs_access_completion": {
      if (
        isObservationAccessConditionallyAllowed(input.contact) &&
        !isCredentialingWorkflowComplete(input.contact)
      ) {
        const credToken = String(
          input.contact[OBSERVATION_CREDENTIALING_NEEDED_DB_KEY] ?? "",
        )
          .trim()
          .toLowerCase();
        const inProgress = credToken === "in_progress";
        return {
          label: inProgress
            ? PROVIDER_PROGRESSION_CTA_LOG_CREDENTIALING_STATUS
            : PROVIDER_PROGRESSION_CTA_START_CREDENTIALING,
          href: providerProfileWorkflowHref(
            input.providerId,
            "capture_field",
            OBSERVATION_CREDENTIALING_NEEDED_DB_KEY,
          ),
        };
      }
      return {
        label: PROVIDER_PROGRESSION_CTA.validateAccessWorkflow,
        href: providerProfileWorkflowHref(
          input.providerId,
          "capture_field",
          nextIncompleteAccessDbKey(input.contact),
        ),
      };
    }
    case "ready_to_schedule":
      return {
        label: PROVIDER_PROGRESSION_CTA.coordinateObservation,
        href: buildProviderEngagementTypeHref(input.newEngagementHref, "observation_request"),
      };
    case "awaiting_approval":
    default:
      return {
        label: PROVIDER_PROGRESSION_CTA.continueDiscovery,
        href: providerProfileWorkflowHref(
          input.providerId,
          "capture_field",
          "provider_observation_feasibility",
        ),
      };
  }
}

export function deriveDiscoveryWorkflowRecommendation(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  providerId: string;
  newEngagementHref: string;
}): { label: string; href: string } {
  const engagements = input.engagements ?? [];
  const phase = resolveDiscoveryWorkflowMovePhase(input.contact);

  const debriefIntro = pickIntroNeedingDebrief(engagements);
  if (debriefIntro) {
    return {
      label: PROVIDER_OVERVIEW_DEBRIEF_NOW_CTA,
      href: buildEngagementDebriefHref(debriefIntro.id),
    };
  }

  const upcomingIntro = pickUpcomingIntroEngagement(engagements);
  if (upcomingIntro) {
    return {
      label: PROVIDER_PROGRESSION_CTA.prepareForTouch,
      href: buildEngagementPrepareForMeetingHref(upcomingIntro.id),
    };
  }

  if (phase !== "awaiting_approval") {
    return resolvePostIntroProgressionAction({
      contact: input.contact,
      phase,
      providerId: input.providerId,
      newEngagementHref: input.newEngagementHref,
    });
  }

  if (hasCompletedDebriefedIntro(engagements) || hasCompletedIntroTouch(engagements)) {
    if (providerPostIntroAccessWorkRemaining(input.contact)) {
      return {
        label: PROVIDER_PROGRESSION_CTA.createAccessFollowUp,
        href: buildProviderEngagementTypeHref(input.newEngagementHref, "follow_up"),
      };
    }
    return resolvePostIntroProgressionAction({
      contact: input.contact,
      phase: resolveDiscoveryWorkflowMovePhase(input.contact),
      providerId: input.providerId,
      newEngagementHref: input.newEngagementHref,
    });
  }

  if (engagements.length === 0) {
    return {
      label: PROVIDER_PROGRESSION_CTA.startIntroCall,
      href: buildProviderEngagementTypeHref(input.newEngagementHref, "intro_call"),
    };
  }

  if (introEngagements(engagements).length === 0) {
    return {
      label: PROVIDER_PROGRESSION_CTA.planEngagement,
      href: input.newEngagementHref,
    };
  }

  return {
    label: PROVIDER_PROGRESSION_CTA.planEngagement,
    href: input.newEngagementHref,
  };
}
