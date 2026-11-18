import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { assignProviderSupportContact } from "@/lib/surgical-sales/assignProviderSupportContact";
import { confirmProviderCandidateContact, type CandidateContactIntelligence } from "@/lib/surgical-sales/candidateContactIntelligence";
import {
  SCHEDULING_OWNER_INTELLIGENCE_DB_KEY,
  buildSchedulerSupportContactDraft,
  emptySupportContactDraft,
} from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import type { RapidDiscoverySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import type {
  OperationalContactTypeId,
  SchedulingContactOwnershipType,
  WorkflowResponsibilityId,
} from "@/lib/surgical-sales/operationalSupportContact";

export function normalizePersonMatchKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function candidateContactInitials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? "" : "";
  return `${first}${last}`.toUpperCase() || "?";
}

export function candidateDbKey(candidate: CandidateContactIntelligence): string {
  const haystack = `${candidate.contact_role ?? ""} ${candidate.workflow_role ?? ""} ${candidate.source_quote ?? ""}`;
  if (/schedul|coordinator|calendar|case date/i.test(haystack)) {
    return SCHEDULING_OWNER_INTELLIGENCE_DB_KEY;
  }
  if (/credential|vendor access/i.test(haystack)) return "provider_credentialing_status";
  if (/champion|advocate|clinical/i.test(haystack)) return "provider_champion_potential";
  return "provider_or_team_dynamics";
}

function candidateOperationalDefaults(candidate: CandidateContactIntelligence): {
  contactTypeId: OperationalContactTypeId;
  workflowResponsibilities: WorkflowResponsibilityId[];
} {
  const haystack = `${candidate.contact_role ?? ""} ${candidate.workflow_role ?? ""} ${candidate.source_quote ?? ""}`;
  if (/schedul|coordinator|calendar|case date/i.test(haystack)) {
    return { contactTypeId: "scheduler", workflowResponsibilities: ["observation_scheduling_owner"] };
  }
  if (/credential|vendor access/i.test(haystack)) {
    return { contactTypeId: "vendor_credentialing", workflowResponsibilities: ["credentialing_contact"] };
  }
  if (/champion|advocate|clinical/i.test(haystack)) {
    return { contactTypeId: "clinical_staff", workflowResponsibilities: ["clinical_champion"] };
  }
  return { contactTypeId: "office_staff", workflowResponsibilities: ["case_coordination"] };
}

export function candidateDraftForScope(input: {
  candidate: CandidateContactIntelligence;
  organizationId?: string | null;
  ownershipType: SchedulingContactOwnershipType;
  contactName?: string;
  contactRole?: string;
  email?: string;
  phone?: string;
  notes?: string;
}): RapidDiscoverySupportContactDraft {
  const dbKey = candidateDbKey(input.candidate);
  const contactName = input.contactName?.trim() || input.candidate.contact_name;
  const contactRole = input.contactRole?.trim() || input.candidate.contact_role?.trim() || "";
  const base =
    dbKey === SCHEDULING_OWNER_INTELLIGENCE_DB_KEY
      ? buildSchedulerSupportContactDraft({
          organizationId: input.organizationId ?? null,
          initialMode: "create",
          prefillContactName: contactName,
        })
      : emptySupportContactDraft({
          dbKey,
          organizationId: input.organizationId ?? null,
          initialMode: "create",
        });
  const parts = contactName.trim().split(/\s+/).filter(Boolean);
  const operational = candidateOperationalDefaults(input.candidate);
  return {
    ...base,
    mode: "create",
    contactTypeId: operational.contactTypeId,
    workflowResponsibilities: operational.workflowResponsibilities,
    ownershipType: input.ownershipType,
    firstName: base.firstName || parts[0] || "",
    lastName: base.lastName || parts.slice(1).join(" "),
    jobTitle: contactRole || base.jobTitle,
    email: input.email?.trim() || "",
    phone: input.phone?.trim() || "",
    notes: input.notes?.trim() || input.candidate.source_quote?.trim() || base.notes,
  };
}

export function buildCandidateScopeOptions(input: {
  providerLabel: string;
  organizationName?: string | null;
  hasOrganization: boolean;
}): Array<{
  value: SchedulingContactOwnershipType;
  title: string;
  description: string;
}> {
  const orgLabel = input.organizationName || "the organization";
  const options: Array<{
    value: SchedulingContactOwnershipType;
    title: string;
    description: string;
  }> = [
    {
      value: "provider",
      title: "Provider only",
      description: `Saved to ${input.providerLabel}'s profile only.`,
    },
  ];
  if (input.hasOrganization) {
    options.push(
      {
        value: "shared",
        title: "Provider + organization",
        description: `Linked to ${input.providerLabel} and shared across ${orgLabel}.`,
      },
      {
        value: "organization",
        title: "Organization only",
        description: `Saved at the ${orgLabel} account level.`,
      },
    );
  }
  return options;
}

export async function saveAcceptedCandidateContact(input: {
  providerId: string;
  candidate: CandidateContactIntelligence;
  scope: SchedulingContactOwnershipType;
  organizationId?: string | null;
  relatedContacts?: Record<string, unknown>[];
  contactPool?: Record<string, unknown>[];
  contactName?: string;
  contactRole?: string;
  email?: string;
  phone?: string;
  notes?: string;
}): Promise<Record<string, unknown>> {
  const contactName = input.contactName?.trim() || input.candidate.contact_name;
  const contactRole = input.contactRole?.trim() || input.candidate.contact_role || "";
  const candidate: CandidateContactIntelligence = {
    ...input.candidate,
    contact_name: contactName,
    contact_role: contactRole,
  };

  const existingSameName = [...(input.relatedContacts ?? []), ...(input.contactPool ?? [])].find(
    (row) => normalizePersonMatchKey(contactDisplayName(row)) === normalizePersonMatchKey(contactName),
  );

  const draftBase = candidateDraftForScope({
    candidate,
    organizationId: input.organizationId ?? null,
    ownershipType: input.scope,
    contactName,
    contactRole,
    email: input.email,
    phone: input.phone,
    notes: input.notes,
  });
  const draft = existingSameName
    ? {
        ...draftBase,
        mode: "select" as const,
        selectedContactId: String(existingSameName.id ?? ""),
      }
    : draftBase;

  const { provider, linked } = await assignProviderSupportContact({
    providerId: input.providerId,
    dbKey: candidateDbKey(candidate),
    draft,
    sourceLabel: "Contact intelligence",
    validate: true,
  });

  await confirmProviderCandidateContact({
    providerId: input.providerId,
    candidateId: candidate.id,
    linkedContactId: String(linked.contact.id ?? "").trim() || null,
  });

  return provider;
}
