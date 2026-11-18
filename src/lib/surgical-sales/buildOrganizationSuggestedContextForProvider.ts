/**
 * Suggested organization context for a provider — reusable facility intelligence only.
 */

import {
  ORGANIZATION_INTELLIGENCE_FIELD_DEFS,
  type OrganizationIntelligenceFieldDef,
} from "@/lib/surgical-sales/organizationIntelligenceFields";
import {
  readOrganizationInheritanceFromContact,
  type OrganizationInheritanceStance,
} from "@/lib/surgical-sales/organizationIntelligenceInheritance";
import { providerMatchesOrganizationBaseline } from "@/lib/surgical-sales/organizationIntelligenceDiscovery";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  readProviderCommercialIntelligence,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import type {
  OrganizationIntelligenceBaseline,
  OrganizationSupportContactBaseline,
} from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import {
  ORGANIZATION_SUGGESTED_CONTEXT_LABELS,
  type IntelligenceConfirmationStatus,
  type ScopedIntelligenceItem,
} from "@/lib/surgical-sales/scopedIntelligenceItemModel";
import { isProviderSpecificIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceScopeClassification";
import {
  isEligibleOrganizationSuggestion,
} from "@/lib/surgical-sales/organizationIntelligenceReusableFilter";
import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";
import { isCredentialingWorkflowComplete } from "@/lib/surgical-sales/observationAccessWorkflowState";

export type OrganizationSuggestedContextAction = {
  id: "confirm" | "not_applicable" | "view_organization";
  label: string;
  dbKey?: string;
  stance?: OrganizationInheritanceStance;
  linkedContactId?: string | null;
  workflowRole?: string | null;
  relationshipType?: string | null;
  organizationHref?: string | null;
};

export type OrganizationSuggestedContextItem = {
  intelligenceId: string;
  kind: "support_contact" | "access_process" | "facility_context" | "scheduling_workflow";
  title: string;
  /** Human-readable card copy; falls back to detailLine in the UI when omitted. */
  cardDescription?: string;
  detailLine: string;
  statusLabels: string[];
  confirmationStatus: IntelligenceConfirmationStatus;
  scopedItem: ScopedIntelligenceItem;
  actions: OrganizationSuggestedContextAction[];
  /** Value persisted when confirming organization inheritance. */
  confirmBaselineValue?: string;
};

export type OrganizationSuggestedContextView = {
  panelTitle: string;
  panelSubtext: string;
  organizationId: string | null;
  organizationName: string;
  organizationHref: string | null;
  suggestedItems: OrganizationSuggestedContextItem[];
  hasSuggestions: boolean;
};

const ORG_ONLY_FIELD_DEFS = ORGANIZATION_INTELLIGENCE_FIELD_DEFS.filter((f) => f.scope === "organization");

const FIELD_KIND: Record<string, OrganizationSuggestedContextItem["kind"]> = {
  provider_credentialing_status: "access_process",
  provider_observation_credentialing_needed: "access_process",
  provider_credentialing_platform_name: "access_process",
  provider_credentialing_contact: "access_process",
  provider_credentialing_approval_contact: "access_process",
  provider_credentialing_renewal_notes: "access_process",
  provider_credentialing_required_documents: "access_process",
  provider_credentialing_facility_instructions: "access_process",
  provider_observation_access_path: "access_process",
  provider_facility_logistics_notes: "access_process",
  provider_observation_coordinator_contact: "scheduling_workflow",
  provider_facility_scheduling_contact: "scheduling_workflow",
  provider_observation_best_days_case_types: "scheduling_workflow",
  provider_or_team_dynamics: "facility_context",
  provider_preference_card_signals: "facility_context",
  provider_current_vendors: "facility_context",
  provider_support_expectations: "facility_context",
  provider_facility_spd_tray_behavior: "facility_context",
  provider_facility_room_turnover_patterns: "facility_context",
};

const CREDENTIALING_SUGGESTION_DB_KEYS = new Set([
  "provider_credentialing_status",
  "provider_observation_credentialing_needed",
]);

const SUPPORT_CONTACT_SUGGESTION_FIELD_KEYS = [
  "provider_facility_scheduling_contact",
  "provider_observation_coordinator_contact",
] as const;

function fieldIsCompletedCredentialingSuggestion(input: {
  dbKey: string;
  baselineFields: OrganizationIntelligenceBaseline["fields"];
}): boolean {
  if (!CREDENTIALING_SUGGESTION_DB_KEYS.has(input.dbKey)) return false;
  if (
    input.dbKey === "provider_observation_credentialing_needed" &&
    input.baselineFields.provider_credentialing_status
  ) {
    return false;
  }
  return isCredentialingWorkflowComplete({
    provider_credentialing_status:
      input.baselineFields.provider_credentialing_status?.value ??
      input.baselineFields.provider_credentialing_status?.displayLine ??
      "",
    provider_observation_credentialing_needed:
      input.baselineFields.provider_observation_credentialing_needed?.value ??
      input.baselineFields.provider_observation_credentialing_needed?.displayLine ??
      "",
  });
}

function statusLabelsFor(confirmationStatus: IntelligenceConfirmationStatus): string[] {
  if (confirmationStatus === "confirmed_for_provider") {
    return [
      ORGANIZATION_SUGGESTED_CONTEXT_LABELS.confirmedForProvider,
      ORGANIZATION_SUGGESTED_CONTEXT_LABELS.organizationLevel,
    ];
  }
  if (confirmationStatus === "not_applicable_to_provider") {
    return [ORGANIZATION_SUGGESTED_CONTEXT_LABELS.notApplicable];
  }
  return [
    ORGANIZATION_SUGGESTED_CONTEXT_LABELS.suggestedFrom,
    ORGANIZATION_SUGGESTED_CONTEXT_LABELS.needsConfirmation,
    ORGANIZATION_SUGGESTED_CONTEXT_LABELS.organizationLevel,
  ];
}

function resolveFieldConfirmationStatus(input: {
  contact: Record<string, unknown>;
  dbKey: string;
  baselineValue: string;
}): IntelligenceConfirmationStatus {
  const inheritance = readOrganizationInheritanceFromContact(input.contact, input.dbKey);
  if (inheritance?.stance === "does_not_apply") return "not_applicable_to_provider";
  if (inheritance?.stance === "applies" || inheritance?.stance === "exception") {
    return "confirmed_for_provider";
  }

  const providerRaw = String(input.contact[input.dbKey] ?? "").trim();
  if (
    fieldHasIntelligenceSignal(input.dbKey, providerRaw) &&
    providerMatchesOrganizationBaseline(input.dbKey, providerRaw, input.baselineValue)
  ) {
    return "confirmed_for_provider";
  }

  return "suggested";
}

function resolveSupportContactConfirmationStatus(input: {
  contact: Record<string, unknown>;
  supportContact: OrganizationSupportContactBaseline;
  relatedContacts: Array<Record<string, unknown>>;
}): IntelligenceConfirmationStatus {
  const nameKey = input.supportContact.contactName.trim().toLowerCase();
  if (!nameKey) return "suggested";

  const commercial = readProviderCommercialIntelligence(input.contact);
  const linked = commercial?.support_contacts.some(
    (sc) =>
      sc.scope === "provider" &&
      sc.contact_name.trim().toLowerCase() === nameKey &&
      (sc.linked_contact_id === input.supportContact.contactId || !input.supportContact.contactId),
  );
  if (linked) return "confirmed_for_provider";

  const schedulerKeys = [
    "provider_facility_scheduling_contact",
    "provider_observation_coordinator_contact",
  ] as const;
  for (const dbKey of schedulerKeys) {
    const inheritance = readOrganizationInheritanceFromContact(input.contact, dbKey);
    if (inheritance?.stance === "does_not_apply") {
      const dismissedText = [
        inheritance.facility_value,
        inheritance.facility_display_line,
      ]
        .map((value) => String(value ?? "").trim().toLowerCase())
        .filter(Boolean)
        .join(" ");
      if (dismissedText.includes(nameKey)) return "not_applicable_to_provider";
      continue;
    }
    if (inheritance?.stance === "applies" || inheritance?.stance === "exception") {
      const appliedText = [
        input.contact[dbKey],
        inheritance.facility_value,
        inheritance.facility_display_line,
      ]
        .map((value) => String(value ?? "").trim().toLowerCase())
        .filter(Boolean)
        .join(" ");
      if (appliedText.includes(nameKey)) return "confirmed_for_provider";
    }
  }

  return "suggested";
}

function relatedContactName(row: Record<string, unknown>): string {
  return `${String(row.first_name ?? "")} ${String(row.last_name ?? "")}`.trim().toLowerCase();
}

function resolveExistingSupportContactId(
  supportContact: OrganizationSupportContactBaseline,
  relatedContacts: Array<Record<string, unknown>>,
): string | null {
  const existingId = supportContact.contactId?.trim();
  if (existingId) return existingId;

  const nameKey = supportContact.contactName.trim().toLowerCase();
  if (!nameKey) return null;

  for (const rel of relatedContacts) {
    if (relatedContactName(rel) !== nameKey) continue;
    const id = String(rel.id ?? "").trim();
    if (id) return id;
  }

  return null;
}

function nameFromSchedulingContactLine(raw: string): string {
  return raw
    .split(/[|(]/)[0]
    ?.split(/\s+[—-]\s+/)[0]
    ?.split(/\s+·\s+/)[0]
    ?.trim() ?? "";
}

function roleFromSchedulingContactLine(raw: string): string | null {
  const parenthetical = raw.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (parenthetical) return parenthetical;
  const parts = raw.split(/\s+[—-]\s+|\s+·\s+/).map((part) => part.trim()).filter(Boolean);
  return parts[1] ?? null;
}

function supportContactFromSchedulingField(input: {
  field?: OrganizationIntelligenceBaseline["fields"][string];
  relatedContacts: Array<Record<string, unknown>>;
}): OrganizationSupportContactBaseline | null {
  const rawValue = input.field?.value?.trim() ?? "";
  const displayLine = input.field?.displayLine?.trim() ?? "";
  if (!rawValue && !displayLine) return null;

  const structuredParts = rawValue.includes("|")
    ? rawValue.split("|").map((part) => part.trim()).filter(Boolean)
    : [];
  const structuredId = structuredParts.length >= 2 ? structuredParts[0] ?? null : null;
  const structuredName = structuredParts.length >= 2 ? structuredParts[1] ?? "" : "";
  const contactName = structuredName || nameFromSchedulingContactLine(displayLine || rawValue);
  if (!contactName) return null;

  const draft: OrganizationSupportContactBaseline = {
    contactId: structuredId,
    contactName,
    contactRole: roleFromSchedulingContactLine(displayLine || rawValue) ?? "scheduler",
    workflowRole: "observation_scheduling_owner",
    contributorCount: input.field?.contributorCount ?? 1,
  };
  const linkedContactId = resolveExistingSupportContactId(draft, input.relatedContacts);
  if (!linkedContactId) return null;

  return { ...draft, contactId: linkedContactId };
}

function buildFieldSuggestionTitle(def: OrganizationIntelligenceFieldDef, displayLine?: string): string {
  if (def.dbKey.includes("credentialing")) {
    if (displayLine && /\b(?:credentialing\s+)?(?:complete|completed|cleared|not required)\b/i.test(displayLine)) {
      return "Facility Credentialing Complete";
    }
    return ORGANIZATION_SUGGESTED_CONTEXT_LABELS.credentialingTitle;
  }
  if (def.dbKey.includes("access_path") || def.dbKey.includes("logistics")) {
    return ORGANIZATION_SUGGESTED_CONTEXT_LABELS.observationAccessTitle;
  }
  if (def.dbKey.includes("scheduling") || def.dbKey.includes("coordinator")) {
    return "OR scheduling workflow known";
  }
  if (
    def.dbKey === "provider_or_team_dynamics" &&
    displayLine &&
    /robotic|da vinci|intuitive/i.test(displayLine)
  ) {
    return "Robotic program noted";
  }
  if (def.dbKey.includes("vendor") || def.dbKey.includes("preference_card")) {
    return "Facility commercial context noted";
  }
  if (def.dbKey.includes("spd") || def.dbKey.includes("turnover") || def.dbKey.includes("or_team")) {
    return "Facility workflow context noted";
  }
  return `${def.label} noted at facility level`;
}

function buildFieldSuggestionDescription(
  def: OrganizationIntelligenceFieldDef,
  organizationName: string,
  displayLine?: string,
): string | undefined {
  if (def.dbKey.includes("credentialing")) {
    if (displayLine && /complete|completed|cleared|not required/i.test(displayLine)) {
      return `${organizationName} appears to have a completed credentialing path.`;
    }
    return `${organizationName} appears to require credentialing for visitors or device representatives.`;
  }
  if (def.dbKey.includes("access_path") || def.dbKey.includes("logistics")) {
    return `${organizationName} appears to have an established process for obtaining observation access.`;
  }
  return undefined;
}

function buildSupportContactTitle(contact: OrganizationSupportContactBaseline): string {
  const role = supportContactRoleLabel(contact);
  return `${role} suggested: ${contact.contactName}`;
}

function humanizeSupportContactRole(raw?: string | null): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  const normalized = value.toLowerCase().replace(/[_-]+/g, " ");
  if (/observation.*scheduling|scheduling.*owner|scheduler/.test(normalized)) {
    return "Observation scheduling contact";
  }
  if (/credential|vendor access/.test(normalized)) return "Credentialing contact";
  if (/or.*coordinator|coordinator/.test(normalized)) return "OR coordinator";
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function supportContactRoleLabel(contact: OrganizationSupportContactBaseline): string {
  return (
    humanizeSupportContactRole(contact.contactRole) ||
    humanizeSupportContactRole(contact.workflowRole) ||
    "Support contact"
  );
}

function buildActions(input: {
  confirmationStatus: IntelligenceConfirmationStatus;
  dbKey?: string;
  linkedContactId?: string | null;
  workflowRole?: string | null;
  relationshipType?: string | null;
  organizationHref: string | null;
}): OrganizationSuggestedContextAction[] {
  const actions: OrganizationSuggestedContextAction[] = [];
  if (input.confirmationStatus === "suggested" && input.dbKey) {
    actions.push({
      id: "confirm",
      label: ORGANIZATION_SUGGESTED_CONTEXT_LABELS.confirmForProvider,
      dbKey: input.dbKey,
      stance: "applies",
      linkedContactId: input.linkedContactId,
      workflowRole: input.workflowRole,
      relationshipType: input.relationshipType,
    });
    actions.push({
      id: "not_applicable",
      label: ORGANIZATION_SUGGESTED_CONTEXT_LABELS.notApplicableAction,
      dbKey: input.dbKey,
      stance: "does_not_apply",
    });
  }
  if (input.organizationHref) {
    actions.push({
      id: "view_organization",
      label: ORGANIZATION_SUGGESTED_CONTEXT_LABELS.viewOrganizationDetails,
      organizationHref: input.organizationHref,
    });
  }
  return actions;
}

function supportContactToScopedItem(input: {
  contact: OrganizationSupportContactBaseline;
  organizationId: string | null;
  providerId: string;
  confirmationStatus: IntelligenceConfirmationStatus;
}): ScopedIntelligenceItem {
  return {
    intelligenceId: `org-support-${input.contact.contactName.toLowerCase().replace(/\s+/g, "-")}`,
    scope:
      input.confirmationStatus === "confirmed_for_provider"
        ? "provider_organization_confirmed"
        : "organization",
    organizationId: input.organizationId,
    providerId: input.providerId,
    sourceProviderId: null,
    sourceCaseId: null,
    confidence: input.contact.contributorCount >= 2 ? "high" : "medium",
    confirmationStatus: input.confirmationStatus,
    sourceType: "organization_profile",
    isClinicalProviderSpecific: false,
    isOperationalReusable: true,
    label: input.contact.contactRole ?? "Support contact",
    displayLine: input.contact.contactName,
    linkedContactId: input.contact.contactId,
  };
}

function fieldToScopedItem(input: {
  def: OrganizationIntelligenceFieldDef;
  displayLine: string;
  organizationId: string | null;
  providerId: string;
  confirmationStatus: IntelligenceConfirmationStatus;
  contributorCount: number;
}): ScopedIntelligenceItem {
  return {
    intelligenceId: `org-field-${input.def.dbKey}`,
    scope:
      input.confirmationStatus === "confirmed_for_provider"
        ? "provider_organization_confirmed"
        : "organization",
    organizationId: input.organizationId,
    providerId: input.providerId,
    sourceProviderId: null,
    sourceCaseId: null,
    confidence: input.contributorCount >= 2 ? "high" : "medium",
    confirmationStatus: input.confirmationStatus,
    sourceType: "organization_profile",
    isClinicalProviderSpecific: false,
    isOperationalReusable: true,
    label: input.def.label,
    displayLine: input.displayLine,
    dbKey: input.def.dbKey,
  };
}

export function buildOrganizationSuggestedContextForProvider(input: {
  contact: Record<string, unknown>;
  providerId: string;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  relatedContacts?: Array<Record<string, unknown>>;
}): OrganizationSuggestedContextView {
  const baseline = input.organizationBaseline;
  const organizationName = baseline?.organizationName?.trim() || "this facility";
  const organizationId = baseline?.organizationId?.trim() || null;
  const organizationHref = organizationId
    ? `/portal/sales/accounts/${encodeURIComponent(organizationId)}`
    : null;
  const panelTitle = ORGANIZATION_SUGGESTED_CONTEXT_LABELS.panelTitle;
  const panelSubtext = ORGANIZATION_SUGGESTED_CONTEXT_LABELS.panelSubtext;

  if (isProviderSalesCustomer(input.contact)) {
    return {
      panelTitle,
      panelSubtext,
      organizationId,
      organizationName,
      organizationHref,
      suggestedItems: [],
      hasSuggestions: false,
    };
  }

  if (
    !baseline ||
    (Object.keys(baseline.fields ?? {}).length === 0 && (baseline.supportContacts ?? []).length === 0)
  ) {
    return {
      panelTitle,
      panelSubtext,
      organizationId,
      organizationName,
      organizationHref,
      suggestedItems: [],
      hasSuggestions: false,
    };
  }

  const suggestedItems: OrganizationSuggestedContextItem[] = [];
  const suggestedSupportContactKeys = new Set<string>();

  for (const def of ORG_ONLY_FIELD_DEFS) {
    if (isProviderSpecificIntelligenceDbKey(def.dbKey)) continue;
    if (
      !fieldIsCompletedCredentialingSuggestion({
        dbKey: def.dbKey,
        baselineFields: baseline.fields,
      })
    ) {
      continue;
    }

    const baselineField = baseline.fields[def.dbKey];
    if (!baselineField) continue;
    if (
      !isEligibleOrganizationSuggestion(def.dbKey, baselineField.value, baselineField.displayLine)
    ) {
      continue;
    }

    const confirmationStatus = resolveFieldConfirmationStatus({
      contact: input.contact,
      dbKey: def.dbKey,
      baselineValue: baselineField.value,
    });

    if (confirmationStatus === "not_applicable_to_provider") continue;

    const kind = FIELD_KIND[def.dbKey] ?? "facility_context";
    const scopedItem = fieldToScopedItem({
      def,
      displayLine: baselineField.displayLine,
      organizationId,
      providerId: input.providerId,
      confirmationStatus,
      contributorCount: baselineField.contributorCount,
    });

    suggestedItems.push({
      intelligenceId: scopedItem.intelligenceId,
      kind,
      title: buildFieldSuggestionTitle(def, baselineField.displayLine),
      cardDescription: buildFieldSuggestionDescription(def, organizationName, baselineField.displayLine),
      detailLine: baselineField.displayLine,
      statusLabels: statusLabelsFor(confirmationStatus),
      confirmationStatus,
      scopedItem,
      confirmBaselineValue: baselineField.value,
      actions: buildActions({ confirmationStatus, dbKey: def.dbKey, organizationHref }),
    });
  }

  const pushSupportContactSuggestion = (supportContact: OrganizationSupportContactBaseline) => {
    const linkedContactId = resolveExistingSupportContactId(
      supportContact,
      input.relatedContacts ?? [],
    );
    if (!linkedContactId) return;
    const resolvedSupportContact: OrganizationSupportContactBaseline = {
      ...supportContact,
      contactId: linkedContactId,
    };
    const supportContactKey = resolvedSupportContact.contactName.trim().toLowerCase();
    if (!supportContactKey || suggestedSupportContactKeys.has(supportContactKey)) return;
    const confirmationStatus = resolveSupportContactConfirmationStatus({
      contact: input.contact,
      supportContact: resolvedSupportContact,
      relatedContacts: input.relatedContacts ?? [],
    });
    if (confirmationStatus === "not_applicable_to_provider") return;

    const scopedItem = supportContactToScopedItem({
      contact: resolvedSupportContact,
      organizationId,
      providerId: input.providerId,
      confirmationStatus,
    });

    const roleLine = supportContactRoleLabel(resolvedSupportContact);

    const schedulingBaseline =
      baseline.fields.provider_facility_scheduling_contact ??
      baseline.fields.provider_observation_coordinator_contact;

    suggestedSupportContactKeys.add(supportContactKey);
    suggestedItems.push({
      intelligenceId: scopedItem.intelligenceId,
      kind: "support_contact",
      title: buildSupportContactTitle(resolvedSupportContact),
      detailLine: roleLine,
      statusLabels: statusLabelsFor(confirmationStatus),
      confirmationStatus,
      scopedItem,
      confirmBaselineValue: schedulingBaseline?.value,
      actions: buildActions({
        confirmationStatus,
        dbKey: "provider_facility_scheduling_contact",
        linkedContactId: resolvedSupportContact.contactId,
        workflowRole: resolvedSupportContact.workflowRole ?? "observation_scheduling_owner",
        relationshipType: "scheduler",
        organizationHref,
      }),
    });
  };

  for (const supportContact of baseline.supportContacts ?? []) {
    pushSupportContactSuggestion(supportContact);
  }

  for (const dbKey of SUPPORT_CONTACT_SUGGESTION_FIELD_KEYS) {
    const supportContact = supportContactFromSchedulingField({
      field: baseline.fields[dbKey],
      relatedContacts: input.relatedContacts ?? [],
    });
    if (supportContact) pushSupportContactSuggestion(supportContact);
  }

  const visibleSuggestions = suggestedItems.filter(
    (item) => item.confirmationStatus === "suggested",
  );

  return {
    panelTitle,
    panelSubtext,
    organizationId,
    organizationName,
    organizationHref,
    suggestedItems: visibleSuggestions,
    hasSuggestions: visibleSuggestions.length > 0,
  };
}

/** Returns false when peer provider product usage must not appear on a new provider profile. */
export function peerProviderProductShouldNotCopyToNewProvider(input: {
  peerContact: Record<string, unknown>;
  newProviderContact: Record<string, unknown>;
}): boolean {
  const peerProducts = String(input.peerContact.provider_competitive_products ?? "").trim();
  if (!peerProducts) return true;

  const orgVendors = String(input.newProviderContact.provider_current_vendors ?? "").trim();
  const isHospitalWide =
    fieldHasIntelligenceSignal("provider_current_vendors", orgVendors) &&
    /facility|hospital|site|all surgeons|formulary/i.test(orgVendors);

  return !isHospitalWide;
}

/** Observation approval from a peer must not inherit to a new provider. */
export function peerObservationApprovalShouldNotCopy(input: {
  peerContact: Record<string, unknown>;
}): boolean {
  const commercial = readProviderCommercialIntelligence(input.peerContact);
  if (commercial?.observation.approval_status === "approved") return true;
  const feasibility = String(input.peerContact.provider_observation_feasibility ?? "").trim();
  return /approval:\s*(yes|approved|confirmed)/i.test(feasibility);
}

/** Case-specific workflow findings must not promote unless explicitly facility-wide. */
export function caseFindingShouldNotPromoteToOrganization(input: {
  text: string;
  dbKey?: string | null;
}): boolean {
  const dbKey = String(input.dbKey ?? "").trim();
  if (dbKey === "provider_workflow_pain_points" || dbKey === "provider_clinical_frustrations") {
    return !/\bfacility|hospital|site|all surgeons|OR team\b/i.test(input.text);
  }
  return true;
}
