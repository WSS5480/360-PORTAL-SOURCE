/**
 * Observation access — conditional workflow when observation depends on credentialing.
 */

import { mapContactFieldReadinessStatus } from "@/lib/surgical-sales/buildProviderDiscoveryIntelligenceGroups";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";

export type ObservationAccessStatus =
  | "unknown"
  | "allowed"
  | "restricted"
  | "conditionally_allowed"
  | "not_allowed";

export type ObservationAccessBlocker =
  | "credentialing_required"
  | "scheduling_required"
  | "provider_approval_required"
  | "facility_approval_required"
  | "unknown"
  | null;

export type CredentialingWorkflowStatus =
  | "unknown"
  | "required"
  | "in_progress"
  | "completed"
  | "not_required";

export type ObservationAccessWorkflowState = {
  observationAccessStatus: ObservationAccessStatus;
  accessBlocker: ObservationAccessBlocker;
  credentialingStatus: CredentialingWorkflowStatus;
};

export const OBSERVATION_FEASIBILITY_DB_KEY = "provider_observation_feasibility";
export const OBSERVATION_CREDENTIALING_NEEDED_DB_KEY = "provider_observation_credentialing_needed";
export const PROVIDER_CREDENTIALING_STATUS_DB_KEY = "provider_credentialing_status";

export const OBSERVATION_ACCESS_CONDITIONAL_EVIDENCE =
  "Observation appears possible once credentialing is complete.";

export const OBSERVATION_ACCESS_CREDENTIALING_BLOCKER_HEADLINE =
  "Complete vendor credentialing before observation can be scheduled.";

export const OBSERVATION_ACCESS_CREDENTIALING_NEXT_ACTION = "Complete credentialing";

export const DISCOVERY_OVERVIEW_FOCUS_CREDENTIALING_BEFORE_OBSERVATION =
  "Credentialing required before observation scheduling.";

export const DISCOVERY_OVERVIEW_FOCUS_OBSERVATION_PATHWAY_OPEN =
  "Observation pathway open — coordinate scheduling.";

export const PROVIDER_PROGRESSION_CTA_START_CREDENTIALING = "Start credentialing";
export const PROVIDER_PROGRESSION_CTA_LOG_CREDENTIALING_STATUS = "Log credentialing status";

const FEASIBILITY_BLOCKED = new Set(["no", "blocked", "denied"]);
const CREDENTIALING_COMPLETE_TOKENS = new Set([
  "cleared",
  "complete",
  "completed",
  "not_required",
]);
const CREDENTIALING_IN_FLIGHT_TOKENS = new Set(["in_progress", "submitted"]);

function fieldToken(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "")
    .trim()
    .toLowerCase();
}

export function observationFeasibilityToken(contact: Record<string, unknown>): string {
  const raw = fieldToken(contact, OBSERVATION_FEASIBILITY_DB_KEY);
  if (!raw) return "";
  if (
    /^(interested|approved|denied|mentioned|yes|easy|restricted|credentialing_required|not_allowed|blocked)$/.test(
      raw,
    )
  ) {
    return raw;
  }
  if (/observation\s+approval:\s*yes/i.test(raw)) return "approved";
  if (/observation\s+interest:\s*yes/i.test(raw) && /observation\s+approval:\s*no/i.test(raw)) {
    return "interested";
  }
  if (/\b(?:not opposed|open to|not a problem)\b/i.test(raw)) return "interested";
  if (/\b(?:denied|not allowed|blocked)\b/i.test(raw)) return "denied";
  return raw;
}

export function isObservationAccessConditionallyAllowed(contact: Record<string, unknown>): boolean {
  return resolveObservationAccessWorkflowState(contact).observationAccessStatus === "conditionally_allowed";
}

export function hasObservationAccessPathwayEstablished(contact: Record<string, unknown>): boolean {
  const state = resolveObservationAccessWorkflowState(contact);
  return state.observationAccessStatus === "allowed" || state.observationAccessStatus === "conditionally_allowed";
}

