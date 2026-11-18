/**
 * Scheduling ownership intelligence — provider vs facility scheduling pathways.
 */

import { saveRapidDiscoverySupportContact } from "@/lib/surgical-sales/saveRapidDiscoverySupportContact";
import type { RapidDiscoverySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import {
  SCHEDULING_OWNERSHIP_FIELD_KEYS,
  schedulingControlPathFromContact,
  type SchedulingContactOwnershipType,
  type SchedulingControlPathId,
  type SchedulingOwnershipDraft,
} from "@/lib/surgical-sales/schedulingOwnershipFields";

export {
  SCHEDULING_OWNERSHIP_FIELD_KEYS,
  schedulingOwnershipDraftFromContact,
  schedulingOwnershipDraftFromMappingMetadata,
  schedulingOwnershipMappingMetadataFromDraft,
  emptySchedulingOwnershipDraft,
  type SchedulingContactOwnershipType,
  type SchedulingControlPathId,
  type SchedulingOwnershipDraft,
} from "@/lib/surgical-sales/schedulingOwnershipFields";

export const SCHEDULING_OWNERSHIP_UI = {
  primaryQuestion: "Where is observation scheduling controlled?",
  providerOffice: "Provider office",
  facility: "Facility / hospital",
  sharedWorkflow: "Shared scheduling workflow",
  sharedHelper: "Both provider office staff and facility staff coordinate scheduling.",
  unknown: "Unknown",
  providerSectionLabel: "Provider scheduling workflow",
  providerSectionHelper: "Office scheduler, surgery coordinator, or provider staff who books cases.",
  facilitySectionLabel: "Facility scheduling workflow",
  facilitySectionHelper: "OR scheduler, central scheduling, or ASC staff who control OR time.",
  pathRequired: "Select where scheduling is controlled, then link who helps coordinate.",
} as const;

export const SCHEDULING_CONTROL_PATH_OPTIONS: {
  value: SchedulingControlPathId;
  label: string;
  helper?: string;
}[] = [
  { value: "provider_office", label: SCHEDULING_OWNERSHIP_UI.providerOffice },
  { value: "facility", label: SCHEDULING_OWNERSHIP_UI.facility },
  {
    value: "shared_workflow",
    label: SCHEDULING_OWNERSHIP_UI.sharedWorkflow,
    helper: SCHEDULING_OWNERSHIP_UI.sharedHelper,
  },
  { value: "unknown", label: SCHEDULING_OWNERSHIP_UI.unknown },
];

export function schedulingControlPathLabel(path: SchedulingControlPathId | ""): string {
  return SCHEDULING_CONTROL_PATH_OPTIONS.find((o) => o.value === path)?.label ?? "";
}

export function defaultOwnershipForSchedulingPath(
  path: SchedulingControlPathId,
): SchedulingContactOwnershipType {
  switch (path) {
    case "provider_office":
      return "provider";
    case "facility":
      return "organization";
    case "shared_workflow":
      return "shared";
    default:
      return "provider";
  }
}

export function schedulingPathRequiresProviderContact(path: SchedulingControlPathId | ""): boolean {
  return path === "provider_office" || path === "shared_workflow";
}

export function schedulingPathRequiresFacilityContact(path: SchedulingControlPathId | ""): boolean {
  return path === "facility" || path === "shared_workflow";
}

export function buildSchedulingOwnershipPlanningPatch(input: {
  schedulingControl: SchedulingControlPathId;
  providerContactLine?: string | null;
  facilityContactLine?: string | null;
}): Record<string, string | null> {
  const trim = (v?: string | null) => v?.trim() || null;
  const providerLine = trim(input.providerContactLine);
  const facilityLine = trim(input.facilityContactLine);

  let coordinatorSummary: string | null = null;
  if (providerLine && facilityLine) {
    coordinatorSummary = `Provider: ${providerLine} · Facility: ${facilityLine}`;
  } else if (providerLine) {
    coordinatorSummary = providerLine;
  } else if (facilityLine) {
    coordinatorSummary = facilityLine;
  }

  return {
    [SCHEDULING_OWNERSHIP_FIELD_KEYS.schedulingControl]: input.schedulingControl,
    [SCHEDULING_OWNERSHIP_FIELD_KEYS.providerSchedulingContact]: providerLine,
    [SCHEDULING_OWNERSHIP_FIELD_KEYS.facilitySchedulingContact]: facilityLine,
    [SCHEDULING_OWNERSHIP_FIELD_KEYS.coordinatorSummary]: coordinatorSummary,
  };
}

export function buildSchedulingOwnershipStatusValue(input: {
  schedulingControl: SchedulingControlPathId;
  providerContactLine?: string | null;
  facilityContactLine?: string | null;
  notes?: string;
}): string {
  const pathLabel = schedulingControlPathLabel(input.schedulingControl);
  const parts: string[] = [`Scheduling: ${pathLabel}`];

  const providerLine = input.providerContactLine?.trim();
  const facilityLine = input.facilityContactLine?.trim();
  if (providerLine) parts.push(`Provider office: ${providerLine}`);
  if (facilityLine) parts.push(`Facility: ${facilityLine}`);

  const note = input.notes?.trim();
  if (note) parts.push(note);

  return parts.join(" · ");
}

export function schedulingOwnershipReadyToSave(input: {
  schedulingControl: SchedulingControlPathId | "";
  providerContactReady: boolean;
  facilityContactReady: boolean;
}): boolean {
  if (!input.schedulingControl || input.schedulingControl === "unknown") {
    return Boolean(input.schedulingControl);
  }
  if (input.schedulingControl === "provider_office") return input.providerContactReady;
  if (input.schedulingControl === "facility") return input.facilityContactReady;
  if (input.schedulingControl === "shared_workflow") {
    return input.providerContactReady && input.facilityContactReady;
  }
  return false;
}

export async function persistSchedulingOwnershipIntelligence(input: {
  providerId: string;
  schedulingControl: SchedulingControlPathId;
  providerContactLine?: string | null;
  facilityContactLine?: string | null;
  notes?: string;
}): Promise<Record<string, unknown>> {
  const statusValue = buildSchedulingOwnershipStatusValue(input);
  const planning = buildSchedulingOwnershipPlanningPatch(input);

  const validateFields = Object.entries(planning)
    .filter(([, value]) => Boolean(value && String(value).trim()))
    .map(([key]) => key);

  const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(input.providerId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planning,
      planning_capture_context: {
        source_type: "profile",
        source_label: "Field capture",
      },
      intelligence_validate_fields: validateFields,
    }),
  });

  const payload = (await res.json()) as {
    ok?: boolean;
    provider?: Record<string, unknown>;
    error?: string;
  };
  if (!res.ok || !payload.provider) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Could not save scheduling ownership.");
  }
  return payload.provider;
}

