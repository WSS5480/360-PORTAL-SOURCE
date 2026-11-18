/**
 * Operational support contact model — separates contact type, job title, and workflow responsibility.
 */

import { contactDisplayName } from "@/lib/surgical-sales/labels";
import type { DiscoverySupportContactSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";

export type OperationalContactTypeId =
  | "provider"
  | "scheduler"
  | "office_staff"
  | "clinical_staff"
  | "admin"
  | "materials"
  | "vendor_credentialing"
  | "other";

export type WorkflowResponsibilityId =
  | "observation_scheduling_owner"
  | "approval_contact"
  | "credentialing_contact"
  | "clinical_champion"
  | "product_evaluator"
  | "case_coordination"
  | "decision_influence"
  | "vendor_access";

export type SchedulingControlPathId =
  | "provider_office"
  | "facility"
  | "shared_workflow"
  | "unknown";

export type SchedulingContactOwnershipType = "provider" | "organization" | "shared";

export type OperationalContactTypeSpec = {
  id: OperationalContactTypeId;
  label: string;
  roleType: string;
  relationshipType: string;
};

export const OPERATIONAL_CONTACT_TYPES: OperationalContactTypeSpec[] = [
  { id: "scheduler", label: "Scheduler", roleType: "scheduler", relationshipType: "scheduler" },
  { id: "office_staff", label: "Office staff", roleType: "office_manager", relationshipType: "office_manager" },
  { id: "clinical_staff", label: "Clinical staff", roleType: "nurse", relationshipType: "works_with" },
  { id: "admin", label: "Admin", roleType: "admin", relationshipType: "works_with" },
  { id: "materials", label: "Materials management", roleType: "purchasing", relationshipType: "purchasing_contact" },
  {
    id: "vendor_credentialing",
    label: "Vendor credentialing",
    roleType: "admin",
    relationshipType: "works_with",
  },
  { id: "provider", label: "Provider", roleType: "surgeon", relationshipType: "works_with" },
  { id: "other", label: "Other", roleType: "other", relationshipType: "other" },
];

export const WORKFLOW_RESPONSIBILITIES: { id: WorkflowResponsibilityId; label: string }[] = [
  { id: "observation_scheduling_owner", label: "Observation scheduling" },
  { id: "approval_contact", label: "Vendor approval" },
  { id: "credentialing_contact", label: "Credentialing contact" },
  { id: "clinical_champion", label: "Clinical champion" },
  { id: "product_evaluator", label: "Product evaluator" },
  { id: "case_coordination", label: "Case coordination" },
  { id: "decision_influence", label: "Decision influence" },
  { id: "vendor_access", label: "Vendor / facility access" },
];

export const TITLE_SUGGESTIONS: Record<OperationalContactTypeId, string[]> = {
  scheduler: ["Scheduler", "OR Scheduler", "Central Scheduling", "Service Line Coordinator"],
  office_staff: ["Office Manager", "Surgery Coordinator", "Practice Administrator", "Medical Assistant"],
  clinical_staff: ["RN First Assist", "Clinical Liaison", "OR Nurse", "Physician Assistant"],
  admin: ["OR Manager", "Facility Administrator", "Director of Operations", "Service Line Director"],
  materials: ["Materials Manager", "Supply Chain Coordinator", "OR Materials Specialist"],
  vendor_credentialing: ["Credentialing Specialist", "Vendor Access Coordinator", "Compliance Admin"],
  provider: ["Surgeon", "Attending Physician", "Medical Director"],
  other: ["Coordinator", "Contact", "Staff"],
};

const PROVIDER_OFFICE_SCHEDULING_TYPES: OperationalContactTypeId[] = [
  "office_staff",
  "scheduler",
  "clinical_staff",
  "admin",
  "other",
];

const FACILITY_SCHEDULING_TYPES: OperationalContactTypeId[] = [
  "scheduler",
  "admin",
  "clinical_staff",
  "materials",
  "other",
];

const FACILITY_ROLE_TYPES = new Set([
  "scheduler",
  "admin",
  "purchasing",
  "nurse",
  "assistant",
]);

const PROVIDER_OFFICE_ROLE_TYPES = new Set([
  "office_manager",
  "scheduler",
  "assistant",
  "admin",
  "other",
]);

const PROVIDER_ROLE_TYPES = new Set(["surgeon", "physician_assistant"]);

const DEFAULT_WORKFLOW_BY_SIGNAL: Record<DiscoverySupportContactSignalId, WorkflowResponsibilityId[]> = {
  scheduling_owner: ["observation_scheduling_owner"],
  facility_vendor_pathway: ["credentialing_contact", "vendor_access"],
  clinical_champion: ["clinical_champion"],
};

const DEFAULT_CONTACT_TYPE_BY_SIGNAL: Record<DiscoverySupportContactSignalId, OperationalContactTypeId> = {
  scheduling_owner: "scheduler",
  facility_vendor_pathway: "vendor_credentialing",
  clinical_champion: "clinical_staff",
};

/** Contact types shown when selecting existing contacts (providers hidden by default). */
const COMPATIBLE_TYPES_BY_SIGNAL: Record<DiscoverySupportContactSignalId, OperationalContactTypeId[]> = {
  scheduling_owner: [...PROVIDER_OFFICE_SCHEDULING_TYPES],
  facility_vendor_pathway: ["vendor_credentialing", "admin", "office_staff", "materials", "other"],
  clinical_champion: ["clinical_staff", "provider", "office_staff", "other"],
};

export function compatibleContactTypesForSchedulingPath(
  path: SchedulingControlPathId | "",
  showProviders: boolean,
): OperationalContactTypeId[] {
  if (path === "facility") return [...FACILITY_SCHEDULING_TYPES];
  if (path === "provider_office") return [...PROVIDER_OFFICE_SCHEDULING_TYPES];
  if (path === "shared_workflow") return [...new Set([...PROVIDER_OFFICE_SCHEDULING_TYPES, ...FACILITY_SCHEDULING_TYPES])];
  return [...PROVIDER_OFFICE_SCHEDULING_TYPES];
}

export function defaultContactTypeForSchedulingPath(
  path: SchedulingControlPathId | "",
  slot: "provider" | "facility",
): OperationalContactTypeId {
  if (slot === "facility" || path === "facility") return "scheduler";
  return "office_staff";
}

export function operationalContactType(id: string): OperationalContactTypeSpec {
  return OPERATIONAL_CONTACT_TYPES.find((t) => t.id === id) ?? OPERATIONAL_CONTACT_TYPES.find((t) => t.id === "other")!;
}

export function workflowResponsibilityLabel(id: string): string {
  return WORKFLOW_RESPONSIBILITIES.find((r) => r.id === id)?.label ?? id.replace(/_/g, " ");
}

export function workflowResponsibilityLabels(ids: string[]): string[] {
  return dedupeWorkflowResponsibilities(ids).map(workflowResponsibilityLabel);
}

/** Keep one canonical responsibility per id; normalize legacy duplicates in draft state. */
export function dedupeWorkflowResponsibilities<T extends string>(ids: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const id of ids) {
    const key = id.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(id);
  }
  return out;
}

