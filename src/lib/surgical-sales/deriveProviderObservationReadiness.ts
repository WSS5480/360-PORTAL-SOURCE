/**
 * Derived observation readiness — computed from structured commercial intelligence only.
 * Planning and workflow consume readiness level, not raw contact fields.
 */

import { MISSION_OBSERVATION_READINESS_LABELS } from "@/lib/surgical-sales/providerMissionExecutionLanguage";
import { commercialIntelligenceIsPopulated } from "@/lib/surgical-sales/buildProviderFieldIntelligenceFromCommercial";
import {
  isCredentialingWorkflowComplete,
  observationFeasibilityToken,
} from "@/lib/surgical-sales/observationAccessWorkflowState";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/providerObservationApproval";
import {
  parseProviderCommercialIntelligence,
  type IntelligenceTriState,
  type ObservationApprovalStatus,
  type ProviderCommercialIntelligence,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

/** Derived readiness for planning — not stored sentence fragments or CRM columns. */
export type DerivedObservationReadinessLevel = "ready" | "conditional" | "not_ready";

export type ObservationReadinessBlockerId =
  | "provider_interest_unknown"
  | "observation_not_approved"
  | "credentialing_platform_unknown"
  | "credentialing_pathway_unknown"
  | "scheduler_contact_missing"
  | "scheduling_workflow_unknown";

export type DerivedObservationReadiness = {
  readiness: DerivedObservationReadinessLevel;
  blockers: ObservationReadinessBlockerId[];
  displayLabel: "Ready to plan" | "Plan with open questions" | "Build relationship first";
  credentialingState: "unknown" | "not_required" | "required_platform_unknown" | "path_known" | "complete";
};

export const OBSERVATION_READINESS_BLOCKER_LABELS: Record<ObservationReadinessBlockerId, string> = {
  provider_interest_unknown: "Provider Interest",
  observation_not_approved: "Observation Approval",
  credentialing_platform_unknown: "Credentialing Platform",
  credentialing_pathway_unknown: "Credentialing Pathway",
  scheduler_contact_missing: "Scheduler Contact",
  scheduling_workflow_unknown: "Scheduling Workflow",
};

function credentialingNotesIndicateComplete(notes: string[]): boolean {
  return notes.some((note) =>
    /\b(?:credentialing complete|credentialing is complete|cleared|completed|not_required)\b/i.test(note),
  );
}

export function deriveCredentialingState(
  intel: ProviderCommercialIntelligence,
): DerivedObservationReadiness["credentialingState"] {
  const required =
    intel.credentialing.credentialing_required === "yes" ||
    intel.observation.credentialing_required === "yes";
  const notRequired =
    intel.credentialing.credentialing_required === "no" ||
    intel.observation.credentialing_required === "no";

  if (notRequired) return "not_required";
  if (credentialingNotesIndicateComplete(intel.credentialing.credentialing_notes)) {
    return "complete";
  }
  if (!required) return "unknown";
  if (intel.credentialing.credentialing_platform_known === "yes") return "path_known";
  if (intel.credentialing.credentialing_platform_known === "no") return "required_platform_unknown";
  return "required_platform_unknown";
}

function isCredentialingComplete(intel: ProviderCommercialIntelligence): boolean {
  const state = deriveCredentialingState(intel);
  return state === "not_required" || state === "complete";
}

function isCredentialingBlocking(intel: ProviderCommercialIntelligence): boolean {
  const state = deriveCredentialingState(intel);
  return state === "required_platform_unknown";
}

function schedulingAddsBlockers(intel: ProviderCommercialIntelligence): boolean {
  const { scheduling } = intel;
  if (scheduling.scheduler_contact_linked === "no") return true;
  if (scheduling.scheduler_identified === "partial") return true;
  return false;
}

function buildBlockers(intel: ProviderCommercialIntelligence): ObservationReadinessBlockerId[] {
  const blockers: ObservationReadinessBlockerId[] = [];
  const { observation, scheduling } = intel;

  // Absence of evidence is not a blocker — only captured signals drive open items.
  if (observation.interest === "yes" && observation.approval_status === "not_approved") {
    blockers.push("observation_not_approved");
  } else if (
    observation.interest === "yes" &&
    (observation.approval_status === "unknown" ||
      observation.approval_status === "interested" ||
      observation.approval_status === "discussed")
  ) {
    blockers.push("observation_not_approved");
  }

  if (isCredentialingBlocking(intel)) {
    blockers.push("credentialing_pathway_unknown");
  }

  if (scheduling.scheduler_contact_linked === "no") {
    blockers.push("scheduler_contact_missing");
  } else if (scheduling.scheduler_identified === "partial") {
    blockers.push("scheduler_contact_missing");
  } else if (
    scheduling.scheduler_identified === "yes" &&
    scheduling.scheduler_contact_linked !== "yes"
  ) {
    blockers.push("scheduler_contact_missing");
  }

  if (scheduling.scheduling_workflow_known === "no") {
    blockers.push("scheduling_workflow_unknown");
  }

  return [...new Set(blockers)];
}

function readinessDisplayLabel(
  level: DerivedObservationReadinessLevel,
): DerivedObservationReadiness["displayLabel"] {
  return MISSION_OBSERVATION_READINESS_LABELS[level];
}

/**
 * Calculate derived readiness from structured intelligence objects.
 *
 * Rules (examples):
 * - Interest unknown → Not Ready
 * - Approved + credentialing required + platform unknown → Conditional
 * - Approved + credentialing complete → Ready
 */
export function calculateObservationReadinessFromCommercialIntelligence(
  intel: ProviderCommercialIntelligence,
): DerivedObservationReadiness {
  const blockers = buildBlockers(intel);
  const { observation } = intel;

  if (observation.interest === "unknown") {
    return {
      readiness: "not_ready",
      blockers,
      displayLabel: readinessDisplayLabel("not_ready"),
      credentialingState: deriveCredentialingState(intel),
    };
  }

  if (observation.interest === "no" || observation.approval_status === "not_approved") {
    return {
      readiness: "not_ready",
      blockers,
      displayLabel: readinessDisplayLabel("not_ready"),
      credentialingState: deriveCredentialingState(intel),
    };
  }

  if (observation.approval_status === "approved") {
    return {
      readiness: "ready",
      blockers,
      displayLabel: readinessDisplayLabel("ready"),
      credentialingState: deriveCredentialingState(intel),
    };
  }

  if (
    observation.approval_status === "interested" ||
    observation.approval_status === "discussed" ||
    observation.interest === "yes"
  ) {
    return {
      readiness: "conditional",
      blockers,
      displayLabel: readinessDisplayLabel("conditional"),
      credentialingState: deriveCredentialingState(intel),
    };
  }

  return {
    readiness: "not_ready",
    blockers,
    displayLabel: readinessDisplayLabel("not_ready"),
    credentialingState: deriveCredentialingState(intel),
  };
}

export function resolveDerivedObservationReadinessFromContact(
  contact: Record<string, unknown>,
): DerivedObservationReadiness | null {
  const intel = parseProviderCommercialIntelligence(contact);
  if (!intel || !commercialIntelligenceIsPopulated(intel)) return null;
  return calculateObservationReadinessFromCommercialIntelligence(intel);
}

function resolveLegacyObservationReadinessLevel(
  contact: Record<string, unknown>,
): DerivedObservationReadinessLevel {
  const token = observationFeasibilityToken(contact);
  if (!token || token === "unknown") return "not_ready";

  const approved = hasProviderObservationApprovalValidated(contact);
  if (!approved) {
    if (token === "interested" || token === "yes") return "conditional";
    return "not_ready";
  }

  return "ready";
}

/** Planning entry point — prefers derived readiness from structured intelligence. */
export function resolveObservationReadinessLevelForPlanning(
  contact: Record<string, unknown>,
): DerivedObservationReadinessLevel {
  const derived = resolveDerivedObservationReadinessFromContact(contact);
  if (derived) return derived.readiness;
  return resolveLegacyObservationReadinessLevel(contact);
}

export function observationReadinessBlockerLabels(
  blockers: ObservationReadinessBlockerId[],
): string[] {
  return blockers.map((id) => OBSERVATION_READINESS_BLOCKER_LABELS[id]);
}

export function mapDerivedReadinessToStoredState(
  level: DerivedObservationReadinessLevel,
): "ready" | "conditional" | "not_ready" {
  return level;
}

export function approvalIsGranted(status: ObservationApprovalStatus): boolean {
  return status === "approved";
}

export function triStateIsYes(value: IntelligenceTriState): boolean {
  return value === "yes";
}