export async function applySchedulingOwnershipStageMappingAnswer(input: {
  providerId: string;
  choice: SchedulingControlPathId;
  notes?: string;
  providerContactDraft?: RapidDiscoverySupportContactDraft | null;
  facilityContactDraft?: RapidDiscoverySupportContactDraft | null;
}): Promise<Record<string, unknown>> {
  if (input.choice === "unknown") {
    return persistSchedulingOwnershipIntelligence({
      providerId: input.providerId,
      schedulingControl: "unknown",
      notes: input.notes,
    });
  }

  let providerLine: string | null = null;
  let facilityLine: string | null = null;

  if (schedulingPathRequiresProviderContact(input.choice) && input.providerContactDraft) {
    const linked = await saveRapidDiscoverySupportContact({
      providerId: input.providerId,
      draft: input.providerContactDraft,
      dbKey: "provider_observation_coordinator_contact",
      relationshipNotes: "Provider office scheduling workflow",
    });
    providerLine = linked.intelligenceValue;
  }

  if (schedulingPathRequiresFacilityContact(input.choice) && input.facilityContactDraft) {
    const linked = await saveRapidDiscoverySupportContact({
      providerId: input.providerId,
      draft: input.facilityContactDraft,
      dbKey: "provider_observation_coordinator_contact",
      relationshipNotes: "Facility scheduling workflow",
    });
    facilityLine = linked.intelligenceValue;
  }

  return persistSchedulingOwnershipIntelligence({
    providerId: input.providerId,
    schedulingControl: input.choice,
    providerContactLine: providerLine,
    facilityContactLine: facilityLine,
    notes: input.notes,
  });
}

export function inferSchedulingControlFromContact(
  contact: Record<string, unknown>,
): SchedulingControlPathId | "" {
  const explicit = schedulingControlPathFromContact(contact);
  if (explicit) return explicit;

  const hasProvider = Boolean(
    String(contact[SCHEDULING_OWNERSHIP_FIELD_KEYS.providerSchedulingContact] ?? "").trim(),
  );
  const hasFacility = Boolean(
    String(contact[SCHEDULING_OWNERSHIP_FIELD_KEYS.facilitySchedulingContact] ?? "").trim(),
  );
  if (hasProvider && hasFacility) return "shared_workflow";
  if (hasProvider) return "provider_office";
  if (hasFacility) return "facility";
  return "";
}