export function defaultWorkflowResponsibilitiesForSignal(
  signalId: DiscoverySupportContactSignalId,
): WorkflowResponsibilityId[] {
  return [...DEFAULT_WORKFLOW_BY_SIGNAL[signalId]];
}

export function defaultContactTypeForSignal(
  signalId: DiscoverySupportContactSignalId,
): OperationalContactTypeId {
  return DEFAULT_CONTACT_TYPE_BY_SIGNAL[signalId];
}

export function compatibleContactTypesForSignal(
  signalId: DiscoverySupportContactSignalId,
  showProviders: boolean,
  schedulingPath?: SchedulingControlPathId | "",
): OperationalContactTypeId[] {
  const base =
    signalId === "scheduling_owner" && schedulingPath
      ? compatibleContactTypesForSchedulingPath(schedulingPath, showProviders)
      : COMPATIBLE_TYPES_BY_SIGNAL[signalId];
  if (showProviders && !base.includes("provider")) {
    return [...base, "provider"];
  }
  if (!showProviders) {
    return base.filter((id) => id !== "provider");
  }
  return base;
}

export function contactRoleType(contact: Record<string, unknown>): string {
  return String(contact.role_type ?? "").trim();
}

export function isProviderContact(contact: Record<string, unknown>): boolean {
  return PROVIDER_ROLE_TYPES.has(contactRoleType(contact));
}

export function contactTypeIdFromRoleType(roleType: string): OperationalContactTypeId {
  const normalized = roleType.trim().toLowerCase();
  if (PROVIDER_ROLE_TYPES.has(normalized)) return "provider";
  if (normalized === "scheduler") return "scheduler";
  if (normalized === "office_manager") return "office_staff";
  if (normalized === "nurse" || normalized === "assistant") return "clinical_staff";
  if (normalized === "admin") return "admin";
  if (normalized === "purchasing") return "materials";
  return "other";
}

