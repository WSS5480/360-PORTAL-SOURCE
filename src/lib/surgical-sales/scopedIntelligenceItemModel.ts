/**
 * Unified scoped intelligence item — organization vs provider vs case with explicit confirmation.
 */

import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";

export type IntelligenceConfirmationStatus =
  | "suggested"
  | "confirmed_for_provider"
  | "not_applicable_to_provider"
  | "organization_confirmed";

export type ScopedIntelligenceSourceType =
  | "intro_call"
  | "observation_case"
  | "product_case"
  | "support_case"
  | "manual_entry"
  | "organization_profile";

export type ScopedIntelligenceItem = {
  intelligenceId: string;
  scope: IntelligenceScope | "provider_organization_confirmed";
  organizationId: string | null;
  providerId: string | null;
  sourceProviderId: string | null;
  sourceCaseId: string | null;
  confidence: "high" | "medium" | "low";
  confirmationStatus: IntelligenceConfirmationStatus;
  sourceType: ScopedIntelligenceSourceType;
  isClinicalProviderSpecific: boolean;
  isOperationalReusable: boolean;
  /** Human-readable label for UI cards. */
  label: string;
  /** Detail line shown in suggested context panel. */
  displayLine: string;
  /** Optional dbKey when mapped to a persisted intelligence field. */
  dbKey?: string;
  /** Optional linked support contact id. */
  linkedContactId?: string | null;
};

export const ORGANIZATION_SUGGESTED_CONTEXT_LABELS = {
  panelTitle: "Suggested Facility Intelligence",
  panelSubtext:
    "We've already learned these things about the facility. Apply them to this provider if they also appear to be true.",
  panelKicker: "Facility Intelligence",
  suggestedFrom: "Learned at facility",
  needsConfirmation: "Review for this provider",
  organizationLevel: "Facility Intelligence",
  confirmedForProvider: "Applied to this provider",
  notApplicable: "Not applicable to this provider",
  confirmForProvider: "Apply to Provider",
  notApplicableAction: "Not Applicable",
  viewOrganizationDetails: "View Facility Details",
  credentialingTitle: "Facility Credentialing Requirement Identified",
  observationAccessTitle: "Observation Approval Process Identified",
} as const;
