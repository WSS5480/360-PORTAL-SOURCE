"use client";

import React from "react";
import { CredentialingPlatformPicker } from "@/app/portal/sales/providers/[providerId]/CredentialingPlatformPicker";
import {
  mergeCredentialingPlatformIntoDraft,
  type FacilityCredentialingDraft,
} from "@/lib/surgical-sales/facilityCredentialingIntelligence";

export const CREDENTIALING_PLATFORM_NAME_DB_KEY = "provider_credentialing_platform_name";
export const CREDENTIALING_PLATFORM_ID_DB_KEY = "provider_credentialing_platform_id";

export function CredentialingPlatformFieldControl({
  platformId,
  platformName,
  disabled,
  onChange,
}: {
  platformId: string;
  platformName: string;
  disabled?: boolean;
  onChange: (next: { platformId: string; platformName: string }) => void;
}) {
  return (
    <CredentialingPlatformPicker
      valueId={platformId}
      valueName={platformName}
      disabled={disabled}
      onSelect={(platform) => {
        const merged = mergeCredentialingPlatformIntoDraft(
          {
            platformId,
            platformName,
            credentialingContact: "",
            approvalContact: "",
            renewalNotes: "",
            requiredDocuments: "",
            facilityInstructions: "",
          } satisfies FacilityCredentialingDraft,
          platform,
        );
        onChange({
          platformId: merged.platformId,
          platformName: merged.platformName,
        });
      }}
    />
  );
}

export function isCredentialingPlatformNameField(dbKey: string): boolean {
  return dbKey === CREDENTIALING_PLATFORM_NAME_DB_KEY;
}

export function credentialingPlatformPlanningPatch(next: {
  platformId: string;
  platformName: string;
}): Record<string, string> {
  return {
    [CREDENTIALING_PLATFORM_ID_DB_KEY]: next.platformId,
    [CREDENTIALING_PLATFORM_NAME_DB_KEY]: next.platformName,
  };
}
