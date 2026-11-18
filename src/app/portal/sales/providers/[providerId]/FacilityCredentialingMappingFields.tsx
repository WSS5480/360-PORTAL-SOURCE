"use client";

import React from "react";
import { CredentialingPlatformFieldControl } from "@/app/portal/sales/providers/[providerId]/CredentialingPlatformFieldControl";
import {
  FACILITY_CREDENTIALING_UI,
  type FacilityCredentialingDraft,
} from "@/lib/surgical-sales/facilityCredentialingIntelligence";
import { PROVIDER_CREDENTIALING_METADATA_KEYS } from "@/lib/surgical-sales/providerCredentialing";

export type FacilityCredentialingMappingValue = FacilityCredentialingDraft & {
  approvalRequired: "yes" | "no" | "unknown";
};

export function facilityCredentialingMappingValueFromMetadata(
  metadata?: Record<string, string>,
): FacilityCredentialingMappingValue {
  const approvalRaw = metadata?.[PROVIDER_CREDENTIALING_METADATA_KEYS.approvalRequired]?.trim().toLowerCase();
  const approvalRequired =
    approvalRaw === "yes" || approvalRaw === "no" ? approvalRaw : "unknown";

  return {
    platformId: metadata?.platform_id ?? "",
    platformName: metadata?.platform_name ?? "",
    credentialingContact: metadata?.credentialing_contact ?? "",
    approvalContact:
      metadata?.approval_contact?.trim() ||
      (approvalRequired === "yes" ? "Facility approval required" : ""),
    renewalNotes:
      metadata?.[PROVIDER_CREDENTIALING_METADATA_KEYS.intelligenceNotes]?.trim() ||
      metadata?.renewal_notes?.trim() ||
      "",
    requiredDocuments: metadata?.required_documents ?? "",
    facilityInstructions: metadata?.facility_instructions ?? "",
    approvalRequired,
  };
}

export function facilityCredentialingMetadataFromMappingValue(
  value: FacilityCredentialingMappingValue,
): Record<string, string> {
  return {
    platform_id: value.platformId,
    platform_name: value.platformName,
    credentialing_contact: value.credentialingContact,
    approval_contact: value.approvalRequired === "yes" ? value.approvalContact || "Facility approval required" : "",
    [PROVIDER_CREDENTIALING_METADATA_KEYS.intelligenceNotes]: value.renewalNotes,
    renewal_notes: value.renewalNotes,
    [PROVIDER_CREDENTIALING_METADATA_KEYS.approvalRequired]: value.approvalRequired,
    required_documents: value.requiredDocuments,
    facility_instructions: value.facilityInstructions,
  };
}

export function FacilityCredentialingMappingFields({
  value,
  disabled,
  onChange,
  onOpenCredentialingWorkflow,
}: {
  value: FacilityCredentialingMappingValue;
  disabled?: boolean;
  onChange: (value: FacilityCredentialingMappingValue) => void;
  onOpenCredentialingWorkflow?: () => void;
}) {
  return (
    <section className="facility-cred-panel facility-cred-panel--compact" aria-label={FACILITY_CREDENTIALING_UI.sectionLabel}>
      <header className="facility-cred-panel-head">
        <h4 className="facility-cred-panel-title">{FACILITY_CREDENTIALING_UI.sectionLabel}</h4>
        <p className="facility-cred-panel-helper">
          Capture what you learned — track submission and completion in the credentialing workflow.
        </p>
      </header>

      <div className="facility-cred-compact-grid">
        <CredentialingPlatformFieldControl
          platformId={value.platformId}
          platformName={value.platformName}
          disabled={disabled}
          onChange={({ platformId, platformName }) => onChange({ ...value, platformId, platformName })}
        />

        <label className="stage-mapping-meta-field stage-mapping-meta-field--optional">
          <span>Workflow owner (optional)</span>
          <input
            className="stage-mapping-meta-input"
            value={value.credentialingContact}
            disabled={disabled}
            placeholder="Credentialing coordinator or vendor contact"
            onChange={(e) => onChange({ ...value, credentialingContact: e.target.value })}
          />
        </label>

        <label className="stage-mapping-meta-field stage-mapping-meta-field--optional">
          <span>Approval required</span>
          <select
            className="stage-mapping-meta-input"
            value={value.approvalRequired}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...value,
                approvalRequired: e.target.value as FacilityCredentialingMappingValue["approvalRequired"],
                approvalContact:
                  e.target.value === "yes"
                    ? value.approvalContact || "Facility approval required"
                    : "",
              })
            }
          >
            <option value="unknown">Unknown</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label className="stage-mapping-meta-field stage-mapping-meta-field--full stage-mapping-meta-field--optional">
          <span>Discovery notes (optional)</span>
          <textarea
            className="stage-mapping-notes"
            rows={2}
            value={value.renewalNotes}
            disabled={disabled}
            placeholder="Platform hints, documents mentioned, renewal cadence…"
            onChange={(e) => onChange({ ...value, renewalNotes: e.target.value })}
          />
        </label>
      </div>

      {onOpenCredentialingWorkflow ? (
        <button
          type="button"
          className="stage-mapping-text-btn facility-cred-open-workflow"
          disabled={disabled}
          onClick={onOpenCredentialingWorkflow}
        >
          Open credentialing workflow
        </button>
      ) : null}
    </section>
  );
}

export {
  facilityCredentialingMappingValueFromMetadata as facilityCredentialingDraftFromMetadata,
  facilityCredentialingMetadataFromMappingValue as facilityCredentialingMappingMetadataFromDraft,
};
