/**
 * Unified provider credentialing — discovery intelligence + execution workflow share one model.
 */

import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  FACILITY_CREDENTIALING_FIELD_KEYS,
  facilityCredentialingDraftFromContact,
  facilityCredentialingDraftFromMappingMetadata,
  facilityCredentialingDraftHasSignal,
  facilityCredentialingMappingMetadataFromDraft,
  type FacilityCredentialingDraft,
} from "@/lib/surgical-sales/facilityCredentialingFields";
import {
  buildFacilityCredentialingStatusValue,
  formatFacilityCredentialingSummaryLine,
} from "@/lib/surgical-sales/facilityCredentialingIntelligence";
import {
  OBSERVATION_CREDENTIALING_NEEDED_DB_KEY,
  PROVIDER_CREDENTIALING_STATUS_DB_KEY,
} from "@/lib/surgical-sales/observationAccessWorkflowState";

export {
  FACILITY_CREDENTIALING_FIELD_KEYS,
  facilityCredentialingDraftFromContact,
  facilityCredentialingDraftFromMappingMetadata,
  facilityCredentialingDraftHasSignal,
  facilityCredentialingMappingMetadataFromDraft,
  type FacilityCredentialingDraft,
} from "@/lib/surgical-sales/facilityCredentialingFields";

export type ProviderCredentialingRequirementStatus =
  | "unknown"
  | "not_required"
  | "required"
  | "conditional";

export type ProviderCredentialingWorkflowStatus =
  | "not_started"
  | "required"
  | "in_progress"
  | "submitted"
  | "completed"
  | "not_required";

export type FacilityVendorPathwayChoice =
  | "path_clear"
  | "partial_path"
  | "required_pending"
  | "unknown"
  | "";

export type ProviderCredentialing = {
  structured: FacilityCredentialingDraft;
  requirementStatus: ProviderCredentialingRequirementStatus;
  workflowStatus: ProviderCredentialingWorkflowStatus;
  pathwayChoice: FacilityVendorPathwayChoice;
  approvalRequired: boolean | null;
  intelligenceSummary: string;
  targetDate: string;
  discoveredSourceLabel: string | null;
};

const TARGET_DATE_RE = /\[target_date:([^\]]+)\]/i;
const TARGET_DATE_LINE_RE = /target completion:\s*(\d{4}-\d{2}-\d{2})/i;

export const PROVIDER_CREDENTIALING_METADATA_KEYS = {
  approvalRequired: "approval_required",
  intelligenceNotes: "intelligence_notes",
  pathwayChoice: "pathway_choice",
} as const;

export type CredentialingDrawerStatus =
  | "required"
  | "in_progress"
  | "submitted"
  | "cleared"
  | "not_required";

function fieldToken(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "")
    .trim()
    .toLowerCase();
}

export function workflowTokenFromDrawerStatus(status: CredentialingDrawerStatus): string {
  if (status === "cleared") return "cleared";
  if (status === "not_required") return "not_required";
  return status;
}

export function drawerStatusFromWorkflowToken(token: string): CredentialingDrawerStatus {
  const t = token.trim().toLowerCase();
  if (t === "cleared" || t === "complete" || t === "completed") return "cleared";
  if (t === "not_required") return "not_required";
  if (t === "submitted") return "submitted";
  if (t === "in_progress") return "in_progress";
  if (t === "required" || t === "blocked") return "required";
  return "required";
}

export function workflowTokenFromPathwayChoice(choice: string): string | null {
  switch (choice) {
    case "path_clear":
      return "cleared";
    case "partial_path":
    case "required_pending":
      return "in_progress";
    case "unknown":
      return "unknown";
    default:
      return null;
  }
}

export function requirementStatusFromPathwayChoice(choice: string): ProviderCredentialingRequirementStatus {
  switch (choice) {
    case "path_clear":
      return "not_required";
    case "required_pending":
      return "required";
    case "partial_path":
      return "conditional";
    case "unknown":
      return "unknown";
    default:
      return "unknown";
  }
}

