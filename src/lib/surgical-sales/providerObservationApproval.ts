/**
 * Observation approval on file — leaf helper (avoids discovery stage import cycles).
 */

import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import { readProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

/** True when observation approval is validated on file (Approved workflow row). */
export function hasProviderObservationApprovalValidated(contact: Record<string, unknown>): boolean {
  if (!isIntelligenceFieldValidatedOnFile("provider_observation_feasibility", contact)) {
    return false;
  }
  const feasibility = String(contact.provider_observation_feasibility ?? "")
    .trim()
    .toLowerCase();
  return /^(approved|yes|easy|restricted)$/.test(feasibility);
}

/** True when rep has recorded observation approval in structured commercial intelligence. */
export function hasCommercialObservationApprovalOnFile(
  contact: Record<string, unknown>,
): boolean {
  const intel = readProviderCommercialIntelligence(contact);
  return intel?.observation.approval_status === "approved";
}

/** Commercial milestone — validated field or structured approval on file. */
export function hasProviderObservationApprovalOnFile(
  contact: Record<string, unknown>,
): boolean {
  return (
    hasProviderObservationApprovalValidated(contact) ||
    hasCommercialObservationApprovalOnFile(contact)
  );
}
