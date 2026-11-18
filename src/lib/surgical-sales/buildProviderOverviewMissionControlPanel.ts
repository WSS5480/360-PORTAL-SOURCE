/**
 * Provider overview Mission Control — advancement-driven field posture.
 *
 * Driven by mission objective, stage, confirmed milestones, and the most likely
 * next action — never by missing intelligence gaps.
 */

import { buildProviderProfilePathwayNextAction } from "@/lib/surgical-sales/buildProviderPathwayNextAction";
import {
  buildProviderMissionProgress,
  missionProgressAtLeast,
  type MissionProgressLevelId,
  type ProviderMissionProgressView,
} from "@/lib/surgical-sales/buildProviderMissionProgress";
import {
  buildProviderFieldIntelligenceModel,
  type ProviderFieldIntelligenceModel,
} from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import { buildProviderObservationReadiness } from "@/lib/surgical-sales/providerObservationReadiness";
import { readProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import { countObservedProcedures } from "@/lib/surgical-sales/pathwayStageGates";
import { hasCompletedIntroTouch } from "@/lib/surgical-sales/deriveProviderWorkflowRecommendation";
import {
  normalizeSalesPathwayStageId,
  SALES_PATHWAY_STAGE_LABELS,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import { resolveSalesPathwayStage } from "@/lib/surgical-sales/pathway/resolveSalesPathwayStage";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";
import { buildProviderEngagementTypeHref } from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import { buildProviderObservationCaseHref } from "@/lib/surgical-sales/providerDirectoryLinks";
import {
  PROVIDER_ACCESS_FOLLOW_UP_CTA,
  PROVIDER_RECOMMENDED_ACCESS_FOLLOW_UP_ENGAGEMENT,
} from "@/lib/surgical-sales/providerObservationReadiness";
import {
  buildDiscoveryObservationPermissionMilestones,
  DISCOVERY_COMMERCIAL_OBJECTIVE,
  observationPermissionStageLabel,
  resolveObservationPermissionStage,
} from "@/lib/surgical-sales/observationPermissionModel";

export type MissionControlStatusMilestone = {
  id: string;
  label: string;
  state: "complete" | "current" | "upcoming";
};

export type ProviderOverviewMissionControlPanel = {
  missionObjective: string;
  stageId: SalesPathwayStageId;
  stageLabel: string;
  missionStatus: MissionControlStatusMilestone[];
  knownFacts: string[];
  optionalIntelligence: string[];
  recommendedAction: {
    label: string;
    href: string | null;
    detail: string | null;
  };
};

/** Stage mission objectives — what the rep is trying to accomplish, not data completeness. */
export const MISSION_CONTROL_STAGE_OBJECTIVES: Record<SalesPathwayStageId, string> = {
  discovery: DISCOVERY_COMMERCIAL_OBJECTIVE,
  observe: "Complete observation series",
  debrief: "Validate clinical opportunities",
  evaluation: "Confirm evaluation fit",
  commitment: "Support committed adoption",
  outcomes: "Sustain clinical outcomes",
};

const MISSION_LEVEL_RANK: Record<MissionProgressLevelId, number> = {
  prospect: 0,
  interested: 1,
  approved: 2,
  observed: 3,
  debriefed: 4,
  committed: 5,
};

function missionLevelMilestoneState(
  levelRank: number,
  milestoneRank: number,
): MissionControlStatusMilestone["state"] {
  if (levelRank >= milestoneRank) return "complete";
  if (levelRank === milestoneRank - 1) return "current";
  return "upcoming";
}

function permissionStageDetail(
  contact: Record<string, unknown>,
  engagements?: ProviderEngagementSummary[],
): string | null {
  const stage = resolveObservationPermissionStage({ contact, engagements });
  switch (stage) {
    case "unknown":
      return "Establish whether the provider is open to OR observation.";
    case "interested":
      return "Interest is on file — confirm formal observation permission.";
    case "permission_not_yet_confirmed":
      return "Secure validated observation permission to unlock scheduling.";
    case "permission_confirmed":
      return "Permission confirmed — coordinate the first observation.";
    case "observation_scheduled":
      return "Observation is scheduled — prepare for the OR day.";
    case "observation_completed":
      return "First observation complete — advance the pathway.";
    default:
      return null;
  }
}

function observeMissionStatus(
  levelId: MissionProgressLevelId,
  observationCount: number,
  target: number,
): MissionControlStatusMilestone[] {
  const complete = observationCount >= target;
  const inSeries = observationCount > 0;
  return [
    {
      id: "permission_confirmed",
      label: "Permission Confirmed",
      state: missionProgressAtLeast(levelId, "approved") ? "complete" : "upcoming",
    },
    {
      id: "observing",
      label: inSeries ? `${Math.min(observationCount, target)} of ${target} observed` : "Observing",
      state: complete ? "complete" : inSeries || missionProgressAtLeast(levelId, "approved") ? "current" : "upcoming",
    },
    {
      id: "series_complete",
      label: "Series complete",
      state: complete ? "complete" : inSeries ? "upcoming" : "upcoming",
    },
  ];
}

function debriefMissionStatus(levelId: MissionProgressLevelId): MissionControlStatusMilestone[] {
  const rank = MISSION_LEVEL_RANK[levelId];
  return [
    { id: "observed", label: "Observation Completed", state: missionLevelMilestoneState(rank, 3) },
    { id: "debriefed", label: "Debriefed", state: missionLevelMilestoneState(rank, 4) },
    { id: "evaluation", label: "Evaluation", state: missionLevelMilestoneState(rank, 5) },
  ];
}

function genericStageMissionStatus(
  stageId: SalesPathwayStageId,
  levelId: MissionProgressLevelId,
): MissionControlStatusMilestone[] {
  const stageLabel = SALES_PATHWAY_STAGE_LABELS[stageId];
  return [
    {
      id: "current_stage",
      label: stageLabel,
      state: "current",
    },
    {
      id: "advance",
      label: "Advance pathway",
      state: missionProgressAtLeast(levelId, "debriefed") ? "complete" : "upcoming",
    },
  ];
}

function buildMissionStatusMilestones(input: {
  stageId: SalesPathwayStageId;
  missionProgress: ProviderMissionProgressView;
  observationCount: number;
  observationTarget: number;
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
}): MissionControlStatusMilestone[] {
  const { stageId, missionProgress, observationCount, observationTarget } = input;
  switch (stageId) {
    case "discovery":
      return buildDiscoveryObservationPermissionMilestones({
        contact: input.contact,
        engagements: input.engagements,
        cases: input.cases,
      });
    case "observe":
      return observeMissionStatus(missionProgress.levelId, observationCount, observationTarget);
    case "debrief":
      return debriefMissionStatus(missionProgress.levelId);
    default:
      return genericStageMissionStatus(stageId, missionProgress.levelId);
  }
}

function pushUniqueLine(lines: string[], seen: Set<string>, text: string): void {
  const line = scanLine(text.replace(/\.$/, ""), 96).trim();
  if (!line) return;
  const normalized = line.endsWith(".") ? line : `${line}.`;
  const key = normalized.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  lines.push(normalized);
}

function buildKnownFacts(input: {
  contact: Record<string, unknown>;
  model: ProviderFieldIntelligenceModel;
  missionProgress: ProviderMissionProgressView;
  engagements?: ProviderEngagementSummary[];
  observationCount: number;
}): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  const permissionStage = resolveObservationPermissionStage({
    contact: input.contact,
    engagements: input.engagements,
  });
  pushUniqueLine(lines, seen, observationPermissionStageLabel(permissionStage));
  if (input.observationCount > 0) {
    pushUniqueLine(
      lines,
      seen,
      `${input.observationCount} observation${input.observationCount === 1 ? "" : "s"} on file`,
    );
  }
  if (hasCompletedIntroTouch(input.engagements)) {
    pushUniqueLine(lines, seen, "Intro call completed");
  }
  if (input.model.observationApproval.isConfirmed && permissionStage !== "permission_confirmed") {
    const line = input.model.observationApproval.primaryLine.trim();
    if (line && !/not interested|declined|denied|unknown/i.test(line)) {
      pushUniqueLine(lines, seen, line);
    }
  }

  if (lines.length === 0) {
    pushUniqueLine(lines, seen, observationPermissionStageLabel("unknown"));
  }

  return lines.slice(0, 5);
}

function buildOptionalIntelligence(input: {
  contact: Record<string, unknown>;
  model: ProviderFieldIntelligenceModel;
  missionProgress: ProviderMissionProgressView;
}): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  const readiness = buildProviderObservationReadiness(input.contact);
  const commercial = readProviderCommercialIntelligence(input.contact);
  const { model } = input;

  if (
    readiness.schedulerIdentified === "partial" ||
    commercial?.scheduling.scheduler_identified === "partial" ||
    commercial?.scheduling.scheduler_identified === "yes"
  ) {
    pushUniqueLine(lines, seen, "Scheduler mentioned");
  } else if (
    model.scheduler.captureState === "referenced" ||
    model.scheduler.captureState === "learning"
  ) {
    pushUniqueLine(lines, seen, "Scheduler mentioned");
  }

  for (const procedure of model.clinical.procedures.slice(0, 2)) {
    pushUniqueLine(lines, seen, `${procedure} focus`);
  }
  for (const trend of model.clinical.trends.slice(0, 2)) {
    pushUniqueLine(lines, seen, trend);
  }
  for (const frustration of model.clinical.frustrations.slice(0, 1)) {
    pushUniqueLine(lines, seen, frustration);
  }
  if (model.procedureInterests.isConfirmed && model.procedureInterests.primaryLine.trim()) {
    pushUniqueLine(lines, seen, model.procedureInterests.primaryLine);
  }

  if (
    model.credentialing.captureState !== "empty" &&
    readiness.credentialingPathKnown !== "yes" &&
    model.credentialing.displayValue.trim()
  ) {
    const cred = scanLine(model.credentialing.displayValue, 72);
    if (cred && !/required/i.test(cred)) {
      pushUniqueLine(lines, seen, cred);
    }
  }

  return lines.slice(0, 4);
}

