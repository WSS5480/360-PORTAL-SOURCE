/**
 * Rapid Discovery — people-related questions and support contact integration.
 */

import { contactDisplayName } from "@/lib/surgical-sales/labels";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { DiscoverySupportContactSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";
import {
  assignmentLinksToOrganization,
  defaultContactRelationshipAssignment,
} from "@/lib/surgical-sales/contactRelationshipAssignment";
import {
  defaultContactTypeForSignal,
  defaultWorkflowResponsibilitiesForSignal,
  formatOperationalContactIntelligenceLine,
  dedupeWorkflowResponsibilities,
  type OperationalContactTypeId,
  type SchedulingContactOwnershipType,
  type WorkflowResponsibilityId,
} from "@/lib/surgical-sales/operationalSupportContact";
import { resolveSchedulingOwnerFieldText } from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";
import {
  emptyProviderCommercialIntelligence,
  PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY,
  readProviderCommercialIntelligence,
  type ProviderCommercialIntelligence,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

export type RapidDiscoverySupportContactRoleOption = {
  id: string;
  label: string;
  roleType: string;
  relationshipType: string;
};

export const SCHEDULING_OWNER_INTELLIGENCE_DB_KEY = "provider_observation_coordinator_contact";

export const SCHEDULING_OWNER_ROLE_ID = "scheduling_owner";

export function schedulingOwnerDisplayRoleLabel(): string {
  return "Scheduling Owner / Coordinator";
}

export const RAPID_DISCOVERY_SUPPORT_CONTACT_ROLES: RapidDiscoverySupportContactRoleOption[] = [
  {
    id: SCHEDULING_OWNER_ROLE_ID,
    label: schedulingOwnerDisplayRoleLabel(),
    roleType: "scheduler",
    relationshipType: "scheduler",
  },
  { id: "scheduler", label: "Scheduler", roleType: "scheduler", relationshipType: "scheduler" },
  { id: "office_manager", label: "Office Manager", roleType: "office_manager", relationshipType: "office_manager" },
  {
    id: "or_coordinator",
    label: "OR Coordinator",
    roleType: "scheduler",
    relationshipType: "scheduler",
  },
  { id: "or_manager", label: "OR Manager", roleType: "admin", relationshipType: "works_with" },
  {
    id: "credentialing",
    label: "Credentialing contact",
    roleType: "admin",
    relationshipType: "works_with",
  },
  {
    id: "vendor_access_contact",
    label: "Vendor Access Contact",
    roleType: "admin",
    relationshipType: "works_with",
  },
  {
    id: "clinical_champion",
    label: "Clinical Champion",
    roleType: "assistant",
    relationshipType: "works_with",
  },
  {
    id: "materials_contact",
    label: "Materials Contact",
    roleType: "admin",
    relationshipType: "works_with",
  },
  { id: "coordinator", label: "Coordinator", roleType: "scheduler", relationshipType: "scheduler" },
  { id: "liaison", label: "Surgeon liaison", roleType: "assistant", relationshipType: "works_with" },
  { id: "facility_admin", label: "Facility admin", roleType: "admin", relationshipType: "works_with" },
  { id: "other", label: "Other", roleType: "other", relationshipType: "works_with" },
];

const PEOPLE_RELATED_DB_KEYS = new Set([
  "provider_observation_coordinator_contact",
  "provider_decision_maker_status",
  "provider_champion_potential",
  "influence_level",
  "provider_credentialing_status",
  "provider_observation_access_path",
  "provider_observation_credentialing_needed",
  "provider_observation_best_days_case_types",
  "provider_communication_style",
  "provider_responsiveness",
]);

const PEOPLE_PROMPT_RE =
  /\b(who|whom|contact|coordinator|scheduler|scheduling owner|office manager|or manager|credentialing|approval contact|liaison|vendor contact|facility contact|access contact|owns or access)\b/i;

const DEFAULT_ROLE_BY_DB_KEY: Partial<Record<string, string>> = {
  provider_observation_coordinator_contact: SCHEDULING_OWNER_ROLE_ID,
  provider_decision_maker_status: "office_manager",
  provider_champion_potential: "clinical_champion",
  influence_level: "office_manager",
  provider_observation_access_path: "vendor_access_contact",
  provider_observation_credentialing_needed: "credentialing",
  provider_credentialing_status: "credentialing",
};

export function rapidDiscoveryInvolvesSupportContact(
  dbKey: string,
  prompt?: string | null,
): boolean {
  if (PEOPLE_RELATED_DB_KEYS.has(dbKey)) return true;
  return PEOPLE_PROMPT_RE.test(String(prompt ?? ""));
}

/** True when workflow or capture should surface the support-contact picker (not notes-only). */
export function workflowShouldOfferSupportContactSave(
  dbKey: string,
  prompt?: string | null,
): boolean {
  return rapidDiscoveryInvolvesSupportContact(dbKey, prompt);
}

export function defaultSupportContactRoleId(dbKey: string): string {
  return DEFAULT_ROLE_BY_DB_KEY[dbKey] ?? "coordinator";
}

export function supportContactRoleOption(roleId: string): RapidDiscoverySupportContactRoleOption {
  return (
    RAPID_DISCOVERY_SUPPORT_CONTACT_ROLES.find((r) => r.id === roleId) ??
    RAPID_DISCOVERY_SUPPORT_CONTACT_ROLES.find((r) => r.id === "other")!
  );
}

export type RapidDiscoverySupportContactDraft = {
  mode: "select" | "create";
  createStep: 1 | 2 | 3 | 4;
  selectedContactId: string;
  contactTypeId: OperationalContactTypeId;
  jobTitle: string;
  workflowResponsibilities: WorkflowResponsibilityId[];
  ownershipType: SchedulingContactOwnershipType;
  showProviders: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  organizationId: string | null;
  /** Legacy role picker — derived from contactTypeId when saving. */
  roleId: string;
};

export function draftLinksToOrganization(draft: RapidDiscoverySupportContactDraft): boolean {
  return assignmentLinksToOrganization(draft.ownershipType);
}

function defaultContactTypeForDbKey(dbKey: string): OperationalContactTypeId {
  switch (dbKey) {
    case "provider_observation_coordinator_contact":
      return "scheduler";
    case "provider_champion_potential":
      return "clinical_staff";
    case "provider_observation_access_path":
      return "vendor_credentialing";
    default:
      return "office_staff";
  }
}

function defaultWorkflowForDbKey(dbKey: string): WorkflowResponsibilityId[] {
  switch (dbKey) {
    case "provider_observation_coordinator_contact":
      return ["observation_scheduling_owner"];
    case "provider_champion_potential":
      return ["clinical_champion"];
    case "provider_observation_access_path":
      return ["vendor_access", "credentialing_contact"];
    case "influence_level":
      return ["decision_influence"];
    default:
      return ["case_coordination"];
  }
}

export function emptySupportContactDraft(input: {
  dbKey: string;
  organizationId: string | null;
  initialMode?: "select" | "create";
  discoverySignalId?: DiscoverySupportContactSignalId;
  ownershipType?: SchedulingContactOwnershipType;
  launchOrigin?: "provider" | "organization";
}): RapidDiscoverySupportContactDraft {
  const contactTypeId = input.discoverySignalId
    ? defaultContactTypeForSignal(input.discoverySignalId)
    : defaultContactTypeForDbKey(input.dbKey);
  const workflowResponsibilities = dedupeWorkflowResponsibilities(
    input.discoverySignalId
      ? defaultWorkflowResponsibilitiesForSignal(input.discoverySignalId)
      : defaultWorkflowForDbKey(input.dbKey),
  );

  return {
    mode: input.initialMode ?? "select",
    createStep: 1,
    selectedContactId: "",
    contactTypeId,
    jobTitle: contactTypeId === "scheduler" ? "Scheduler" : "",
    workflowResponsibilities,
    ownershipType:
      input.ownershipType ??
      defaultContactRelationshipAssignment(input.organizationId, input.launchOrigin ?? "provider"),
    showProviders: input.discoverySignalId === "clinical_champion",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
    organizationId: input.organizationId,
    roleId: legacyRoleIdFromContactType(contactTypeId),
  };
}

export function buildSchedulerSupportContactDraft(input: {
  organizationId: string | null;
  initialMode?: "select" | "create";
  prefillContactName?: string | null;
  launchOrigin?: "provider" | "organization";
}): RapidDiscoverySupportContactDraft {
  const prefillName = String(input.prefillContactName ?? "").trim();
  const draft = emptySupportContactDraft({
    dbKey: SCHEDULING_OWNER_INTELLIGENCE_DB_KEY,
    organizationId: input.organizationId,
    initialMode: prefillName ? "create" : (input.initialMode ?? "select"),
    launchOrigin: input.launchOrigin ?? "provider",
  });

  if (!prefillName) return draft;

  const [firstName, ...rest] = prefillName.split(/\s+/);
  return {
    ...draft,
    mode: "create",
    firstName,
    lastName: rest.join(" "),
    jobTitle: draft.jobTitle || "Scheduler",
  };
}

export function legacyRoleIdFromContactType(contactTypeId: OperationalContactTypeId): string {
  switch (contactTypeId) {
    case "scheduler":
      return SCHEDULING_OWNER_ROLE_ID;
    case "office_staff":
      return "office_manager";
    case "clinical_staff":
      return "clinical_champion";
    case "vendor_credentialing":
      return "vendor_access_contact";
    case "materials":
      return "materials_contact";
    case "admin":
      return "facility_admin";
    case "provider":
      return "clinical_champion";
    default:
      return "other";
  }
}

export function syncDraftRoleId(draft: RapidDiscoverySupportContactDraft): RapidDiscoverySupportContactDraft {
  return {
    ...draft,
    roleId: legacyRoleIdFromContactType(draft.contactTypeId),
  };
}

export function formatIntelligenceValueFromSupportContact(
  contact: Record<string, unknown>,
  roleLabel: string,
  notes?: string | null,
  options?: {
    jobTitle?: string;
    workflowResponsibilityIds?: string[];
  },
): string {
  if (options?.workflowResponsibilityIds?.length) {
    return formatOperationalContactIntelligenceLine({
      contact,
      jobTitle: options.jobTitle ?? roleLabel,
      workflowResponsibilityIds: options.workflowResponsibilityIds,
      notes,
    });
  }

  const name = contactDisplayName(contact as Parameters<typeof contactDisplayName>[0]);
  const email = String(contact.email ?? "").trim();
  const phone = String(contact.phone ?? contact.mobile_phone ?? "").trim();
  const parts = [name, roleLabel ? `(${roleLabel})` : "", email || phone].filter(Boolean);
  const base = parts.join(" ").replace(/\s+/g, " ").trim();
  const note = String(notes ?? contact.notes ?? "").trim();
  if (!note) return base;
  return `${base} — ${note}`;
}

export type RapidDiscoveryRequirementLink = {
  requirementLabel: string;
  statusLabel: string;
  contextLine: string | null;
};

const REQUIREMENT_BY_DB_KEY: Partial<
  Record<string, { label: string; validated: string; inProgress: string }>
> = {
  provider_observation_coordinator_contact: {
    label: "Identify scheduling ownership",
    validated: "Validated",
    inProgress: "In progress",
  },
  provider_observation_access_path: {
    label: "Map facility access pathway",
    validated: "Validated",
    inProgress: "In progress",
  },
  provider_observation_best_days_case_types: {
    label: "Confirm observation logistics",
    validated: "Validated",
    inProgress: "In progress",
  },
  provider_observation_feasibility: {
    label: "Assess observation openness",
    validated: "Validated",
    inProgress: "In progress",
  },
  provider_procedure_focus: {
    label: "Understand workflow fit",
    validated: "Validated",
    inProgress: "In progress",
  },
  provider_evaluation_openness: {
    label: "Understand provider interest",
    validated: "Validated",
    inProgress: "In progress",
  },
};

export function rapidDiscoveryRequirementLink(input: {
  dbKey: string;
  operationalStatus: string;
  contactName?: string | null;
}): RapidDiscoveryRequirementLink | null {
  const spec = REQUIREMENT_BY_DB_KEY[input.dbKey];
  if (!spec) return null;
  const cleared = input.operationalStatus === "cleared";
  return {
    requirementLabel: spec.label,
    statusLabel: cleared ? spec.validated : spec.inProgress,
    contextLine: input.contactName
      ? `Source: Rapid Discovery · ${input.contactName}`
      : "Source: Rapid Discovery",
  };
}

const SCHEDULING_COMMERCIAL_SYNC_KEYS = new Set([
  "provider_observation_coordinator_contact",
  "provider_scheduling_contact",
  "provider_facility_scheduling_contact",
]);

/** Keep structured commercial intelligence aligned with manual scheduler/support-contact saves. */
export function buildSchedulingSupportContactCommercialIntelligencePatch(
  existingContact: Record<string, unknown>,
  planningPatch?: Record<string, string | null | undefined>,
): Record<string, ProviderCommercialIntelligence> | null {
  const touchedKeys = planningPatch
    ? Object.keys(planningPatch).filter((key) => SCHEDULING_COMMERCIAL_SYNC_KEYS.has(key))
    : [];
  if (touchedKeys.length === 0) return null;

  const merged = { ...existingContact, ...planningPatch };
  const line = resolveSchedulingOwnerFieldText(merged).trim();
  if (!line) return null;

  const base = readProviderCommercialIntelligence(existingContact) ?? emptyProviderCommercialIntelligence();

  // Rapid Discovery Save & Link creates a CRM contact — phone/email in the text line are optional.
  return {
    [PROVIDER_COMMERCIAL_INTELLIGENCE_DB_KEY]: {
      ...base,
      updated_at: new Date().toISOString(),
      scheduling: {
        ...base.scheduling,
        scheduler_identified: "yes",
        scheduler_contact_linked: "yes",
      },
    },
  };
}

export const RAPID_DISCOVERY_CAPTURE_SOURCE_LABEL = "Rapid Discovery";
