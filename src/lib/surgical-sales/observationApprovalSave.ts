/**
 * Observation status capture — discovery gate without scheduler/credentialing requirements.
 */

import type { ObservationStatusChoice } from "@/lib/surgical-sales/observationStatus";
import { observationStatusGrantsPathwayAdvance } from "@/lib/surgical-sales/observationStatus";
import {
  emptyProviderCommercialIntelligence,
  readProviderCommercialIntelligence,
  type ObservationApprovalStatus,
  type ProviderCommercialIntelligence,
  PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

export const OBSERVATION_APPROVAL_DB_KEY = "provider_observation_feasibility";
export const OBSERVATION_APPROVAL_PROFILE_SOURCE_LABEL = "Observation approval";

/** @deprecated Use ObservationStatusChoice */
export type ObservationApprovalStatusChoice = ObservationStatusChoice | "not_approved";

export type ObservationApprovalNextStepChoice = "schedule_observation" | "finish";

export type ObservationApprovalSaveInput = {
  status: ObservationStatusChoice;
  approvedBy?: string | null;
  approvalNote?: string | null;
};

export type ObservationApprovalSavePayload = {
  planning: Record<string, string | null>;
  intelligence_validate_fields: string[];
  intelligence_field_evidence: Record<string, string>;
};

export function normalizeObservationApprovalStatus(
  raw: string,
): ObservationStatusChoice | null {
  switch (raw.trim().toLowerCase()) {
    case "approved":
    case "permission_confirmed":
      return "permission_confirmed";
    case "denied":
    case "not_approved":
    case "not_interested":
      return "denied";
    case "discussed":
    case "permission_not_yet_confirmed":
      return "permission_not_yet_confirmed";
    case "interested":
      return "interested";
    case "unknown":
      return "unknown";
    default:
      return null;
  }
}

function buildEvidenceText(input: ObservationApprovalSaveInput): string {
  const parts: string[] = [];
  if (String(input.approvedBy ?? "").trim()) {
    parts.push(`Approved by: ${String(input.approvedBy).trim()}`);
  }
  if (String(input.approvalNote ?? "").trim()) {
    parts.push(String(input.approvalNote).trim());
  }
  return parts.join(" · ");
}

/** Maps status choices to provider planning + validation payload. */
export function buildObservationApprovalSavePayload(
  input: ObservationApprovalSaveInput,
): ObservationApprovalSavePayload {
  const evidence = buildEvidenceText(input);

  switch (input.status) {
    case "permission_confirmed":
      return {
        planning: { [OBSERVATION_APPROVAL_DB_KEY]: "approved" },
        intelligence_validate_fields: [OBSERVATION_APPROVAL_DB_KEY],
        intelligence_field_evidence: {
          [OBSERVATION_APPROVAL_DB_KEY]: evidence || "Observation permission confirmed",
        },
      };
    case "interested":
      return {
        planning: { [OBSERVATION_APPROVAL_DB_KEY]: "interested" },
        intelligence_validate_fields: [],
        intelligence_field_evidence: {
          [OBSERVATION_APPROVAL_DB_KEY]: evidence || "Provider interested in observation",
        },
      };
    case "permission_not_yet_confirmed":
      return {
        planning: { [OBSERVATION_APPROVAL_DB_KEY]: "discussed" },
        intelligence_validate_fields: [],
        intelligence_field_evidence: {
          [OBSERVATION_APPROVAL_DB_KEY]: evidence || "Observation permission not yet confirmed",
        },
      };
    case "denied":
      return {
        planning: {
          [OBSERVATION_APPROVAL_DB_KEY]: "denied",
          provider_evaluation_openness: "closed",
        },
        intelligence_validate_fields: [OBSERVATION_APPROVAL_DB_KEY],
        intelligence_field_evidence: {
          [OBSERVATION_APPROVAL_DB_KEY]: evidence || "Observation denied",
        },
      };
    case "observation_scheduled":
    case "observation_completed":
      return {
        planning: {},
        intelligence_validate_fields: [],
        intelligence_field_evidence: {},
      };
    case "unknown":
      return {
        planning: {
          [OBSERVATION_APPROVAL_DB_KEY]: null,
          provider_evaluation_openness: null,
        },
        intelligence_validate_fields: [],
        intelligence_field_evidence: evidence
          ? { [OBSERVATION_APPROVAL_DB_KEY]: evidence }
          : {},
      };
    default:
      return {
        planning: {},
        intelligence_validate_fields: [],
        intelligence_field_evidence: {},
      };
  }
}

export function observationApprovalGrantsPathwayAdvance(
  status: ObservationStatusChoice | "not_approved",
): boolean {
  if (status === "not_approved") return false;
  return observationStatusGrantsPathwayAdvance(status);
}

function observationStatusToCommercialApproval(
  status: ObservationStatusChoice,
): ObservationApprovalStatus {
  switch (status) {
    case "permission_confirmed":
      return "approved";
    case "interested":
      return "interested";
    case "permission_not_yet_confirmed":
      return "discussed";
    case "denied":
    case "not_interested":
      return "not_approved";
    case "unknown":
    default:
      return "unknown";
  }
}

/** Keep structured commercial intelligence aligned with manual observation status saves. */
export function buildObservationApprovalCommercialIntelligencePatch(
  existingContact: Record<string, unknown>,
  status: ObservationStatusChoice,
): Record<string, ProviderCommercialIntelligence> {
  const base = readProviderCommercialIntelligence(existingContact) ?? emptyProviderCommercialIntelligence();
  const approval_status = observationStatusToCommercialApproval(status);
  const interest =
    approval_status === "approved" ||
    approval_status === "interested" ||
    approval_status === "discussed"
      ? "yes"
      : approval_status === "not_approved"
        ? "no"
        : "unknown";

  let access_status = base.observation.access_status;
  if (approval_status === "approved") {
    access_status = access_status === "unknown" ? "partial" : access_status;
  } else if (approval_status === "not_approved") {
    access_status = "blocked";
  } else if (approval_status === "unknown") {
    access_status = "unknown";
  }

  return {
    [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: {
      ...base,
      updated_at: new Date().toISOString(),
      observation: {
        ...base.observation,
        interest,
        approval_status,
        access_status,
      },
    },
  };
}
