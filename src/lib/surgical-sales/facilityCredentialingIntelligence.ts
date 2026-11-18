/**
 * Structured facility / vendor credentialing intelligence.
 */

import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import { credentialingPlatformDisplayName } from "@/lib/surgical-sales/credentialingPlatforms";
import {
  FACILITY_CREDENTIALING_FIELD_KEYS,
  facilityCredentialingDraftFromContact,
  facilityCredentialingDraftHasSignal,
  type FacilityCredentialingDraft,
} from "@/lib/surgical-sales/facilityCredentialingFields";

export {
  FACILITY_CREDENTIALING_FIELD_KEYS,
  facilityCredentialingDraftFromContact,
  facilityCredentialingDraftFromMappingMetadata,
  facilityCredentialingDraftHasSignal,
  facilityCredentialingMappingMetadataFromDraft,
  emptyFacilityCredentialingDraft,
  type FacilityCredentialingDraft,
} from "@/lib/surgical-sales/facilityCredentialingFields";

export const FACILITY_CREDENTIALING_UI = {
  sectionLabel: "Credentialing intelligence",
  sectionHelper: "Helpful if known — usually completed after observation approval.",
  platformLabel: "Credentialing / vendor access service",
  platformHelper:
    "Select the vendor access or credentialing system used by this facility. Add it if it is not listed.",
  credentialingContactLabel: "Credentialing contact",
  approvalContactLabel: "Approval contact",
  renewalNotesLabel: "Renewal / expiration notes",
  requiredDocumentsLabel: "Required documents",
  facilityInstructionsLabel: "Facility instructions",
  createPlatformQuick: "Add",
  createPlatformQuickSuffix: "as new credentialing service",
  createPlatformForm: "Add credentialing service",
  createPlatformNameLabel: "Service / platform name",
  createPlatformAliasesLabel: "Common aliases (optional)",
  createPlatformAliasesPlaceholder: "e.g. Rep Trax, VendorMate",
  createPlatformNotesLabel: "Notes (optional)",
  createPlatformNotesPlaceholder: "Login URL, renewal cadence, facility-specific tips…",
  createPlatformSave: "Save service",
  createPlatformCancel: "Cancel",
  platformSearchPlaceholder: "Search credentialing services…",
  overviewNotMapped: "Credentialing pathway not yet mapped.",
  overviewMappedPrefix: "Credentialing",
} as const;

export function buildFacilityCredentialingPlanningPatch(
  draft: FacilityCredentialingDraft,
): Record<string, string | null> {
  const trim = (v: string) => v.trim() || null;
  return {
    [FACILITY_CREDENTIALING_FIELD_KEYS.platformId]: trim(draft.platformId),
    [FACILITY_CREDENTIALING_FIELD_KEYS.platformName]: trim(draft.platformName),
    [FACILITY_CREDENTIALING_FIELD_KEYS.credentialingContact]: trim(draft.credentialingContact),
    [FACILITY_CREDENTIALING_FIELD_KEYS.approvalContact]: trim(draft.approvalContact),
    [FACILITY_CREDENTIALING_FIELD_KEYS.renewalNotes]: trim(draft.renewalNotes),
    [FACILITY_CREDENTIALING_FIELD_KEYS.requiredDocuments]: trim(draft.requiredDocuments),
    [FACILITY_CREDENTIALING_FIELD_KEYS.facilityInstructions]: trim(draft.facilityInstructions),
  };
}

export function formatFacilityCredentialingSummaryLine(draft: FacilityCredentialingDraft): string {
  const parts: string[] = [];
  if (draft.platformName.trim()) {
    parts.push(`Platform: ${draft.platformName.trim()}`);
  }
  if (draft.credentialingContact.trim()) {
    parts.push(`Credentialing: ${draft.credentialingContact.trim()}`);
  }
  if (draft.approvalContact.trim()) {
    parts.push(`Approval: ${draft.approvalContact.trim()}`);
  }
  if (draft.renewalNotes.trim()) {
    parts.push(`Renewal: ${draft.renewalNotes.trim()}`);
  }
  if (draft.requiredDocuments.trim()) {
    parts.push(`Documents: ${draft.requiredDocuments.trim()}`);
  }
  if (draft.facilityInstructions.trim()) {
    parts.push(`Instructions: ${draft.facilityInstructions.trim()}`);
  }
  return parts.join(" · ");
}

export function buildFacilityCredentialingStatusValue(
  draft: FacilityCredentialingDraft,
  choice: string,
): string {
  const summary = formatFacilityCredentialingSummaryLine(draft);
  if (summary) return summary;

  switch (choice) {
    case "path_clear":
      return "Vendor credentialing path clear";
    case "partial_path":
      return "Credentialing pathway partially mapped";
    case "required_pending":
      return "Vendor credentialing required — pending";
    case "unknown":
      return "Credentialing pathway unknown";
    default:
      return "Credentialing pathway captured";
  }
}

export type CredentialingPathwayOverviewState = {
  line: string;
  tone: "muted" | "warn" | "known";
  promoteToBlocker: boolean;
  hasStructuredIntel: boolean;
};

export function buildCredentialingPathwayOverviewState(
  contact: Record<string, unknown>,
): CredentialingPathwayOverviewState {
  const draft = facilityCredentialingDraftFromContact(contact);
  const hasStructured = facilityCredentialingDraftHasSignal(draft);
  const approved = hasProviderObservationApprovalValidated(contact);

  if (!hasStructured) {
    return {
      line: FACILITY_CREDENTIALING_UI.overviewNotMapped,
      tone: approved ? "warn" : "muted",
      promoteToBlocker: approved,
      hasStructuredIntel: false,
    };
  }

  const platformLabel = draft.platformName || "Platform on file";
  const line = `${FACILITY_CREDENTIALING_UI.overviewMappedPrefix}: ${platformLabel}${
    draft.credentialingContact ? ` · ${draft.credentialingContact}` : ""
  }`;

  return {
    line,
    tone: "known",
    promoteToBlocker: false,
    hasStructuredIntel: true,
  };
}

export function credentialingPlatformLabelFromContact(contact: Record<string, unknown>): string | null {
  const name = String(contact[FACILITY_CREDENTIALING_FIELD_KEYS.platformName] ?? "").trim();
  if (name) return name;
  return null;
}

export function mergeCredentialingPlatformIntoDraft(
  draft: FacilityCredentialingDraft,
  platform: { id: string; name: string },
): FacilityCredentialingDraft {
  return {
    ...draft,
    platformId: platform.id,
    platformName: credentialingPlatformDisplayName(platform),
  };
}

import { persistProviderCredentialing } from "@/lib/surgical-sales/providerCredentialing";

export async function persistFacilityCredentialingIntelligence(input: {
  providerId: string;
  choice: string;
  draft: FacilityCredentialingDraft;
  notes?: string;
  workflowProvider?: Record<string, unknown>;
  contact?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  return persistProviderCredentialing({
    providerId: input.providerId,
    structured: input.draft,
    pathwayChoice: input.choice as import("@/lib/surgical-sales/providerCredentialing").FacilityVendorPathwayChoice,
    notes: input.notes,
    sourceLabel: "Field capture",
    mergeFromContact: input.contact ?? input.workflowProvider,
  });
}
