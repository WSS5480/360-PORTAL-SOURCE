/**
 * Unified Discovery State — single read-model resolver for observation interest,
 * permission, access pathway progress, discovery stage, and next action.
 */

import {
  buildDiscoveryAdvancementSignal,
  type DiscoveryAdvancementSignal,
} from "@/lib/surgical-sales/discoveryAdvancementSignal";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import type { ProviderDiscoveryStatusLabel } from "@/lib/surgical-sales/buildProviderDiscoveryProgressView";
import { deriveSalesPathwayState } from "@/lib/surgical-sales/deriveSalesPathwayState";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import {
  providerHasObservationInterestSignal,
  resolveNormalizedObservationPermission,
  type NormalizedObservationPermission,
  type ObservationPermissionStageId,
} from "@/lib/surgical-sales/observationPermissionModel";
import { buildProviderFieldIntelligenceModel } from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { buildProviderObservationReadiness } from "@/lib/surgical-sales/providerObservationReadiness";
import { resolveSuggestedSchedulerCandidate } from "@/lib/surgical-sales/candidateContactIntelligence";
import { resolveDiscoveryPathwayNextMoveLine } from "@/lib/surgical-sales/providerOverviewDiscoveryNextMove";
import { resolveSalesPathwayStage } from "@/lib/surgical-sales/pathway/resolveSalesPathwayStage";
import {
  resolvePathwayActionForAccessStep,
  type ProviderAccessStepPathwayAction,
} from "@/lib/surgical-sales/providerAccessStepPathwayActions";
import {
  SALES_PATHWAY_STAGE_LABELS,
  SALES_PATHWAY_STAGE_SHORT_LABELS,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import { hasScheduledObservation } from "@/lib/surgical-sales/buildProviderIntelligenceFieldEvidenceCards";

export type { DiscoveryAdvancementSignal } from "@/lib/surgical-sales/discoveryAdvancementSignal";

export type ProviderDiscoveryAccessStepState = "known" | "partial" | "missing";

export type ProviderDiscoveryAccessStep = {
  id: string;
  label: string;
  state: ProviderDiscoveryAccessStepState;
  detailLine?: string | null;
  actionable?: boolean;
  action?: ProviderAccessStepPathwayAction | null;
  actionLabel?: string | null;
};

export type ProviderDiscoveryAccessPathwayPulseTone = "success" | "warning" | "progress" | "neutral";

export type ProviderDiscoveryObservationInterest = {
  known: boolean;
  hasInterestSignal: boolean;
  label: string;
};

export type ProviderDiscoveryAccessPathway = {
  steps: ProviderDiscoveryAccessStep[];
  completionLabel: string;
  knownCount: number;
  missingCount: number;
  pulseStatusLabel: string;
  pulseTone: ProviderDiscoveryAccessPathwayPulseTone;
};

export type ProviderDiscoveryStageState = {
  stageId: SalesPathwayStageId;
  label: string;
  shortLabel: string;
};

export type ProviderDiscoveryReadiness = {
  approved: boolean;
  statusLabel: ProviderDiscoveryStatusLabel;
  advancementSignal: DiscoveryAdvancementSignal;
  progressPercent: number;
  readinessCompleteCount: number;
  readinessTotal: number;
  missionBoardProgressLabel: string;
};

export type ProviderDiscoveryNextAction = {
  label: string;
  detail: string | null;
};

export type ProviderDiscoveryState = {
  observationInterest: ProviderDiscoveryObservationInterest;
  permissionStage: NormalizedObservationPermission;
  accessPathway: ProviderDiscoveryAccessPathway;
  accessProgressPercent: number;
  discoveryStage: ProviderDiscoveryStageState;
  discoveryReadiness: ProviderDiscoveryReadiness;
  nextAction: ProviderDiscoveryNextAction;
};

export type BuildProviderDiscoveryStateInput = {
  contact: Record<string, unknown>;
  providerId?: string;
  accountId?: string | null;
  organizationName?: string | null;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  relationship_pathway_stage_id?: SalesPathwayStageId | string | null;
};

function accessPathwayPulseTone(
  permission: NormalizedObservationPermission,
): ProviderDiscoveryAccessPathwayPulseTone {
  if (
    permission.stageId === "permission_confirmed" ||
    permission.stageId === "observation_scheduled" ||
    permission.stageId === "observation_completed"
  ) {
    return "success";
  }
  if (
    permission.stageId === "interested" ||
    permission.stageId === "permission_not_yet_confirmed"
  ) {
    return "warning";
  }
  return "neutral";
}

function buildAccessSteps(input: {
  contact: Record<string, unknown>;
  permission: NormalizedObservationPermission;
  providerId?: string;
  accountId?: string | null;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  cases?: Array<Record<string, unknown>>;
}): ProviderDiscoveryAccessStep[] {
  const { contact, permission } = input;
  const model = buildProviderFieldIntelligenceModel({ contact });
  const readiness = buildProviderObservationReadiness(contact);
  const routeInput = {
    providerId: input.providerId ?? "",
    accountId: input.accountId,
  };

  const interestKnown =
    permission.stageId !== "unknown" && permission.stageId !== "not_interested";

  const approvalKnown =
    permission.stageId === "permission_confirmed" ||
    permission.stageId === "observation_scheduled" ||
    permission.stageId === "observation_completed";

  const approvalPartial =
    permission.stageId === "interested" ||
    permission.stageId === "permission_not_yet_confirmed";

  const credentialingPathKnown = readiness.credentialingPathKnown === "yes";
  const credentialingState: ProviderDiscoveryAccessStepState =
    model.credentialing.captureState === "verified" && credentialingPathKnown
      ? "known"
      : model.credentialing.captureState !== "empty" || readiness.credentialingRequired === "yes"
        ? "partial"
        : "missing";

  const schedulerState: ProviderDiscoveryAccessStepState =
    model.scheduler.captureState === "verified"
      ? "known"
      : model.scheduler.captureState === "referenced" ||
          readiness.schedulerIdentified === "partial" ||
          readiness.schedulerContactInfoCaptured === "no"
        ? "partial"
        : "missing";

  const suggestedScheduler = resolveSuggestedSchedulerCandidate(contact);

  const scheduledState: ProviderDiscoveryAccessStepState = hasScheduledObservation({
    permission,
    cases: input.cases,
  })
    ? "known"
    : "missing";

  const steps: ProviderDiscoveryAccessStep[] = [
    {
      id: "interest",
      label: "Observation interest",
      state: interestKnown ? "known" : "missing",
    },
    {
      id: "approval",
      label: "Approval confirmed",
      state: approvalKnown ? "known" : approvalPartial ? "partial" : "missing",
    },
    {
      id: "credentialing",
      label: "Credentialing path",
      state: credentialingState,
    },
    {
      id: "scheduler",
      label: "Scheduler contact",
      state: schedulerState,
      detailLine:
        schedulerState === "partial" && suggestedScheduler
          ? `${suggestedScheduler.contact_name} identified as scheduler`
          : null,
    },
    {
      id: "scheduled",
      label: "Observation scheduled",
      state: scheduledState,
    },
  ];

  if (!input.providerId) return steps;

  return steps.map((step) => {
    const action = resolvePathwayActionForAccessStep(step.id, step.state, routeInput);
    return {
      ...step,
      actionable: Boolean(action),
      action,
      actionLabel: action?.label ?? null,
    };
  });
}

function scoreAccessStep(state: ProviderDiscoveryAccessStepState): number {
  if (state === "known") return 1;
  if (state === "partial") return 0.5;
  return 0;
}

function buildAccessPathway(input: {
  contact: Record<string, unknown>;
  permission: NormalizedObservationPermission;
  providerId?: string;
  accountId?: string | null;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  cases?: Array<Record<string, unknown>>;
}): ProviderDiscoveryAccessPathway {
  const steps = buildAccessSteps(input);
  const knownCount = steps.filter((step) => step.state === "known").length;
  const missingCount = steps.filter((step) => step.state === "missing").length;
  const completionLabel = `${knownCount} of ${steps.length} access steps known`;

  return {
    steps,
    completionLabel,
    knownCount,
    missingCount,
    pulseStatusLabel: input.permission.label,
    pulseTone: accessPathwayPulseTone(input.permission),
  };
}

function resolveDiscoveryStage(input: BuildProviderDiscoveryStateInput): ProviderDiscoveryStageState {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact);
  const relationshipStage = String(
    input.relationshipStage ?? contact.provider_relationship_stage ?? "early_discovery",
  ).trim();

  const stageId = resolveSalesPathwayStage({
    contact,
    engagements: input.engagements,
    cases: input.cases,
    relationship_pathway_stage_id: input.relationship_pathway_stage_id,
  });

  return {
    stageId,
    label: SALES_PATHWAY_STAGE_LABELS[stageId],
    shortLabel: SALES_PATHWAY_STAGE_SHORT_LABELS[stageId],
  };
}

