/**
 * Provider-level resolution of inherited facility intelligence.
 * Stored on contact field metadata — does not mutate other providers' values.
 */

import { ORGANIZATION_INTELLIGENCE_DB_KEYS } from "@/lib/surgical-sales/organizationIntelligenceFields";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { IntelligenceFieldAttribution } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { providerMatchesOrganizationBaseline } from "@/lib/surgical-sales/organizationIntelligenceDiscovery";
import { intelligenceMetadataFromContact } from "@/lib/surgical-sales/providerCreateWizard";

export type OrganizationInheritanceStance = "applies" | "does_not_apply" | "exception";

export type OrganizationInheritanceRecord = {
  stance: OrganizationInheritanceStance;
  /** Facility fact at time of resolution (for display; not written to other contacts). */
  facility_display_line?: string;
  facility_value?: string;
  resolved_at: string;
};

export const ORGANIZATION_INHERITANCE_LABELS = {
  appliesToProvider: "Applies to this provider",
  doesNotApply: "Does not apply",
  providerException: "Provider-specific exception",
  appliesHint: "Use the same facility rule for this surgeon.",
  doesNotApplyHint: "The hospital-wide rule does not apply to this provider — facility intelligence stays unchanged.",
  exceptionHint:
    "Capture how this provider differs. The hospital-wide rule is kept for other surgeons at this site.",
  facilityRulePrefix: "Hospital rule",
  providerExceptionPrefix: "Provider exception",
  doesNotApplyLine: "Does not apply to this provider",
} as const;

const ORG_KEY_SET = new Set<string>(ORGANIZATION_INTELLIGENCE_DB_KEYS);

export const ORGANIZATION_SCHEDULER_INHERITANCE_DB_KEYS = [
  "provider_facility_scheduling_contact",
  "provider_observation_coordinator_contact",
] as const;

export function isOrganizationInheritanceDbKey(dbKey: string): boolean {
  return ORG_KEY_SET.has(dbKey);
}

export function readOrganizationInheritance(
  metadata: Record<string, IntelligenceFieldAttribution> | null | undefined,
  dbKey: string,
): OrganizationInheritanceRecord | null {
  const row = metadata?.[dbKey]?.organization_inheritance;
  if (!row?.stance || !row.resolved_at) return null;
  return row;
}

export function readOrganizationInheritanceFromContact(
  contact: Record<string, unknown>,
  dbKey: string,
): OrganizationInheritanceRecord | null {
  return readOrganizationInheritance(intelligenceMetadataFromContact(contact), dbKey);
}

export function organizationInheritanceResolved(
  contact: Record<string, unknown>,
  dbKey: string,
): boolean {
  return readOrganizationInheritanceFromContact(contact, dbKey) !== null;
}

/** Provider confirmed this organization field applies to them (not rejected). */
export function isOrganizationInheritanceConfirmedForProvider(
  contact: Record<string, unknown>,
  dbKey: string,
): boolean {
  const inheritance = readOrganizationInheritanceFromContact(contact, dbKey);
  if (inheritance?.stance === "does_not_apply") return false;
  if (inheritance?.stance === "applies" || inheritance?.stance === "exception") {
    const raw = String(contact[dbKey] ?? "").trim();
    if (fieldHasIntelligenceSignal(dbKey, raw)) return true;
    if (inheritance.facility_value?.trim() || inheritance.facility_display_line?.trim()) {
      return true;
    }
  }
  return false;
}

/** Scheduler inherited from organization and confirmed for this provider. */
export function hasOrganizationSchedulerConfirmedForProvider(
  contact: Record<string, unknown>,
): boolean {
  return ORGANIZATION_SCHEDULER_INHERITANCE_DB_KEYS.some((dbKey) =>
    isOrganizationInheritanceConfirmedForProvider(contact, dbKey),
  );
}

/** Any operational organization inheritance confirmed for this provider. */
export function hasOrganizationOperationalInheritanceConfirmed(
  contact: Record<string, unknown>,
  dbKey: string,
): boolean {
  return isOrganizationInheritanceConfirmedForProvider(contact, dbKey);
}

export function formatProviderInheritanceDisplayLine(input: {
  stance: OrganizationInheritanceStance;
  facilityDisplayLine?: string;
  providerValue?: string;
  organizationName?: string;
}): string {
  const facility = input.facilityDisplayLine?.trim();
  const provider = input.providerValue?.trim();
  const org = input.organizationName?.trim();

  if (input.stance === "does_not_apply") {
    return facility
      ? `${ORGANIZATION_INHERITANCE_LABELS.doesNotApplyLine} (${ORGANIZATION_INHERITANCE_LABELS.facilityRulePrefix}: ${facility})`
      : ORGANIZATION_INHERITANCE_LABELS.doesNotApplyLine;
  }

  if (input.stance === "exception" && provider) {
    return `${ORGANIZATION_INHERITANCE_LABELS.providerExceptionPrefix}: ${provider}`;
  }

  if (input.stance === "applies" && facility) {
    return org ? `Same as ${org}: ${facility}` : facility;
  }

  if (provider) return provider;
  return facility ?? "";
}

export function buildOrganizationInheritancePatchValue(input: {
  stance: OrganizationInheritanceStance;
  baseline?: OrganizationIntelligenceBaseline["fields"][string];
  providerValue?: string;
}): string | null {
  if (input.stance === "does_not_apply") return null;
  if (input.stance === "exception") {
    return String(input.providerValue ?? "").trim() || null;
  }
  const fromBaseline = input.baseline?.value?.trim();
  if (fromBaseline) return fromBaseline;
  return String(input.providerValue ?? "").trim() || null;
}

export function buildOrganizationInheritanceRecord(input: {
  stance: OrganizationInheritanceStance;
  baseline?: OrganizationIntelligenceBaseline["fields"][string];
  resolvedAt?: string;
}): OrganizationInheritanceRecord {
  return {
    stance: input.stance,
    facility_display_line: input.baseline?.displayLine,
    facility_value: input.baseline?.value,
    resolved_at: input.resolvedAt ?? new Date().toISOString(),
  };
}

/** Provider has finished inheriting this org field (any of the three resolutions). */
export function shouldSkipInheritedOrganizationQuestion(
  dbKey: string,
  contact: Record<string, unknown>,
  baseline: OrganizationIntelligenceBaseline | null | undefined,
): boolean {
  const inheritance = readOrganizationInheritanceFromContact(contact, dbKey);
  if (inheritance) return true;

  const baselineField = baseline?.fields?.[dbKey];
  if (!baselineField) return false;

  const providerRaw = String(contact[dbKey] ?? "").trim();
  if (!fieldHasIntelligenceSignal(dbKey, providerRaw)) return false;

  return providerMatchesOrganizationBaseline(dbKey, providerRaw, baselineField.value);
}
