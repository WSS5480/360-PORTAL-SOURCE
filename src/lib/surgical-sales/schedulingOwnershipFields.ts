/**
 * Scheduling ownership field keys and draft helpers — leaf module (no discovery graph imports).
 */

export type SchedulingControlPathId =
  | "provider_office"
  | "facility"
  | "shared_workflow"
  | "unknown";

export type SchedulingContactOwnershipType = "provider" | "organization" | "shared";

export const SCHEDULING_OWNERSHIP_FIELD_KEYS = {
  schedulingControl: "provider_observation_scheduling_control",
  providerSchedulingContact: "provider_scheduling_contact",
  facilitySchedulingContact: "provider_facility_scheduling_contact",
  coordinatorSummary: "provider_observation_coordinator_contact",
} as const;

export type SchedulingOwnershipDraft = {
  schedulingControl: SchedulingControlPathId | "";
};

export function emptySchedulingOwnershipDraft(): SchedulingOwnershipDraft {
  return { schedulingControl: "" };
}

export function schedulingOwnershipDraftFromMappingMetadata(
  metadata?: Record<string, string>,
): SchedulingOwnershipDraft {
  const raw = metadata?.scheduling_control ?? "";
  const valid: SchedulingControlPathId[] = [
    "provider_office",
    "facility",
    "shared_workflow",
    "unknown",
  ];
  return {
    schedulingControl: valid.includes(raw as SchedulingControlPathId)
      ? (raw as SchedulingControlPathId)
      : "",
  };
}

export function schedulingOwnershipMappingMetadataFromDraft(
  draft: SchedulingOwnershipDraft,
): Record<string, string> {
  return {
    scheduling_control: draft.schedulingControl,
  };
}

export function schedulingControlPathFromContact(
  contact: Record<string, unknown>,
): SchedulingControlPathId | "" {
  const raw = String(contact[SCHEDULING_OWNERSHIP_FIELD_KEYS.schedulingControl] ?? "").trim();
  if (
    raw === "provider_office" ||
    raw === "facility" ||
    raw === "shared_workflow" ||
    raw === "unknown"
  ) {
    return raw;
  }
  return "";
}

export function schedulingOwnershipDraftFromContact(
  contact: Record<string, unknown>,
): SchedulingOwnershipDraft {
  return {
    schedulingControl: schedulingControlPathFromContact(contact),
  };
}

export const SCHEDULING_FACILITY_DRAFT_KEY = "scheduling_owner__facility";
