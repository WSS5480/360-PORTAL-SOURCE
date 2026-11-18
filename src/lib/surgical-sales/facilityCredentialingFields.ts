/**
 * Facility credentialing field keys and draft helpers — leaf module (no discovery graph imports).
 */

export const FACILITY_CREDENTIALING_FIELD_KEYS = {
  platformId: "provider_credentialing_platform_id",
  platformName: "provider_credentialing_platform_name",
  credentialingContact: "provider_credentialing_contact",
  approvalContact: "provider_credentialing_approval_contact",
  renewalNotes: "provider_credentialing_renewal_notes",
  requiredDocuments: "provider_credentialing_required_documents",
  facilityInstructions: "provider_credentialing_facility_instructions",
} as const;

export type FacilityCredentialingDraft = {
  platformId: string;
  platformName: string;
  credentialingContact: string;
  approvalContact: string;
  renewalNotes: string;
  requiredDocuments: string;
  facilityInstructions: string;
};

export function emptyFacilityCredentialingDraft(): FacilityCredentialingDraft {
  return {
    platformId: "",
    platformName: "",
    credentialingContact: "",
    approvalContact: "",
    renewalNotes: "",
    requiredDocuments: "",
    facilityInstructions: "",
  };
}

export function facilityCredentialingDraftFromMappingMetadata(
  metadata?: Record<string, string>,
): FacilityCredentialingDraft {
  const intelligenceNotes =
    metadata?.intelligence_notes?.trim() || metadata?.renewal_notes?.trim() || "";
  const approvalRequired = metadata?.approval_required?.trim().toLowerCase();
  const approvalContact =
    metadata?.approval_contact?.trim() ||
    (approvalRequired === "yes" ? "Facility approval required" : "");

  return {
    platformId: metadata?.platform_id ?? "",
    platformName: metadata?.platform_name ?? "",
    credentialingContact: metadata?.credentialing_contact ?? "",
    approvalContact,
    renewalNotes: intelligenceNotes,
    requiredDocuments: metadata?.required_documents ?? "",
    facilityInstructions: metadata?.facility_instructions ?? "",
  };
}

export function facilityCredentialingMappingMetadataFromDraft(
  draft: FacilityCredentialingDraft,
  extra?: { approvalRequired?: string; pathwayChoice?: string },
): Record<string, string> {
  return {
    platform_id: draft.platformId,
    platform_name: draft.platformName,
    credentialing_contact: draft.credentialingContact,
    approval_contact: draft.approvalContact,
    intelligence_notes: draft.renewalNotes,
    renewal_notes: draft.renewalNotes,
    required_documents: draft.requiredDocuments,
    facility_instructions: draft.facilityInstructions,
    approval_required: extra?.approvalRequired ?? "",
    pathway_choice: extra?.pathwayChoice ?? "",
  };
}

export function facilityCredentialingDraftFromContact(
  contact: Record<string, unknown>,
): FacilityCredentialingDraft {
  return {
    platformId: String(contact[FACILITY_CREDENTIALING_FIELD_KEYS.platformId] ?? "").trim(),
    platformName: String(contact[FACILITY_CREDENTIALING_FIELD_KEYS.platformName] ?? "").trim(),
    credentialingContact: String(contact[FACILITY_CREDENTIALING_FIELD_KEYS.credentialingContact] ?? "").trim(),
    approvalContact: String(contact[FACILITY_CREDENTIALING_FIELD_KEYS.approvalContact] ?? "").trim(),
    renewalNotes: String(contact[FACILITY_CREDENTIALING_FIELD_KEYS.renewalNotes] ?? "").trim(),
    requiredDocuments: String(contact[FACILITY_CREDENTIALING_FIELD_KEYS.requiredDocuments] ?? "").trim(),
    facilityInstructions: String(contact[FACILITY_CREDENTIALING_FIELD_KEYS.facilityInstructions] ?? "").trim(),
  };
}

export function facilityCredentialingDraftHasSignal(draft: FacilityCredentialingDraft): boolean {
  return Boolean(
    draft.platformId ||
      draft.platformName ||
      draft.credentialingContact ||
      draft.approvalContact ||
      draft.renewalNotes ||
      draft.requiredDocuments ||
      draft.facilityInstructions,
  );
}
