/**
 * Read bridge — derive workflow state from structured commercial intelligence first.
 */

import type {
  ObservationReadinessTriState,
  ProviderObservationReadiness,
  SchedulerReadinessState,
} from "@/lib/surgical-sales/providerObservationReadiness";
import {
  parseProviderCommercialIntelligence,
  type ObservationApprovalStatus,
  type ProviderCommercialIntelligence,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

function approvalToTriState(status: ObservationApprovalStatus): ObservationReadinessTriState {
  if (status === "approved") return "yes";
  if (status === "not_approved") return "no";
  if (status === "interested" || status === "discussed") return "no";
  return "unknown";
}

export function pickTriState(
  structured: ObservationReadinessTriState,
  legacy: ObservationReadinessTriState,
): ObservationReadinessTriState {
  return structured !== "unknown" ? structured : legacy;
}

export function pickSchedulerState(
  structured: SchedulerReadinessState,
  legacy: SchedulerReadinessState,
): SchedulerReadinessState {
  return structured !== "unknown" ? structured : legacy;
}

function schedulerContactCaptured(
  scheduling: ProviderCommercialIntelligence["scheduling"],
): ObservationReadinessTriState {
  if (scheduling.scheduler_contact_linked === "yes") return "yes";
  if (scheduling.scheduler_identified === "yes") return "yes";
  if (scheduling.scheduler_identified === "partial") return "no";
  return "unknown";
}

export function hasStructuredCommercialIntelligence(
  contact: Record<string, unknown>,
): boolean {
  return parseProviderCommercialIntelligence(contact) != null;
}

/** Map structured intelligence → observation readiness core fields. */
export function observationReadinessCoreFromCommercialIntelligence(
  intel: ProviderCommercialIntelligence,
): Pick<
  ProviderObservationReadiness,
  | "providerInterest"
  | "observationApproved"
  | "credentialingRequired"
  | "credentialingPathKnown"
  | "schedulerIdentified"
  | "schedulerContactInfoCaptured"
> {
  const { observation, scheduling, credentialing } = intel;

  return {
    providerInterest: observation.interest,
    observationApproved: approvalToTriState(observation.approval_status),
    credentialingRequired: observation.credentialing_required,
    credentialingPathKnown: credentialing.credentialing_platform_known,
    schedulerIdentified: scheduling.scheduler_identified as SchedulerReadinessState,
    schedulerContactInfoCaptured: schedulerContactCaptured(scheduling),
  };
}