function resolveNextAction(
  input: BuildProviderDiscoveryStateInput,
  discoveryStage: ProviderDiscoveryStageState,
  advancementMet: boolean,
): ProviderDiscoveryNextAction {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact);

  if (discoveryStage.stageId === "discovery") {
    const pathwayLine = resolveDiscoveryPathwayNextMoveLine(contact);
    if (pathwayLine) {
      return { label: pathwayLine, detail: null };
    }
    if (!advancementMet) {
      return { label: "Observation approval pending", detail: null };
    }
  }

  if (input.providerId) {
    const pathway = deriveSalesPathwayState({
      providerId: input.providerId,
      contact,
      planning: input.planning,
      relationshipStage: input.relationshipStage,
      engagements: input.engagements,
      opportunities: input.opportunities,
      cases: input.cases,
    });
    return {
      label: pathway.nextAction.label,
      detail: pathway.nextAction.detail,
    };
  }

  return { label: "Continue discovery", detail: null };
}

function observationInterestLabel(stageId: ObservationPermissionStageId): string {
  if (stageId === "interested") return "Interested in observation";
  if (stageId === "permission_not_yet_confirmed") return "Permission requested";
  if (stageId === "permission_confirmed") return "Observation approval confirmed";
  if (stageId === "observation_scheduled") return "Observation scheduled";
  if (stageId === "observation_completed") return "Observation completed";
  if (stageId === "not_interested") return "Not interested";
  return "Observation interest not established";
}

