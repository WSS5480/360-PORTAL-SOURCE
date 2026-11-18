/**
 * Discovery-stage next field move + primary action — driven by access workflow state.
 * Clinical validation does not drive next move until observation / clinical intel exists.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { mapContactFieldReadinessStatus } from "@/lib/surgical-sales/buildProviderDiscoveryIntelligenceGroups";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/providerObservationApproval";
import {
  DISCOVERY_OVERVIEW_FOCUS_CREDENTIALING_BEFORE_OBSERVATION,
  DISCOVERY_OVERVIEW_FOCUS_OBSERVATION_PATHWAY_OPEN,
  isCredentialingWorkflowComplete,
  isObservationAccessConditionallyAllowed,
} from "@/lib/surgical-sales/observationAccessWorkflowState";
import { discoveryPriorityUnknownSummary } from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import { DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/discoveryFieldStatus";
import {
  resolveDiscoveryStructuredSignalStatus,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import { intelligenceSectionIdForDbKey } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { SCHEDULING_OWNER_INTELLIGENCE_DB_KEY } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import { deriveDiscoveryWorkflowRecommendation } from "@/lib/surgical-sales/deriveProviderWorkflowRecommendation";
import { hasSchedulingIntelligenceOnFile } from "@/lib/surgical-sales/schedulingIntelligenceReadModel";
import {
  adminGapBlocksActiveScheduledCase,
  filterPrimaryAlertLabels,
  isAdminBackgroundSignalId,
  type ActiveScheduledFieldContext,
} from "@/lib/surgical-sales/backgroundIntelligenceSections";

const F = DISCOVERY_FIELD_STATUS;

export const DISCOVERY_OVERVIEW_FOCUS = {
  approvalPending: "Provider observation approval pending",
  interestEstablished: "Observation interest established",
  approvedNeedsScheduler: "Observation approved, scheduling owner needed",
  accessPathNeedsConfirmation: "Access path needs confirmation",
  accessCompletionOpen: "Credentialing and observation logistics still open",
  readyToSchedule: "Ready to schedule observation",
  approvalDeclined: "Provider observation approval declined",
} as const;

export const DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE = {
  obtainApproval: "Validate provider willingness and obtain observation approval.",
  convertInterest: "Convert interest into explicit observation approval.",
  schedulingOwner: "Identify scheduling owner and coordinate observation timing.",
  accessPathway: "Confirm facility/vendor access pathway.",
  completeAccess: "Complete credentialing and observation logistics.",
  createObservation: "Create observation.",
  /** @deprecated Use createObservation */
  scheduleObservation: "Create observation.",
} as const;

const CREDENTIALING_DB_KEYS = [
  "provider_observation_credentialing_needed",
  "provider_credentialing_status",
] as const;

const CLINICAL_LEARNING_DB_KEYS = [
  "observation_history",
  "provider_preference_card_signals",
  "provider_observation_best_days_case_types",
] as const;

export type DiscoveryWorkflowMovePhase =
  | "awaiting_approval"
  | "needs_scheduling_owner"
  | "needs_access_pathway"
  | "needs_access_completion"
  | "ready_to_schedule";

export function hasSchedulingOwnerIdentified(contact: Record<string, unknown>): boolean {
  return hasSchedulingIntelligenceOnFile(contact);
}

export function hasAccessPathwayIdentified(contact: Record<string, unknown>): boolean {
  return (
    isIntelligenceFieldValidatedOnFile("provider_observation_access_path", contact) ||
    fieldHasIntelligenceSignal(
      "provider_observation_access_path",
      contact.provider_observation_access_path as string | null | undefined,
    )
  );
}

function credentialingComplete(contact: Record<string, unknown>): boolean {
  const tones = CREDENTIALING_DB_KEYS.map((key) => mapContactFieldReadinessStatus(key, contact));
  return tones.every((t) => t === "complete");
}

function logisticsComplete(contact: Record<string, unknown>): boolean {
  return mapContactFieldReadinessStatus("provider_observation_best_days_case_types", contact) === "complete";
}