function resolveCredentialingWorkflowStatus(contact: Record<string, unknown>): CredentialingWorkflowStatus {
  const credNeeded = fieldToken(contact, OBSERVATION_CREDENTIALING_NEEDED_DB_KEY);
  const vendorStatus = fieldToken(contact, PROVIDER_CREDENTIALING_STATUS_DB_KEY);

  if (
    mapContactFieldReadinessStatus(OBSERVATION_CREDENTIALING_NEEDED_DB_KEY, contact) === "complete" &&
    mapContactFieldReadinessStatus(PROVIDER_CREDENTIALING_STATUS_DB_KEY, contact) === "complete"
  ) {
    return "completed";
  }

  if (CREDENTIALING_COMPLETE_TOKENS.has(credNeeded) && CREDENTIALING_COMPLETE_TOKENS.has(vendorStatus)) {
    return "completed";
  }

  if (credNeeded === "not_required" || vendorStatus === "not_required") {
    return "not_required";
  }

  if (
    CREDENTIALING_IN_FLIGHT_TOKENS.has(credNeeded) ||
    CREDENTIALING_IN_FLIGHT_TOKENS.has(vendorStatus)
  ) {
    return "in_progress";
  }

  if (
    credNeeded === "required" ||
    vendorStatus === "required" ||
    observationFeasibilityToken(contact) === "credentialing_required"
  ) {
    return "required";
  }

  if (
    fieldHasIntelligenceSignal(
      OBSERVATION_CREDENTIALING_NEEDED_DB_KEY,
      contact[OBSERVATION_CREDENTIALING_NEEDED_DB_KEY] as string | null | undefined,
    ) ||
    fieldHasIntelligenceSignal(
      PROVIDER_CREDENTIALING_STATUS_DB_KEY,
      contact[PROVIDER_CREDENTIALING_STATUS_DB_KEY] as string | null | undefined,
    )
  ) {
    return "in_progress";
  }

  return "unknown";
}

export function isCredentialingWorkflowComplete(contact: Record<string, unknown>): boolean {
  const status = resolveCredentialingWorkflowStatus(contact);
  return status === "completed" || status === "not_required";
}

export function resolveObservationAccessWorkflowState(
  contact: Record<string, unknown>,
): ObservationAccessWorkflowState {
  const feasibility = observationFeasibilityToken(contact);
  const credentialingStatus = resolveCredentialingWorkflowStatus(contact);

  if (!fieldHasIntelligenceSignal(OBSERVATION_FEASIBILITY_DB_KEY, contact[OBSERVATION_FEASIBILITY_DB_KEY] as string)) {
    return {
      observationAccessStatus: "unknown",
      accessBlocker: null,
      credentialingStatus,
    };
  }

  if (FEASIBILITY_BLOCKED.has(feasibility)) {
    return {
      observationAccessStatus: "not_allowed",
      accessBlocker: "provider_approval_required",
      credentialingStatus,
    };
  }

  if (feasibility === "credentialing_required") {
    if (isCredentialingWorkflowComplete(contact)) {
      return {
        observationAccessStatus: "allowed",
        accessBlocker: null,
        credentialingStatus: "completed",
      };
    }
    return {
      observationAccessStatus: "conditionally_allowed",
      accessBlocker: "credentialing_required",
      credentialingStatus: credentialingStatus === "unknown" ? "required" : credentialingStatus,
    };
  }

  if (feasibility === "restricted") {
    return {
      observationAccessStatus: "restricted",
      accessBlocker: "facility_approval_required",
      credentialingStatus,
    };
  }

  if (feasibility === "easy" || feasibility === "approved" || feasibility === "yes") {
    return {
      observationAccessStatus: "allowed",
      accessBlocker: null,
      credentialingStatus,
    };
  }

  if (feasibility === "interested" || feasibility === "mentioned") {
    if (!isCredentialingWorkflowComplete(contact)) {
      return {
        observationAccessStatus: "conditionally_allowed",
        accessBlocker: "credentialing_required",
        credentialingStatus: credentialingStatus === "unknown" ? "required" : credentialingStatus,
      };
    }
    return {
      observationAccessStatus: "conditionally_allowed",
      accessBlocker: "provider_approval_required",
      credentialingStatus,
    };
  }

  return {
    observationAccessStatus: "unknown",
    accessBlocker: null,
    credentialingStatus,
  };
}

