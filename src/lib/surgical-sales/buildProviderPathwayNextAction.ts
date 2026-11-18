import type { ProviderMissionEngagementPreview } from "@/lib/surgical-sales/buildProviderMissionEngagementPreview";
import { buildEngagementPrepareForMeetingHref } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import {
  normalizeEngagementType,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { deriveGatedPathwayStage } from "@/lib/surgical-sales/pathwayStageGates";
import {
  isIntroCallCompletedOnDirectoryRow,
  isIntroCallScheduledOnDirectoryRow,
} from "@/lib/surgical-sales/discoveryIntroCallActivity";
import {
  providerContactRecord,
  providerHasObservationApprovalEvidence,
} from "@/lib/surgical-sales/relationshipStageProgression";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { pickNextUpcomingEngagement } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  deriveProviderEvaluationPath,
  hasProviderSelectedEvaluationPath,
  isEvaluationStatusComplete,
  MISSION_BOARD_CHOOSE_EVALUATION_PATH_LABEL,
  providerEvaluationPathFromDirectoryRow,
  resolveEvaluationNextActionLabel,
  upcomingEngagementPreviewFromSummary,
} from "@/lib/surgical-sales/buildProviderEvaluationPathView";
import { hasStructuredCommitmentSaved } from "@/lib/surgical-sales/providerCommitmentOutcomes";
import {
  hasEvaluationMarkedSuccessful,
} from "@/lib/surgical-sales/providerCommitmentOutcomes";
import {
  MISSION_BOARD_CONFIRM_PRODUCT_COMMITMENT_LABEL,
  MISSION_BOARD_CONFIRM_STRUCTURED_USE_LABEL,
  MISSION_BOARD_LOG_OUTCOME_UPDATE_LABEL,
  MISSION_BOARD_MOVE_TO_OUTCOMES_LABEL,
} from "@/lib/surgical-sales/missionBoardCommitmentOutcomesService";
import {
  normalizeSalesPathwayStageId,
  type SalesPathwayEvaluationActivity,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import {
  deriveProviderObservationCount,
  PREPARE_DEBRIEF_LABEL,
  PROVIDER_OBSERVATION_TARGET,
  resolveObservationStageNextActionLabel,
} from "@/lib/surgical-sales/providerObservationProgress";
import { providerNeedsDebrief } from "@/lib/surgical-sales/salesExecutionNeedsAction";
import { providerDebriefReady } from "@/lib/surgical-sales/providerObservationProgress";
import { buildProviderEngagementTypeHref } from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import {
  buildProviderObservationCaseHref,
} from "@/lib/surgical-sales/providerDirectoryLinks";
import {
  buildEvaluationPathScheduleHref,
  isCaseBasedEvaluationPath,
} from "@/lib/surgical-sales/missionBoardEvaluationEngagement";
import {
  buildProviderObservationCaseRollup,
  observationQueuePrimaryHref,
  observationQueuePrimaryLabel,
} from "@/lib/surgical-sales/providerObservationCaseCollection";
import {
  hasCompletedIntroTouch,
} from "@/lib/surgical-sales/deriveProviderWorkflowRecommendation";
import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";

export type ProviderPathwayNextActionView = {
  label: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  observationProgress?: { completed: number; total: number } | null;
  evaluationPath?: SalesPathwayEvaluationActivity | null;
};

const OBSERVATION_TOTAL = PROVIDER_OBSERVATION_TARGET;

/** Admin-only labels — surfaced only when scheduled field work is blocked. */
export const SCHEDULED_FIELD_BLOCKER_ACTIONS = {
  identifyScheduler: "Identify scheduler",
  completeCredentialingPath: "Complete credentialing path",
  fillDiscoveryMapping: "Fill discovery mapping",
  addAccessPathway: "Add access pathway",
} as const;

function hasUpcomingEngagement(p: ProviderDirectoryRow): boolean {
  return (p.upcoming_engagement_count ?? 0) > 0 || Boolean(p.upcoming_engagement);
}

function resolveUpcomingEngagementType(
  engagement: ProviderMissionEngagementPreview | null | undefined,
): EngagementType | null {
  if (!engagement) return null;
  if (engagement.engagement_type) {
    return normalizeEngagementType(engagement.engagement_type) || null;
  }
  const label = String(engagement.type_label ?? "").toLowerCase();
  if (/intro/.test(label)) return "intro_call";
  if (/observation access/i.test(label)) return "observation_request";
  if (/debrief/.test(label)) return "provider_debrief";
  if (/office visit|360/.test(label)) return "office_visit_360";
  if (/in-service|training/.test(label)) return "in_service_training";
  if (/product evaluation|product demo|trial/.test(label)) return "product_demo";
  if (/observation|or visit/.test(label)) return "or_visit";
  return null;
}

function upcomingEngagementType(p: ProviderDirectoryRow): EngagementType | null {
  return resolveUpcomingEngagementType(p.upcoming_engagement);
}

function introCallScheduled(p: ProviderDirectoryRow): boolean {
  return isIntroCallScheduledOnDirectoryRow(p);
}

function introCallCompleted(p: ProviderDirectoryRow): boolean {
  return isIntroCallCompletedOnDirectoryRow(p);
}

function observationScheduled(p: ProviderDirectoryRow): boolean {
  return upcomingEngagementType(p) === "or_visit";
}

function debriefScheduled(p: ProviderDirectoryRow): boolean {
  return upcomingEngagementType(p) === "provider_debrief";
}

function observationProgress(p: ProviderDirectoryRow): { completed: number; total: number } {
  const count = deriveProviderObservationCount(p);
  return {
    completed: Math.min(OBSERVATION_TOTAL, count),
    total: OBSERVATION_TOTAL,
  };
}

/** Optional execution prep hints — never override milestone-driven next actions. */
export function resolveScheduledFieldBlockerAction(_p: ProviderDirectoryRow): string | null {
  return null;
}

function scheduleObservationLabel(completed: number): string {
  return resolveObservationStageNextActionLabel(completed);
}

function observationCaseHref(p: ProviderDirectoryRow): string {
  const accountId = p.primary_organization_id || p.organization_id || p.account_id || "";
  return buildProviderObservationCaseHref({ providerId: p.id, accountId });
}

/**
 * Canonical engagement-creation route with provider/organization prefill.
 * (The old provider-scoped `/providers/{id}/engagements/new` path does not
 * exist and 404'd the pathway CTA.)
 */
function newEngagementHrefForProvider(p: ProviderDirectoryRow): string {
  const params = new URLSearchParams({ provider_id: p.id });
  const organizationId = String(
    p.primary_organization_id || p.organization_id || p.account_id || "",
  ).trim();
  if (organizationId) params.set("organization_id", organizationId);
  return `/portal/sales/engagements/new?${params.toString()}`;
}

function discoveryNextAction(
  p: ProviderDirectoryRow,
  engagements?: ProviderEngagementSummary[],
  cases?: Array<Record<string, unknown>>,
): ProviderPathwayNextActionView {
  const contact = providerContactRecord(p);
  const newEngagementBase = newEngagementHrefForProvider(p);

  if (providerHasObservationApprovalEvidence(contact)) {
    const facilityLabel = String(p.primary_organization_name ?? "").trim() || "No organization";
    const rollup = buildProviderObservationCaseRollup({ cases, facilityLabel });
    if (rollup.upcomingCount > 0) {
      return {
        label: observationQueuePrimaryLabel(rollup.upcomingCount),
        ctaHref: observationQueuePrimaryHref({ providerId: p.id, rollup }),
      };
    }
    return {
      label: scheduleObservationLabel(0),
      ctaHref: observationCaseHref(p),
    };
  }

  if (introCallScheduled(p)) {
    return {
      label: "Prepare Intro Call",
      ...prepareBriefingCta(p),
    };
  }

  const introCompleted =
    hasCompletedIntroTouch(engagements) ||
    (engagements === undefined && introCallCompleted(p));

  if (introCompleted) {
    return { label: "Request Observation Approval" };
  }

  return {
    label: "Create Intro Call",
    ctaHref: buildProviderEngagementTypeHref(newEngagementBase, "intro_call"),
  };
}

function derivePathwayStage(p: ProviderDirectoryRow): SalesPathwayStageId | null {
  if (p.archived_at) return null;
  const stored = normalizeSalesPathwayStageId(p.relationship_pathway_stage_id);
  if (stored) return stored;
  return deriveGatedPathwayStage({ contact: providerContactRecord(p) });
}

function prepareBriefingCta(p: ProviderDirectoryRow): Pick<ProviderPathwayNextActionView, "ctaLabel" | "ctaHref"> {
  const id = p.upcoming_engagement?.id;
  if (!id) return {};
  return {
    ctaLabel: "Open Briefing",
    ctaHref: buildEngagementPrepareForMeetingHref(id),
  };
}

function deriveEvaluationPath(p: ProviderDirectoryRow): SalesPathwayEvaluationActivity {
  return deriveProviderEvaluationPath({
    upcomingEngagement: p.upcoming_engagement,
    linkedOpportunitiesCount: p.linked_opportunities_count,
    observationCount: deriveProviderObservationCount(p),
    contact: p as Record<string, unknown>,
  });
}

function newEngagementBaseForProvider(p: ProviderDirectoryRow): string {
  const params = new URLSearchParams({ provider_id: p.id });
  const accountId = String(
    p.primary_organization_id || p.organization_id || p.account_id || "",
  ).trim();
  if (accountId) params.set("organization_id", accountId);
  return `/portal/sales/engagements/new?${params.toString()}`;
}

function evaluationNextAction(p: ProviderDirectoryRow): ProviderPathwayNextActionView {
  const contact = p as Record<string, unknown>;
  const evalView = providerEvaluationPathFromDirectoryRow(p);
  const evalComplete =
    hasEvaluationMarkedSuccessful(contact) || isEvaluationStatusComplete(evalView.statusLabel);

  if (evalComplete) {
    return {
      label: MISSION_BOARD_CONFIRM_PRODUCT_COMMITMENT_LABEL,
      evaluationPath: evalView.pathLabel,
    };
  }

  if (!hasProviderSelectedEvaluationPath(contact)) {
    return {
      label: MISSION_BOARD_CHOOSE_EVALUATION_PATH_LABEL,
      evaluationPath: null,
    };
  }

  const evaluationPath = deriveEvaluationPath(p);
  const label = resolveEvaluationNextActionLabel({
    pathLabel: evaluationPath,
    engagements: undefined,
    upcomingEngagement: p.upcoming_engagement,
  });
  const view: ProviderPathwayNextActionView = {
    label,
    evaluationPath,
  };

  const accountId = p.primary_organization_id || p.organization_id || p.account_id || null;

  if (isCaseBasedEvaluationPath(evaluationPath)) {
    view.ctaHref = buildEvaluationPathScheduleHref({
      path: evaluationPath,
      providerId: p.id,
      accountId,
      newEngagementHref: newEngagementBaseForProvider(p),
    });
    return view;
  }

  if (hasUpcomingEngagement(p)) {
    Object.assign(view, prepareBriefingCta(p));
  }
  return view;
}

function observeNextAction(
  p: ProviderDirectoryRow,
  cases?: Array<Record<string, unknown>>,
): ProviderPathwayNextActionView {
  const progress = observationProgress(p);
  const facilityLabel = String(p.primary_organization_name ?? "").trim() || "No organization";
  const rollup = buildProviderObservationCaseRollup({
    cases,
    facilityLabel,
    completedCount: progress.completed,
  });

  if (rollup.upcomingCount > 0) {
    return {
      label: observationQueuePrimaryLabel(rollup.upcomingCount),
      ctaHref: observationQueuePrimaryHref({ providerId: p.id, rollup }),
      observationProgress: progress,
    };
  }

  if (progress.completed >= OBSERVATION_TOTAL) {
    return {
      label: PREPARE_DEBRIEF_LABEL,
      observationProgress: progress,
    };
  }

  return {
    label: scheduleObservationLabel(progress.completed),
    ctaHref: observationCaseHref(p),
    observationProgress: progress,
  };
}

function debriefOutcomePending(p: ProviderDirectoryRow): boolean {
  if (derivePathwayStage(p) !== "debrief") return false;
  if (debriefScheduled(p)) return false;
  if (providerNeedsDebrief(p)) return false;
  return providerDebriefReady(p);
}

function debriefNextAction(p: ProviderDirectoryRow): ProviderPathwayNextActionView {
  if (debriefScheduled(p)) {
    return {
      label: PREPARE_DEBRIEF_LABEL,
      ...prepareBriefingCta(p),
    };
  }
  if (providerNeedsDebrief(p)) {
    return { label: PREPARE_DEBRIEF_LABEL };
  }
  if (debriefOutcomePending(p)) {
    return { label: "Log Debrief Outcome" };
  }
  return { label: "Schedule Debrief" };
}

/** Evidence-based next action for execution queue and mission board — pathway rules only. */
export function buildProviderPathwayNextAction(
  p: ProviderDirectoryRow,
  options?: {
    engagements?: ProviderEngagementSummary[];
    cases?: Array<Record<string, unknown>>;
  },
): ProviderPathwayNextActionView {
  if (p.archived_at) return { label: "Review Archive" };
  if (isProviderSalesCustomer(p)) return { label: "Customer" };
  if (p.onboarding_status === "draft") return { label: "Create Intro Call" };

  const scheduledBlocker = resolveScheduledFieldBlockerAction(p);
  if (scheduledBlocker) {
    return { label: scheduledBlocker };
  }

  const stage = derivePathwayStage(p);
  if (!stage) return { label: "Review Provider" };

  switch (stage) {
    case "discovery":
      return discoveryNextAction(p, options?.engagements, options?.cases);
    case "observe":
      return observeNextAction(p, options?.cases);
    case "debrief":
      return debriefNextAction(p);
    case "evaluation":
      return evaluationNextAction(p);
    case "commitment": {
      if (!hasStructuredCommitmentSaved(p as Record<string, unknown>)) {
        return { label: MISSION_BOARD_CONFIRM_STRUCTURED_USE_LABEL };
      }
      return { label: MISSION_BOARD_MOVE_TO_OUTCOMES_LABEL };
    }
    case "outcomes":
      return { label: MISSION_BOARD_LOG_OUTCOME_UPDATE_LABEL };
    default:
      return { label: "Review Provider" };
  }
}

export function deriveProviderPathwayNextActionLabel(p: ProviderDirectoryRow): string {
  return buildProviderPathwayNextAction(p).label;
}

/** Profile / overview adapter — same pathway next-action rules as execution queue. */
export function buildProviderProfilePathwayNextAction(input: {
  contact: Record<string, unknown>;
  providerId: string;
  pathwayStageId: SalesPathwayStageId;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  linkedOpportunitiesCount?: number;
  observationCount?: number;
}): ProviderPathwayNextActionView {
  const upcoming = pickNextUpcomingEngagement(input.engagements ?? []);
  const row = {
    id: input.providerId,
    specialty: null,
    primary_organization_name: null,
    primary_organization_id: null,
    organization_count: 0,
    additional_organizations_count: 0,
    territory: null,
    planning_status: "not_started" as const,
    linked_opportunities_count: input.linkedOpportunitiesCount ?? 0,
    recent_case_count: (input.cases ?? []).length,
    last_activity_at: String(input.contact.last_contacted_at ?? "") || null,
    last_contacted_at: (input.contact.last_contacted_at as string | null | undefined) ?? null,
    relationship_pathway_stage_id: input.pathwayStageId,
    observation_count: input.observationCount ?? 0,
    upcoming_engagement_count: upcoming ? 1 : 0,
    upcoming_engagement: upcomingEngagementPreviewFromSummary(upcoming),
    ...input.contact,
  } as ProviderDirectoryRow;
  return buildProviderPathwayNextAction(row, {
    engagements: input.engagements,
    cases: input.cases,
  });
}
