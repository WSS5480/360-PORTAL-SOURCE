/**
 * Provider overview Mission Control — advancement-driven field posture.
 * Derives mission objective, milestones, known facts, and next action from
 * pathway stage and confirmed milestones (not intelligence gaps).
 */

import { buildEngagementSurfaceActionsFromSummary } from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import { debriefWorkflowPrimaryLabel } from "@/lib/surgical-sales/debriefEngagementLifecycle";
import {
  deriveIntroCallLifecyclePrimaryAction,
} from "@/lib/surgical-sales/introCallEngagementLifecycle";
import {
  resolveEngagementWorkflowStateFromSummary,
  type EngagementWorkflowState,
} from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import {
  normalizeEngagementType,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  formatEngagementWhen,
  pickNextUpcomingEngagement,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { buildProviderMissionProgress, missionProgressAtLeast } from "@/lib/surgical-sales/buildProviderMissionProgress";
import { MISSION_CONTROL_STAGE_OBJECTIVES } from "@/lib/surgical-sales/buildProviderOverviewMissionControlPanel";
import { buildProviderProfilePathwayNextAction } from "@/lib/surgical-sales/buildProviderPathwayNextAction";
import { missionEngagementTypeLabel } from "@/lib/surgical-sales/buildProviderMissionEngagementPreview";
import { resolveSalesPathwayStage as resolvePathwayStageFromEvidence } from "@/lib/surgical-sales/pathway/resolveSalesPathwayStage";
import {
  buildProviderFieldIntelligenceModel,
  type ProviderFieldIntelligenceModel,
} from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import {
  buildProviderObservationReadiness,
  PROVIDER_ACCESS_FOLLOW_UP_CTA,
  PROVIDER_RECOMMENDED_ACCESS_FOLLOW_UP_ENGAGEMENT,
} from "@/lib/surgical-sales/providerObservationReadiness";
import { hasCompletedIntroTouch } from "@/lib/surgical-sales/deriveProviderWorkflowRecommendation";
import { observationFeasibilityToken } from "@/lib/surgical-sales/observationAccessWorkflowState";
import { countObservedProcedures } from "@/lib/surgical-sales/pathwayStageGates";
import { PROVIDER_OBSERVATION_TARGET } from "@/lib/surgical-sales/providerObservationProgress";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import { normalizeSalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { buildProviderEngagementTypeHref } from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import { buildProviderObservationCaseHref, buildProviderObservationCaseWorkflowHref } from "@/lib/surgical-sales/providerDirectoryLinks";
import {
  buildProviderObservationCaseRollup,
  buildProviderObservationCaseQueueHref,
  observationQueuePrimaryLabel,
} from "@/lib/surgical-sales/providerObservationCaseCollection";
import type { ProviderOverviewTacticalHeroModel } from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";
import type { ProviderOverviewNextBestActionModel } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export type ProviderOverviewMissionBriefingStatus = {
  lines: string[];
  summary: string;
};

export type ProviderOverviewMissionPosture = {
  stageId: SalesPathwayStageId;
  nextEngagement: string;
  nextEngagementDetail: string | null;
  currentObjective: string;
  briefingStatus: ProviderOverviewMissionBriefingStatus;
  primaryCta: { label: string; href: string } | null;
};

const STAGE_OBJECTIVE = MISSION_CONTROL_STAGE_OBJECTIVES;

const OBSERVATION_ENGAGEMENT_TYPES = new Set<EngagementType>([
  "or_visit",
  "or_observation",
  "observation_request",
]);

function missionEngagementLabel(
  engagementType: string | null | undefined,
  stageId: SalesPathwayStageId,
): string {
  const normalized = normalizeEngagementType(String(engagementType ?? ""));
  if (normalized === "follow_up" && stageId === "discovery") {
    return PROVIDER_RECOMMENDED_ACCESS_FOLLOW_UP_ENGAGEMENT;
  }
  if (normalized === "or_visit" || normalized === "or_observation") {
    return "Case Observation";
  }
  if (normalized === "observation_request") {
    return "Observation Access Request";
  }
  if (normalized === "provider_debrief") {
    return "Provider Debrief";
  }
  if (normalized === "intro_call") {
    return "Intro Call";
  }
  return missionEngagementTypeLabel(engagementType);
}

const SCHEDULED_ENGAGEMENT_STATUSES = new Set([
  "planned",
  "scheduled",
  "confirmed",
  "in_progress",
  "active",
  "booked",
]);

function normalizePathwayLabelToEngagement(label: string, stageId: SalesPathwayStageId): string {
  const normalized = label.trim();
  if (/access follow-up/i.test(normalized)) {
    return PROVIDER_RECOMMENDED_ACCESS_FOLLOW_UP_ENGAGEMENT;
  }
  if (/intro call/i.test(normalized)) {
    return "Intro Call";
  }
  if (/observation/i.test(normalized) && stageId === "observe") {
    return "Case Observation";
  }
  if (/debrief/i.test(normalized)) {
    return "Provider Debrief";
  }
  return normalized;
}

function recommendedNextEngagementLabel(input: {
  stageId: SalesPathwayStageId;
  contact: Record<string, unknown>;
  providerId: string;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
}): string {
  const upcoming = pickNextUpcomingEngagement(input.engagements);
  if (upcoming) {
    return missionEngagementLabel(upcoming.engagement_type, input.stageId);
  }

  const pathwayAction = buildProviderProfilePathwayNextAction({
    contact: input.contact,
    providerId: input.providerId,
    pathwayStageId: input.stageId,
    engagements: input.engagements,
    cases: input.cases,
    observationCount: countObservedProcedures({
      contact: input.contact,
      engagements: input.engagements,
      cases: input.cases,
    }),
  });

  return normalizePathwayLabelToEngagement(pathwayAction.label, input.stageId);
}

function pushBriefingLine(lines: string[], seen: Set<string>, text: string): void {
  const line = scanLine(text.replace(/\.$/, ""), 96).trim();
  if (!line) return;
  const normalized = line.endsWith(".") ? line : `${line}.`;
  const key = normalized.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  lines.push(normalized);
}

function buildBriefingStatusLines(input: {
  stageId: SalesPathwayStageId;
  contact: Record<string, unknown>;
  model: ProviderFieldIntelligenceModel;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  planning?: ProviderPlanningCompletion | null;
}): string[] {
  const missionProgress = buildProviderMissionProgress({
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
    stageId: input.stageId,
  });
  const readiness = buildProviderObservationReadiness(input.contact);
  const lines: string[] = [];
  const seen = new Set<string>();

  if (missionProgressAtLeast(missionProgress.levelId, "interested")) {
    pushBriefingLine(lines, seen, "Provider interested in observation");
  }
  if (missionProgressAtLeast(missionProgress.levelId, "approved")) {
    pushBriefingLine(lines, seen, "Observation approved");
  }
  if (readiness.credentialingRequired === "yes") {
    pushBriefingLine(lines, seen, "Credentialing required");
  } else if (
    observationFeasibilityToken(input.contact) === "credentialing_required" ||
    /\bcredentialing required\b/i.test(String(input.contact.provider_observation_feasibility ?? ""))
  ) {
    pushBriefingLine(lines, seen, "Credentialing required");
  }
  if (hasCompletedIntroTouch(input.engagements)) {
    pushBriefingLine(lines, seen, "Intro call completed");
  }

  const observationCount = countObservedProcedures({
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
  });
  if (input.stageId === "observe" && observationCount > 0) {
    pushBriefingLine(
      lines,
      seen,
      `${Math.min(observationCount, PROVIDER_OBSERVATION_TARGET)} of ${PROVIDER_OBSERVATION_TARGET} cases observed`,
    );
  }

  if (lines.length === 0) {
    pushBriefingLine(lines, seen, STAGE_OBJECTIVE[input.stageId] ?? "Advance pathway stage");
  }

  return lines.slice(0, 5);
}

function resolveMissionCtaLabel(input: {
  stageId: SalesPathwayStageId;
  engagement?: ProviderEngagementSummary | null;
  workflowState?: EngagementWorkflowState;
  pathwayLabel: string;
  observationUpcomingCount?: number;
}): string {
  if (input.engagement) {
    const type = normalizeEngagementType(String(input.engagement.engagement_type ?? ""));
    const state =
      input.workflowState ?? resolveEngagementWorkflowStateFromSummary(input.engagement);

    if (type && OBSERVATION_ENGAGEMENT_TYPES.has(type)) {
      if (state === "in_progress" || state === "prepared") return "Launch Observation";
      if (state === "planned") return "Prepare for Observation";
    }

    if (type === "provider_debrief") {
      return debriefWorkflowPrimaryLabel(state);
    }

    if (type === "intro_call") {
      return deriveIntroCallLifecyclePrimaryAction({
        id: input.engagement.id,
        status: input.engagement.status,
        prepared_at: input.engagement.prepared_at ?? null,
        planning_status: input.engagement.planning_status ?? null,
      }).label;
    }

    if (type === "follow_up" && input.stageId === "discovery") {
      if (state === "planned" || state === "prepared") return PROVIDER_ACCESS_FOLLOW_UP_CTA;
      if (state === "in_progress") return "Continue Access Follow-Up";
    }
  }

  if (input.stageId === "discovery") {
    if (
      input.pathwayLabel === PROVIDER_RECOMMENDED_ACCESS_FOLLOW_UP_ENGAGEMENT ||
      input.pathwayLabel === PROVIDER_ACCESS_FOLLOW_UP_CTA ||
      /access follow-up/i.test(input.pathwayLabel)
    ) {
      return PROVIDER_ACCESS_FOLLOW_UP_CTA;
    }
  }

  if (input.stageId === "observe") {
    if (/prepare|briefing|launch/i.test(input.pathwayLabel)) {
      const upcoming = input.observationUpcomingCount ?? 0;
      if (upcoming > 0) return observationQueuePrimaryLabel(upcoming);
    }
    if (/observation|case|debrief|queue|next/i.test(input.pathwayLabel)) {
      return input.pathwayLabel;
    }
  }

  if (input.stageId === "debrief" && /debrief/i.test(input.pathwayLabel)) {
    return input.pathwayLabel === "Prepare Debrief" ? "Prepare Debrief" : "Start Debrief";
  }

  return input.pathwayLabel;
}

function resolveEngagementDebriefPriorityCta(
  engagement: ProviderEngagementSummary,
): { label: string; href: string } | null {
  const workflowState = resolveEngagementWorkflowStateFromSummary(engagement);
  if (workflowState !== "completed") return null;

  const surface = buildEngagementSurfaceActionsFromSummary(engagement);
  const href = String(surface.primary.href ?? "").trim();
  const label = String(surface.primary.label ?? "").trim();
  if (!href || !label) return null;

  return { label, href };
}

function resolvePrimaryCtaHref(input: {
  contact: Record<string, unknown>;
  providerId: string;
  stageId: SalesPathwayStageId;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  newEngagementHref: string;
  engagement?: ProviderEngagementSummary | null;
  hero: ProviderOverviewTacticalHeroModel;
  nextBestAction: ProviderOverviewNextBestActionModel;
}): { label: string; href: string } | null {
  if (input.engagement) {
    const debriefCta = resolveEngagementDebriefPriorityCta(input.engagement);
    if (debriefCta) return debriefCta;
  }

  if (input.stageId !== "observe" && input.engagement) {
    const type = normalizeEngagementType(String(input.engagement.engagement_type ?? ""));
    if (type === "intro_call") {
      const lifecycle = deriveIntroCallLifecyclePrimaryAction({
        id: input.engagement.id,
        status: input.engagement.status,
        prepared_at: input.engagement.prepared_at ?? null,
        planning_status: input.engagement.planning_status ?? null,
      });
      return { label: lifecycle.label, href: lifecycle.href };
    }

    const surface = buildEngagementSurfaceActionsFromSummary(input.engagement);
    const label = resolveMissionCtaLabel({
      stageId: input.stageId,
      engagement: input.engagement,
      pathwayLabel: surface.primary.label,
    });
    return { label, href: surface.primary.href };
  }

  const pathwayAction = buildProviderProfilePathwayNextAction({
    contact: input.contact,
    providerId: input.providerId,
    pathwayStageId: input.stageId,
    engagements: input.engagements,
    cases: input.cases,
    observationCount: countObservedProcedures({
      contact: input.contact,
      engagements: input.engagements,
      cases: input.cases,
    }),
  });

  const facilityLabel =
    String(input.contact.primary_organization_name ?? input.contact.organization_name ?? "").trim() ||
    "No organization";
  const observationRollup = buildProviderObservationCaseRollup({
    cases: input.cases,
    facilityLabel,
  });

  const label = resolveMissionCtaLabel({
    stageId: input.stageId,
    pathwayLabel: pathwayAction.ctaLabel ?? pathwayAction.label,
    observationUpcomingCount: observationRollup.upcomingCount,
  });

  let href =
    pathwayAction.ctaHref ??
    input.nextBestAction.href ??
    input.hero.actions.find((action) => action.emphasis === "primary" && action.href)?.href ??
    null;

  if (!href) {
    if (input.stageId === "discovery") {
      if (label === PROVIDER_ACCESS_FOLLOW_UP_CTA) {
        href = buildProviderEngagementTypeHref(input.newEngagementHref, "follow_up");
      } else if (/intro/i.test(label)) {
        href = buildProviderEngagementTypeHref(input.newEngagementHref, "intro_call");
      }
    } else if (input.stageId === "observe") {
      if (observationRollup.upcomingCount > 1) {
        href = buildProviderObservationCaseQueueHref(input.providerId);
      } else if (observationRollup.nextScheduled?.caseId) {
        href = buildProviderObservationCaseWorkflowHref(observationRollup.nextScheduled.caseId);
      } else {
        href = buildProviderObservationCaseHref({
          providerId: input.providerId,
          accountId: String(input.contact.account_id ?? input.contact.organization_id ?? ""),
        });
      }
    } else if (input.stageId === "debrief" && /debrief/i.test(label)) {
      href = buildProviderEngagementTypeHref(input.newEngagementHref, "provider_debrief");
    }
  }

  if (!href && (input.engagements?.length ?? 0) === 0) {
    href = input.newEngagementHref;
  }

  if (!href || !label.trim()) return null;
  return { label: label.trim(), href };
}

function resolveCurrentObjective(input: {
  stageId: SalesPathwayStageId;
  fallbackGoal: string;
}): string {
  const stageObjective = STAGE_OBJECTIVE[input.stageId];
  if (stageObjective) return stageObjective;
  return input.fallbackGoal.trim() || "Advance pathway stage";
}

export function buildProviderOverviewMissionPosture(input: {
  contact: Record<string, unknown>;
  providerId: string;
  planning?: ProviderPlanningCompletion | null;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
  relationshipStage?: string | null;
  newEngagementHref: string;
  currentGoal: string;
  nextBestAction: ProviderOverviewNextBestActionModel;
  hero: ProviderOverviewTacticalHeroModel;
  activeEngagement?: ProviderEngagementSummary | null;
}): ProviderOverviewMissionPosture {
  const contact = input.contact ?? {};
  const precomputedStage = normalizeSalesPathwayStageId(
    String(
      contact.provider_relationship_pathway_stage_id ??
        contact.relationship_pathway_stage_id ??
        input.relationshipStage ??
        "",
    ),
  );
  const stageId =
    precomputedStage ??
    resolvePathwayStageFromEvidence({
      contact,
      relationship_pathway_stage_id: precomputedStage,
      engagements: input.engagements,
      cases: input.cases,
    });

  const model = buildProviderFieldIntelligenceModel({
    contact,
    engagements: input.engagements,
    cases: input.cases,
  });

  const activeEngagement = input.activeEngagement ?? null;
  const nextEngagement = activeEngagement
    ? missionEngagementLabel(activeEngagement.engagement_type, stageId)
    : recommendedNextEngagementLabel({
        stageId,
        contact,
        providerId: input.providerId,
        engagements: input.engagements,
        cases: input.cases,
      });

  const nextEngagementDetail = activeEngagement
    ? `${formatEngagementWhen(activeEngagement) || "Date pending"} · ${activeEngagement.status_label?.trim() || "Scheduled"}`
    : null;

  const briefingLines = buildBriefingStatusLines({
    stageId,
    contact,
    model,
    engagements: input.engagements,
    cases: input.cases,
    planning: input.planning,
  });

  const currentObjective = resolveCurrentObjective({
    stageId,
    fallbackGoal: input.currentGoal,
  });

  const primaryCta = resolvePrimaryCtaHref({
    contact,
    providerId: input.providerId,
    stageId,
    engagements: input.engagements,
    cases: input.cases,
    newEngagementHref: input.newEngagementHref,
    engagement: activeEngagement,
    hero: input.hero,
    nextBestAction: input.nextBestAction,
  });

  return {
    stageId,
    nextEngagement,
    nextEngagementDetail,
    currentObjective,
    briefingStatus: {
      lines: briefingLines,
      summary: briefingLines.join(" "),
    },
    primaryCta,
  };
}
