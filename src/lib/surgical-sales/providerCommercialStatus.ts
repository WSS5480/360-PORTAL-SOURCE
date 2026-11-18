/**
 * Provider commercial status — who belongs on the Opportunity pipeline.
 * Stored in surgical_sales_contacts.provider_crm_status (legacy column name).
 */

export const PROVIDER_COMMERCIAL_STATUS_DB_VALUES = [
  "prospect",
  "active",
  "inactive",
  "not_targeted",
  "unknown",
] as const;

export type ProviderCommercialStatusDb = (typeof PROVIDER_COMMERCIAL_STATUS_DB_VALUES)[number];

export const PROVIDER_COMMERCIAL_STATUS_LABELS: Record<ProviderCommercialStatusDb, string> = {
  prospect: "Prospect",
  active: "Customer",
  inactive: "Inactive",
  not_targeted: "Not Targeted",
  unknown: "Unknown",
};

/** Values shown in provider forms — same as DB values. */
export const PROVIDER_COMMERCIAL_STATUSES = PROVIDER_COMMERCIAL_STATUS_DB_VALUES;

export type ProviderCommercialStatus = ProviderCommercialStatusDb;

const LEGACY_ALIASES: Record<string, ProviderCommercialStatusDb> = {
  customer: "active",
};

export function normalizeProviderCommercialStatus(raw: string | null | undefined): ProviderCommercialStatusDb {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (!key) return "unknown";
  if (LEGACY_ALIASES[key]) return LEGACY_ALIASES[key];
  if ((PROVIDER_COMMERCIAL_STATUS_DB_VALUES as readonly string[]).includes(key)) {
    return key as ProviderCommercialStatusDb;
  }
  return "unknown";
}

export function formatProviderCommercialStatus(raw: string | null | undefined): string {
  const normalized = normalizeProviderCommercialStatus(raw);
  return PROVIDER_COMMERCIAL_STATUS_LABELS[normalized];
}

/** @deprecated Use formatProviderCommercialStatus — kept for existing imports. */
export const formatProviderCrmStatus = formatProviderCommercialStatus;

/** Statuses excluded from the Opportunity pipeline. */
export function isProviderCommercialStatusExcludedFromOpportunities(
  status: ProviderCommercialStatusDb,
): boolean {
  return status === "inactive" || status === "not_targeted";
}

/** Provider is a commercial prospect eligible for the Opportunity page. */
export function isProviderCommercialProspect(raw: string | null | undefined): boolean {
  return normalizeProviderCommercialStatus(raw) === "prospect";
}

export type ProviderActiveCustomerInput = {
  commercialStatus?: string | null;
  relationshipStage?: string | null;
  hasWonOpportunity?: boolean;
  hasActiveProductSupportCase?: boolean;
};

/** True when the provider already does business with us (excluded from opportunities). */
export function isProviderActiveCustomer(input: ProviderActiveCustomerInput): boolean {
  const status = normalizeProviderCommercialStatus(input.commercialStatus);
  if (status === "active") return true;

  const rel = String(input.relationshipStage ?? "")
    .trim()
    .toLowerCase();
  if (rel === "established_customer") return true;

  if (input.hasWonOpportunity) return true;
  if (input.hasActiveProductSupportCase) return true;

  return false;
}

export type ProviderOpportunityEligibilityInput = ProviderActiveCustomerInput & {
  archivedAt?: string | null;
};

/** Inclusion rule for the Opportunity pipeline view. */
export function isProviderOpportunityEligible(input: ProviderOpportunityEligibilityInput): boolean {
  if (input.archivedAt) return false;

  const status = normalizeProviderCommercialStatus(input.commercialStatus);
  if (status !== "prospect") return false;
  if (isProviderCommercialStatusExcludedFromOpportunities(status)) return false;

  return !isProviderActiveCustomer(input);
}