function resolveRecommendedActionHref(input: {
  label: string;
  stageId: SalesPathwayStageId;
  pathwayAction: ReturnType<typeof buildProviderProfilePathwayNextAction>;
  newEngagementHref: string;
  primaryCtaHref?: string | null;
  providerId: string;
  contact: Record<string, unknown>;
}): string | null {
  if (input.primaryCtaHref?.trim()) return input.primaryCtaHref;
  if (input.pathwayAction.ctaHref?.trim()) return input.pathwayAction.ctaHref;

  const label = input.label.trim();
  if (input.stageId === "discovery") {
    if (
      label === PROVIDER_ACCESS_FOLLOW_UP_CTA ||
      /access follow-up/i.test(label) ||
      label === PROVIDER_RECOMMENDED_ACCESS_FOLLOW_UP_ENGAGEMENT
    ) {
      return buildProviderEngagementTypeHref(input.newEngagementHref, "follow_up");
    }
    if (/request observation approval/i.test(label)) {
      return null;
    }
    if (/intro call/i.test(label)) {
      return buildProviderEngagementTypeHref(input.newEngagementHref, "intro_call");
    }
  }
  if (input.stageId === "observe") {
    return buildProviderObservationCaseHref({
      providerId: input.providerId,
      accountId: String(input.contact.account_id ?? input.contact.organization_id ?? ""),
    });
  }
  if (input.stageId === "debrief" && /debrief/i.test(label)) {
    return buildProviderEngagementTypeHref(input.newEngagementHref, "provider_debrief");
  }

  return input.newEngagementHref;
}