export function isDiscoveryAccessWorkflowComplete(contact: Record<string, unknown>): boolean {
  if (!hasProviderObservationApprovalValidated(contact)) return false;
  if (!hasSchedulingOwnerIdentified(contact)) return false;
  if (!hasAccessPathwayIdentified(contact)) return false;
  return credentialingComplete(contact) && logisticsComplete(contact);
}

export function hasClinicalLearningForNextMove(contact: Record<string, unknown>): boolean {
  return CLINICAL_LEARNING_DB_KEYS.some((key) => {
    if (isIntelligenceFieldValidatedOnFile(key, contact)) return true;
    return fieldHasIntelligenceSignal(key, contact[key] as string | null | undefined);
  });
}

export function resolveDiscoveryWorkflowMovePhase(
  contact: Record<string, unknown>,
): DiscoveryWorkflowMovePhase {
  if (
    isObservationAccessConditionallyAllowed(contact) &&
    !isCredentialingWorkflowComplete(contact)
  ) {
    return "needs_access_completion";
  }

  if (!hasProviderObservationApprovalValidated(contact)) {
    if (isObservationAccessConditionallyAllowed(contact)) {
      return "needs_access_completion";
    }
    return "awaiting_approval";
  }
  if (!hasSchedulingOwnerIdentified(contact)) {
    return "needs_scheduling_owner";
  }
  if (!hasAccessPathwayIdentified(contact)) {
    return "needs_access_pathway";
  }
  if (!isDiscoveryAccessWorkflowComplete(contact)) {
    return "needs_access_completion";
  }
  return "ready_to_schedule";
}

function resolveDiscoveryOverviewAccessFocus(contact: Record<string, unknown>): {
  summary: string;
  signalId: DiscoveryStructuredSignalId;
} {
  if (
    isObservationAccessConditionallyAllowed(contact) &&
    !isCredentialingWorkflowComplete(contact)
  ) {
    return {
      summary: DISCOVERY_OVERVIEW_FOCUS_CREDENTIALING_BEFORE_OBSERVATION,
      signalId: "observation_approval",
    };
  }

  if (
    isCredentialingWorkflowComplete(contact) &&
    String(contact.provider_observation_feasibility ?? "").trim().toLowerCase() === "easy" &&
    !hasProviderObservationApprovalValidated(contact)
  ) {
    return {
      summary: DISCOVERY_OVERVIEW_FOCUS_OBSERVATION_PATHWAY_OPEN,
      signalId: "observation_approval",
    };
  }

  if (isDiscoveryAccessWorkflowComplete(contact)) {
    return {
      summary: DISCOVERY_OVERVIEW_FOCUS.readyToSchedule,
      signalId: "observation_logistics",
    };
  }

  switch (resolveDiscoveryWorkflowMovePhase(contact)) {
    case "awaiting_approval":
      return {
        summary: "Will provider allow observation?",
        signalId: "observation_approval",
      };
    case "needs_scheduling_owner":
      return {
        summary: "Who schedules observations?",
        signalId: "scheduling_owner",
      };
    case "needs_access_pathway":
      return {
        summary: "What access steps are required?",
        signalId: "facility_vendor_pathway",
      };
    case "needs_access_completion": {
      const logisticsStatus = resolveDiscoveryStructuredSignalStatus("observation_logistics", contact);
      const logisticsSummary = discoveryPriorityUnknownSummary("observation_logistics", logisticsStatus);
      if (logisticsSummary) {
        return {
          summary: logisticsSummary,
          signalId: "observation_logistics",
        };
      }
      return {
        summary: DISCOVERY_OVERVIEW_FOCUS.accessCompletionOpen,
        signalId: "observation_logistics",
      };
    }
    case "ready_to_schedule":
      return {
        summary: DISCOVERY_OVERVIEW_FOCUS.readyToSchedule,
        signalId: "observation_logistics",
      };
    default:
      return {
        summary: DISCOVERY_OVERVIEW_FOCUS.approvalPending,
        signalId: "observation_approval",
      };
  }
}