/** Planning fields set when rep selects “Not until credentialed” / credentialing_required. */
export function buildObservationAccessCredentialingPrerequisitePatch(
  feasibilityValue: string,
): Record<string, string> {
  const patch: Record<string, string> = {
    [OBSERVATION_FEASIBILITY_DB_KEY]: feasibilityValue.trim(),
  };
  if (feasibilityValue.trim().toLowerCase() !== "credentialing_required") {
    return patch;
  }
  patch[OBSERVATION_CREDENTIALING_NEEDED_DB_KEY] = "required";
  return patch;
}

/** Evidence text stored on feasibility when access is conditional. */
export function observationAccessConditionalEvidenceMetadata(): {
  evidence_text: string;
} {
  return { evidence_text: OBSERVATION_ACCESS_CONDITIONAL_EVIDENCE };
}

/** After credentialing is complete, unlock observation access from conditional state. */
export function buildObservationAccessUnlockPlanningPatch(
  contact: Record<string, unknown>,
): Record<string, string> | null {
  const feasibility = observationFeasibilityToken(contact);
  if (feasibility !== "credentialing_required") return null;
  if (!isCredentialingWorkflowComplete(contact)) return null;

  return {
    [OBSERVATION_FEASIBILITY_DB_KEY]: "easy",
    [OBSERVATION_CREDENTIALING_NEEDED_DB_KEY]: "cleared",
    [PROVIDER_CREDENTIALING_STATUS_DB_KEY]:
      fieldToken(contact, PROVIDER_CREDENTIALING_STATUS_DB_KEY) || "cleared",
  };
}

export function reconcileObservationAccessPlanningPatch(input: {
  existingContact: Record<string, unknown>;
  planningPatch: Record<string, string | null | undefined>;
}): Record<string, string | null> {
  const merged = { ...input.existingContact };
  for (const [key, value] of Object.entries(input.planningPatch)) {
    if (value === undefined) continue;
    merged[key] = value;
  }

  const unlock = buildObservationAccessUnlockPlanningPatch(merged);
  if (!unlock) return {};

  const out: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(unlock)) {
    if (input.planningPatch[key] === value) continue;
    out[key] = value;
  }
  return out;
}

export function observationAccessConditionalAnswerLabel(contact: Record<string, unknown>): string {
  const chip = formatIntelligenceCaptureSummaryChip(
    OBSERVATION_FEASIBILITY_DB_KEY,
    String(contact[OBSERVATION_FEASIBILITY_DB_KEY] ?? ""),
  );
  return chip || "Not until credentialed";
}

export function observationAccessConditionalDisplay(input: {
  contact: Record<string, unknown>;
}): {
  statusLabel: string;
  answer: string;
  conditionBlocker: string;
  nextStep: string;
  currentFocus: string;
  missionBlocker: string;
  overviewSummary: string;
} | null {
  if (!isObservationAccessConditionallyAllowed(input.contact)) return null;
  return {
    statusLabel: "Conditional",
    answer: observationAccessConditionalAnswerLabel(input.contact),
    conditionBlocker: DISCOVERY_OVERVIEW_FOCUS_CREDENTIALING_BEFORE_OBSERVATION,
    nextStep: OBSERVATION_ACCESS_CREDENTIALING_NEXT_ACTION,
    currentFocus: DISCOVERY_OVERVIEW_FOCUS_CREDENTIALING_BEFORE_OBSERVATION,
    missionBlocker: "Credentialing required",
    overviewSummary: "Observation access conditionally allowed pending credentialing.",
  };
}