export function buildProviderDiscoveryState(
  input: BuildProviderDiscoveryStateInput,
): ProviderDiscoveryState {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact);
  const gateInput = {
    contact,
    engagements: input.engagements,
    cases: input.cases,
  };

  const permissionStage = resolveNormalizedObservationPermission(gateInput);
  const discoveryStage = resolveDiscoveryStage(input);
  const advancementSignal = buildDiscoveryAdvancementSignal(contact);
  const approved = advancementSignal.met;
  const statusLabel: ProviderDiscoveryStatusLabel = approved
    ? "Permission Confirmed"
    : "Permission Not Yet Confirmed";

  const accessPathway = buildAccessPathway({
    contact,
    permission: permissionStage,
    providerId: input.providerId,
    accountId: input.accountId,
    organizationBaseline: input.organizationBaseline,
    cases: input.cases,
  });

  const accessProgressPercent = Math.round(
    (accessPathway.steps.reduce((sum, step) => sum + scoreAccessStep(step.state), 0) /
      accessPathway.steps.length) *
      100,
  );

  const discoveryReadiness: ProviderDiscoveryReadiness = {
    approved,
    statusLabel,
    advancementSignal,
    progressPercent: approved ? 100 : 0,
    readinessCompleteCount: approved ? 1 : 0,
    readinessTotal: 1,
    missionBoardProgressLabel: approved
      ? "Observation access confirmed"
      : "Observation access unknown",
  };

  const observationInterest: ProviderDiscoveryObservationInterest = {
    known:
      permissionStage.stageId !== "unknown" && permissionStage.stageId !== "not_interested",
    hasInterestSignal: providerHasObservationInterestSignal(contact),
    label: observationInterestLabel(permissionStage.stageId),
  };

  return {
    observationInterest,
    permissionStage,
    accessPathway,
    accessProgressPercent,
    discoveryStage,
    discoveryReadiness,
    nextAction: resolveNextAction(input, discoveryStage, approved),
  };
}