export function contactDisplayTitle(contact: Record<string, unknown>): string {
  return String(contact.title ?? "").trim();
}

export function contactTypeLabelForContact(contact: Record<string, unknown>): string {
  const explicit = String(contact.contact_type_label ?? "").trim();
  if (explicit) return explicit;
  return operationalContactType(contactTypeIdFromRoleType(contactRoleType(contact))).label;
}

function contactMatchesSchedulingSlot(input: {
  contact: Record<string, unknown>;
  slot: "provider" | "facility";
  organizationId?: string | null;
}): boolean {
  const role = contactRoleType(input.contact);
  const orgId = String(input.contact.organization_id ?? "").trim();
  const linkedOrg = input.organizationId ? orgId === input.organizationId : Boolean(orgId);

  if (input.slot === "provider") {
    if (isProviderContact(input.contact)) return false;
    return PROVIDER_OFFICE_ROLE_TYPES.has(role) || !linkedOrg;
  }

  return linkedOrg || FACILITY_ROLE_TYPES.has(role);
}

export function filterOperationalContactPool(input: {
  contacts: Record<string, unknown>[];
  signalId?: DiscoverySupportContactSignalId;
  showProviders: boolean;
  excludeContactId?: string;
  search?: string;
  schedulingPath?: SchedulingControlPathId | "";
  schedulingSlot?: "provider" | "facility";
  organizationId?: string | null;
}): Record<string, unknown>[] {
  const q = input.search?.trim().toLowerCase() ?? "";
  const compatibleTypes = input.signalId
    ? new Set(
        compatibleContactTypesForSignal(
          input.signalId,
          input.showProviders,
          input.schedulingPath,
        ),
      )
    : null;

  return input.contacts
    .filter((c) => {
      const id = String(c.id ?? "");
      if (input.excludeContactId && id === input.excludeContactId) return false;
      if (!input.showProviders && isProviderContact(c)) return false;
      if (compatibleTypes) {
        const typeId = contactTypeIdFromRoleType(contactRoleType(c));
        if (!compatibleTypes.has(typeId)) return false;
      }
      if (input.signalId === "scheduling_owner" && input.schedulingSlot) {
        return contactMatchesSchedulingSlot({
          contact: c,
          slot: input.schedulingSlot,
          organizationId: input.organizationId,
        });
      }
      return true;
    })
    .filter((c) => {
      if (!q) return true;
      const name = contactDisplayName(c as Parameters<typeof contactDisplayName>[0]).toLowerCase();
      const email = String(c.email ?? "").toLowerCase();
      const title = contactDisplayTitle(c).toLowerCase();
      const typeLabel = contactTypeLabelForContact(c).toLowerCase();
      return [name, email, title, typeLabel].some((v) => v.includes(q));
    })
    .slice(0, 12);
}

export function formatOperationalContactIntelligenceLine(input: {
  contact: Record<string, unknown>;
  jobTitle?: string;
  workflowResponsibilityIds: string[];
  notes?: string | null;
}): string {
  const name = contactDisplayName(input.contact as Parameters<typeof contactDisplayName>[0]);
  const title = (input.jobTitle || contactDisplayTitle(input.contact)).trim();
  const workflow = workflowResponsibilityLabels(input.workflowResponsibilityIds).join(", ");
  const email = String(input.contact.email ?? "").trim();
  const phone = String(input.contact.phone ?? input.contact.mobile_phone ?? "").trim();

  const segments = [name];
  if (title) segments.push(title);
  if (workflow) segments.push(workflow);
  if (email || phone) segments.push(email || phone);

  const base = segments.join(" · ").replace(/\s+/g, " ").trim();
  const note = String(input.notes ?? "").trim();
  if (!note) return base;
  return `${base} — ${note}`;
}

export function formatOperationalRelationshipNotes(input: {
  jobTitle?: string;
  workflowResponsibilityIds: string[];
  context?: string;
}): string {
  const workflow = workflowResponsibilityLabels(input.workflowResponsibilityIds).join(", ");
  const title = input.jobTitle?.trim();
  const parts = [
    workflow ? `Workflow: ${workflow}` : null,
    title ? `Title: ${title}` : null,
    input.context ?? null,
  ].filter(Boolean);
  return parts.join(" · ");
}