function resolveDiscoveryNextMoveFromWorkflowPhase(contact: Record<string, unknown>): string {
  if (isDiscoveryAccessWorkflowComplete(contact)) {
    return DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.createObservation;
  }

  switch (resolveDiscoveryWorkflowMovePhase(contact)) {
    case "awaiting_approval":
      return DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.obtainApproval;
    case "needs_scheduling_owner":
      return DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.schedulingOwner;
    case "needs_access_pathway":
      return DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.accessPathway;
    case "needs_access_completion":
      return DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.completeAccess;
    case "ready_to_schedule":
      return DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.createObservation;
    default:
      return DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.obtainApproval;
  }
}

export function resolveDiscoveryOverviewWorkflowSummary(
  contact: Record<string, unknown>,
  fieldContext: ActiveScheduledFieldContext = {},
): {
  currentFocus: string | null;
  nextFieldMove: string;
} {
  const accessFocus = resolveDiscoveryOverviewAccessFocus(contact);
  let currentFocus: string | null = accessFocus.summary;

  if (
    isAdminBackgroundSignalId(accessFocus.signalId) &&
    !adminGapBlocksActiveScheduledCase(fieldContext)
  ) {
    currentFocus = null;
  } else {
    currentFocus = filterPrimaryAlertLabels([currentFocus], fieldContext)[0] ?? null;
  }

  return {
    currentFocus,
    nextFieldMove: resolveDiscoveryNextMoveFromWorkflowPhase(contact),
  };
}

export function resolveDiscoveryPathwayNextMoveLine(contact: Record<string, unknown>): string | null {
  return resolveDiscoveryOverviewWorkflowSummary(contact).nextFieldMove;
}

export function resolveDiscoveryWorkflowNextFieldAction(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  providerId: string;
  briefingHref: string;
  newEngagementHref: string;
  pathwayStageId: string;
  fallbackLabel: string;
  fallbackDetail: string;
  fallbackHref: string;
}): { label: string; detail: string; href: string } {
  if (input.pathwayStageId !== "discovery") {
    return {
      label: input.fallbackLabel,
      detail: input.fallbackDetail,
      href: input.fallbackHref,
    };
  }

  const detail = resolveDiscoveryPathwayNextMoveLine(input.contact) ?? input.fallbackDetail;
  const recommendation = deriveDiscoveryWorkflowRecommendation({
    contact: input.contact,
    engagements: input.engagements,
    providerId: input.providerId,
    newEngagementHref: input.newEngagementHref,
  });

  return {
    label: recommendation.label,
    detail,
    href: recommendation.href,
  };
}

export function intelligenceGapAllowedForDiscoveryNextMove(input: {
  dbKey: string;
  sectionId: string;
  contact: Record<string, unknown>;
}): boolean {
  if (
    isObservationAccessConditionallyAllowed(input.contact) &&
    !isCredentialingWorkflowComplete(input.contact)
  ) {
    return (
      input.dbKey === "provider_observation_credentialing_needed" ||
      input.dbKey === "provider_credentialing_status" ||
      input.dbKey === "provider_observation_feasibility" ||
      input.sectionId === "observation_readiness"
    );
  }

  if (!hasProviderObservationApprovalValidated(input.contact)) {
    return (
      input.dbKey === "provider_observation_feasibility" ||
      input.sectionId === "relationship_intelligence" ||
      input.sectionId === "observation_readiness"
    );
  }
  if (!hasClinicalLearningForNextMove(input.contact)) {
    const clinicalOnly = new Set([
      "clinical_workflow",
      "workflow_fit",
      "procedure_volume",
      "product_alignment",
      "clinical_fit_observed",
    ]);
    if (clinicalOnly.has(input.sectionId) || input.dbKey === "provider_procedure_focus") {
      return false;
    }
    return (
      input.sectionId === "observation_readiness" ||
      input.sectionId === "or_environment" ||
      input.dbKey === SCHEDULING_OWNER_INTELLIGENCE_DB_KEY
    );
  }
  return true;
}

export function workflowCaptureSectionId(dbKey: string) {
  return intelligenceSectionIdForDbKey(dbKey) ?? "observation_readiness";
}