export function buildProviderOverviewMissionControlPanel(input: {
  contact: Record<string, unknown>;
  providerId: string;
  planning?: ProviderPlanningCompletion | null;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  newEngagementHref: string;
  primaryCtaHref?: string | null;
  observationTarget?: number;
}): ProviderOverviewMissionControlPanel {
  const contact = input.contact ?? {};
  const observationTarget = input.observationTarget ?? 5;
  const precomputedStage = normalizeSalesPathwayStageId(
    String(contact.provider_relationship_pathway_stage_id ?? ""),
  );
  const stageId =
    precomputedStage ??
    resolveSalesPathwayStage({
      contact,
      engagements: input.engagements,
      cases: input.cases,
    });

  const observationCount = countObservedProcedures({
    contact,
    engagements: input.engagements,
    cases: input.cases,
  });

  const missionProgress = buildProviderMissionProgress({
    contact,
    engagements: input.engagements,
    cases: input.cases,
    stageId,
  });

  const model = buildProviderFieldIntelligenceModel({
    contact,
    engagements: input.engagements,
    cases: input.cases,
  });

  const pathwayAction = buildProviderProfilePathwayNextAction({
    contact,
    providerId: input.providerId,
    pathwayStageId: stageId,
    engagements: input.engagements,
    cases: input.cases,
    observationCount,
  });

  const actionLabel = (pathwayAction.ctaLabel ?? pathwayAction.label).trim();
  const actionHref = resolveRecommendedActionHref({
    label: actionLabel,
    stageId,
    pathwayAction,
    newEngagementHref: input.newEngagementHref,
    primaryCtaHref: input.primaryCtaHref,
    providerId: input.providerId,
    contact,
  });

  return {
    missionObjective: MISSION_CONTROL_STAGE_OBJECTIVES[stageId],
    stageId,
    stageLabel: SALES_PATHWAY_STAGE_LABELS[stageId],
    missionStatus: buildMissionStatusMilestones({
      stageId,
      missionProgress,
      observationCount,
      observationTarget,
      contact,
      engagements: input.engagements,
      cases: input.cases,
    }),
    knownFacts: buildKnownFacts({
      contact,
      model,
      missionProgress,
      engagements: input.engagements,
      observationCount,
    }),
    optionalIntelligence: buildOptionalIntelligence({
      contact,
      model,
      missionProgress,
    }),
    recommendedAction: {
      label: actionLabel,
      href: actionHref,
      detail:
        stageId === "discovery"
          ? permissionStageDetail(contact, input.engagements)
          : missionProgress.primaryMilestoneMet
            ? missionProgress.nextMilestoneLabel
              ? `Next milestone: ${missionProgress.nextMilestoneLabel.toLowerCase()}`
              : null
            : missionProgress.primaryMilestoneLabel
              ? `Current milestone: ${missionProgress.primaryMilestoneLabel.toLowerCase()}`
              : null,
    },
  };
}

/** @deprecated Briefing lines derived from panel — for legacy consumers only. */
export function missionControlPanelBriefingLines(
  panel: ProviderOverviewMissionControlPanel,
): string[] {
  const lines = [...panel.knownFacts];
  if (panel.optionalIntelligence.length > 0) {
    lines.push(`${BRIEF.supplementaryBriefingLead.split("—")[0]?.trim() ?? "Optional context"} on file`);
  }
  return lines.slice(0, 5);
}