export function pathwayChoiceFromWorkflowToken(token: string): FacilityVendorPathwayChoice {
  const t = token.trim().toLowerCase();
  if (t === "not_required") return "path_clear";
  if (t === "required") return "required_pending";
  if (t === "in_progress" || t === "submitted") return "partial_path";
  if (t === "unknown") return "unknown";
  return "";
}

function workflowStatusSummary(status: CredentialingDrawerStatus): string {
  switch (status) {
    case "cleared":
      return "Credentialing complete";
    case "not_required":
      return "Credentialing not required";
    case "submitted":
      return "Credentialing submitted";
    case "in_progress":
      return "Credentialing in progress";
    case "required":
    default:
      return "Credentialing required";
  }
}

function parseTargetDateFromText(text: string): string {
  const blob = text.trim();
  if (!blob) return "";
  const bracket = blob.match(TARGET_DATE_RE)?.[1]?.trim();
  if (bracket) return bracket;
  const line = blob.match(TARGET_DATE_LINE_RE)?.[1]?.trim();
  return line ?? "";
}

function stripTargetDateMarkers(text: string): string {
  return text
    .replace(TARGET_DATE_RE, "")
    .replace(TARGET_DATE_LINE_RE, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function formatRenewalNotesWithTargetDate(notes: string, targetDate: string): string {
  const base = stripTargetDateMarkers(notes);
  const date = targetDate.trim();
  if (!date) return base;
  const marker = `[target_date:${date}]`;
  return base ? `${base}\n${marker}` : marker;
}

export function providerCredentialingWorkflowStatusFromToken(
  token: string,
): ProviderCredentialingWorkflowStatus {
  const t = token.trim().toLowerCase();
  if (!t) return "not_started";
  if (t === "cleared" || t === "complete" || t === "completed") return "completed";
  if (t === "not_required") return "not_required";
  if (t === "submitted") return "submitted";
  if (t === "in_progress") return "in_progress";
  if (t === "required" || t === "blocked") return "required";
  if (t === "unknown") return "not_started";
  return "in_progress";
}

export function providerCredentialingFromContact(
  contact: Record<string, unknown>,
): ProviderCredentialing {
  const structured = facilityCredentialingDraftFromContact(contact);
  const workflowToken = fieldToken(contact, OBSERVATION_CREDENTIALING_NEEDED_DB_KEY);
  const workflowStatus = providerCredentialingWorkflowStatusFromToken(workflowToken);
  const pathwayChoice = pathwayChoiceFromWorkflowToken(workflowToken);
  const explicitNotRequired = workflowToken === "not_required";
  const requirementStatus = pathwayChoice
    ? requirementStatusFromPathwayChoice(pathwayChoice)
    : explicitNotRequired
      ? "not_required"
      : workflowStatus === "required" || workflowStatus === "submitted"
          ? "required"
          : workflowStatus === "in_progress"
            ? "conditional"
            : "unknown";

  const renewalRaw = structured.renewalNotes;
  const targetDate = parseTargetDateFromText(renewalRaw);
  const meta = parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata);
  const platformMeta = meta[FACILITY_CREDENTIALING_FIELD_KEYS.platformName];
  const credMeta = meta[FACILITY_CREDENTIALING_FIELD_KEYS.credentialingContact];

  return {
    structured: {
      ...structured,
      renewalNotes: stripTargetDateMarkers(renewalRaw),
    },
    requirementStatus,
    workflowStatus,
    pathwayChoice,
    approvalRequired:
      structured.approvalContact.trim().length > 0
        ? true
        : explicitNotRequired
          ? false
          : pathwayChoice === "required_pending"
            ? true
            : null,
    intelligenceSummary: formatFacilityCredentialingSummaryLine(structured),
    targetDate,
    discoveredSourceLabel:
      platformMeta?.source_label ?? credMeta?.source_label ?? null,
  };
}

export function providerCredentialingFromMappingMetadata(
  metadata?: Record<string, string>,
  pathwayChoice: FacilityVendorPathwayChoice = "",
): ProviderCredentialing {
  const structured = facilityCredentialingDraftFromMappingMetadata(metadata);
  const notesFromMeta = metadata?.[PROVIDER_CREDENTIALING_METADATA_KEYS.intelligenceNotes]?.trim();
  if (notesFromMeta) {
    structured.renewalNotes = notesFromMeta;
  }

  const approvalRaw = metadata?.[PROVIDER_CREDENTIALING_METADATA_KEYS.approvalRequired]?.trim().toLowerCase();
  const approvalRequired =
    approvalRaw === "yes" ? true : approvalRaw === "no" ? false : null;

  const choice =
    (metadata?.[PROVIDER_CREDENTIALING_METADATA_KEYS.pathwayChoice]?.trim() as FacilityVendorPathwayChoice) ||
    pathwayChoice;

  return {
    structured,
    requirementStatus: choice ? requirementStatusFromPathwayChoice(choice) : "unknown",
    workflowStatus: choice
      ? providerCredentialingWorkflowStatusFromToken(workflowTokenFromPathwayChoice(choice) ?? "")
      : "not_started",
    pathwayChoice: choice,
    approvalRequired,
    intelligenceSummary: formatFacilityCredentialingSummaryLine(structured),
    targetDate: "",
    discoveredSourceLabel: null,
  };
}

export function providerCredentialingMappingMetadataFromCredentialing(
  model: ProviderCredentialing,
): Record<string, string> {
  return facilityCredentialingMappingMetadataFromDraft(model.structured, {
    approvalRequired:
      model.approvalRequired === true ? "yes" : model.approvalRequired === false ? "no" : "unknown",
    pathwayChoice: model.pathwayChoice,
  });
}

export function mergeDiscoveryCredentialingDraft(
  discovery: FacilityCredentialingDraft,
  contact: Record<string, unknown>,
): FacilityCredentialingDraft {
  const existing = facilityCredentialingDraftFromContact(contact);
  return {
    platformId: discovery.platformId || existing.platformId,
    platformName: discovery.platformName || existing.platformName,
    credentialingContact: discovery.credentialingContact || existing.credentialingContact,
    approvalContact: discovery.approvalContact || existing.approvalContact,
    renewalNotes: discovery.renewalNotes || existing.renewalNotes,
    requiredDocuments: existing.requiredDocuments,
    facilityInstructions: existing.facilityInstructions,
  };
}

export function buildProviderCredentialingDiscoveredIntelLines(
  model: ProviderCredentialing,
): string[] {
  const lines: string[] = [];
  if (model.structured.platformName.trim()) {
    lines.push(`Vendor platform: ${model.structured.platformName.trim()}`);
  }
  if (model.requirementStatus !== "unknown") {
    const reqLabel =
      model.requirementStatus === "not_required"
        ? "Not required"
        : model.requirementStatus === "required"
          ? "Required"
          : model.requirementStatus === "conditional"
            ? "Partial / conditional"
            : "Unknown";
    lines.push(`Credentialing requirement: ${reqLabel}`);
  }
  if (model.approvalRequired === true || model.structured.approvalContact.trim()) {
    lines.push(
      `Approval pathway: ${model.structured.approvalContact.trim() || "Facility approval required"}`,
    );
  } else if (model.approvalRequired === false) {
    lines.push("Approval pathway: Not required");
  }
  if (model.structured.credentialingContact.trim()) {
    lines.push(`Credentialing contact: ${model.structured.credentialingContact.trim()}`);
  }
  if (model.structured.renewalNotes.trim()) {
    lines.push(`Notes: ${model.structured.renewalNotes.trim()}`);
  }
  return lines;
}

export function buildProviderCredentialingPlanningPatch(input: {
  structured: FacilityCredentialingDraft;
  workflowToken?: string | null;
  pathwayChoice?: FacilityVendorPathwayChoice;
  statusSummary?: string | null;
  targetDate?: string;
  operationalNotes?: string;
}): Record<string, string | null> {
  const trim = (v: string) => v.trim() || null;
  const structured = input.structured;
  const renewalWithTarget = formatRenewalNotesWithTargetDate(
    input.operationalNotes?.trim() || structured.renewalNotes,
    input.targetDate ?? "",
  );

  const summary =
    input.statusSummary?.trim() ||
    buildFacilityCredentialingStatusValue(structured, input.pathwayChoice ?? "");

  const planning: Record<string, string | null> = {
    [FACILITY_CREDENTIALING_FIELD_KEYS.platformId]: trim(structured.platformId),
    [FACILITY_CREDENTIALING_FIELD_KEYS.platformName]: trim(structured.platformName),
    [FACILITY_CREDENTIALING_FIELD_KEYS.credentialingContact]: trim(structured.credentialingContact),
    [FACILITY_CREDENTIALING_FIELD_KEYS.approvalContact]: trim(structured.approvalContact),
    [FACILITY_CREDENTIALING_FIELD_KEYS.renewalNotes]: trim(renewalWithTarget) || null,
    [FACILITY_CREDENTIALING_FIELD_KEYS.requiredDocuments]: trim(structured.requiredDocuments),
    [FACILITY_CREDENTIALING_FIELD_KEYS.facilityInstructions]: trim(structured.facilityInstructions),
    [PROVIDER_CREDENTIALING_STATUS_DB_KEY]: summary || null,
  };

  const workflowToken =
    input.workflowToken ??
    (input.pathwayChoice ? workflowTokenFromPathwayChoice(input.pathwayChoice) : null);
  if (workflowToken) {
    planning[OBSERVATION_CREDENTIALING_NEEDED_DB_KEY] = workflowToken;
    planning[PROVIDER_CREDENTIALING_STATUS_DB_KEY] = workflowToken;
  }

  return planning;
}

/** Merge in-memory discovery mapping metadata onto a contact row for UI preview. */
export function contactWithCredentialingMappingMetadata(
  contact: Record<string, unknown>,
  metadata?: Record<string, string>,
): Record<string, unknown> {
  if (!metadata || Object.keys(metadata).length === 0) return contact;
  const draft = facilityCredentialingDraftFromMappingMetadata(metadata);
  const patch = buildProviderCredentialingPlanningPatch({ structured: draft });
  const next = { ...contact };
  for (const [key, value] of Object.entries(patch)) {
    if (value != null && String(value).trim()) {
      next[key] = value;
    }
  }
  return next;
}

export async function persistProviderCredentialing(input: {
  providerId: string;
  structured: FacilityCredentialingDraft;
  pathwayChoice?: FacilityVendorPathwayChoice;
  workflowStatus?: CredentialingDrawerStatus;
  notes?: string;
  targetDate?: string;
  sourceLabel: string;
  mergeFromContact?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const structured = input.mergeFromContact
    ? mergeDiscoveryCredentialingDraft(input.structured, input.mergeFromContact)
    : input.structured;

  const workflowToken = input.workflowStatus
    ? workflowTokenFromDrawerStatus(input.workflowStatus)
    : input.pathwayChoice
      ? workflowTokenFromPathwayChoice(input.pathwayChoice)
      : null;

  const note = input.notes?.trim();
  const statusSummary = input.workflowStatus
    ? workflowStatusSummary(input.workflowStatus)
    : buildFacilityCredentialingStatusValue(
        structured,
        input.pathwayChoice ?? "",
      );
  const statusValue = note ? `${statusSummary} · ${note}` : statusSummary;

  const planning = buildProviderCredentialingPlanningPatch({
    structured,
    workflowToken,
    pathwayChoice: input.pathwayChoice,
    statusSummary: statusValue,
    targetDate: input.targetDate,
    operationalNotes: note,
  });

  const validateFields = Object.entries(planning)
    .filter(([, value]) => Boolean(value && String(value).trim()))
    .map(([key]) => key);

  if (input.workflowStatus === "cleared") {
    validateFields.push("provider_observation_feasibility");
  }

  const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(input.providerId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planning,
      planning_capture_context: {
        source_type: "profile",
        source_label: input.sourceLabel,
      },
      intelligence_validate_fields: [...new Set(validateFields)],
    }),
  });

  const payload = (await res.json()) as {
    ok?: boolean;
    provider?: Record<string, unknown>;
    error?: string;
  };
  if (!res.ok || !payload.provider) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Could not save credentialing.");
  }
  return payload.provider;
}
