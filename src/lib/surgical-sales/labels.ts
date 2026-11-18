/** Display labels for surgical CRM enums (DB stores lowercase snake). */

/** Shown near free-text fields; must align with server-side payload rules. */
export const SURGICAL_PHI_UI_NOTICE =
  "Do not upload or enter patient names, DOBs, MRNs, photos, or other PHI.";

/** Compact compliance strip on the portal New Surgical Case form. */
export const NEW_SURGICAL_CASE_PHI_BANNER = {
  label: "PHI Restricted:",
  detail: "Do not enter patient identifiers.",
  full: "PHI Restricted: Do not enter patient identifiers.",
} as const;

/** Shown on contact intelligence / free-text notes fields. */
export const SURGICAL_CONTACT_NOTES_PHI_NOTICE = "Do not enter patient information or PHI.";

export const SURGICAL_ACCOUNT_TYPES = ["hospital", "asc", "clinic", "practice", "distributor", "other"] as const;
export type SurgicalAccountType = (typeof SURGICAL_ACCOUNT_TYPES)[number];

export const SURGICAL_ACCOUNT_STATUSES = ["active", "inactive", "prospect"] as const;
export type SurgicalAccountStatus = (typeof SURGICAL_ACCOUNT_STATUSES)[number];

/** Provider commercial status — prospect pipeline eligibility (broader than org account status). */
export {
  PROVIDER_COMMERCIAL_STATUSES as PROVIDER_CRM_STATUSES,
  formatProviderCommercialStatus as formatProviderCrmStatus,
  type ProviderCommercialStatus as ProviderCrmStatus,
} from "@/lib/surgical-sales/providerCommercialStatus";

export const SURGICAL_CONTACT_ROLE_TYPES = [
  "surgeon",
  "office_manager",
  "purchasing",
  "billing",
  "or_staff",
  "administrator",
  "other",
] as const;
export type SurgicalContactRoleType = (typeof SURGICAL_CONTACT_ROLE_TYPES)[number];

export const SURGICAL_CASE_STATUSES = [
  "draft",
  "scheduled",
  "rescheduled",
  "confirmed",
  "completed",
  "docs_needed",
  "billing_review",
  "invoiced",
  "closed",
  "cancelled",
] as const;
export type SurgicalCaseStatus = (typeof SURGICAL_CASE_STATUSES)[number];

export const SURGICAL_CASE_DOCUMENT_TYPES = [
  "purchase_order",
  "invoice",
  "packing_slip",
  "consignment_form",
  "implant_log",
  "observation_form",
  "other",
] as const;
export type SurgicalCaseDocumentType = (typeof SURGICAL_CASE_DOCUMENT_TYPES)[number];

export function formatSurgicalCaseDocumentType(v: string | null | undefined): string {
  const s = String(v ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    purchase_order: "Purchase order",
    invoice: "Invoice",
    packing_slip: "Packing slip",
    consignment_form: "Consignment form",
    implant_log: "Implant log",
    observation_form: "Observation form",
    other: "Other",
  };
  return map[s] || (s ? s.replace(/_/g, " ") : "—");
}

function surgicalCaseNumberDateToMmddyy(digits: string): string {
  if (digits.length === 8) {
    return digits.slice(4, 6) + digits.slice(6, 8) + digits.slice(2, 4);
  }
  if (digits.length !== 6) return digits;
  const month = Number(digits.slice(0, 2));
  const day = Number(digits.slice(2, 4));
  const looksLikeMmddyy = month >= 1 && month <= 12 && day >= 1 && day <= 31;
  if (looksLikeMmddyy) return digits;
  const ymdMonth = Number(digits.slice(2, 4));
  const ymdDay = Number(digits.slice(4, 6));
  if (ymdMonth >= 1 && ymdMonth <= 12 && ymdDay >= 1 && ymdDay <= 31) {
    return digits.slice(2, 4) + digits.slice(4, 6) + digits.slice(0, 2);
  }
  return digits;
}

/** Display label for stored surgical case numbers (supports legacy and current formats). */
export function formatSurgicalCaseNumber(v: string | null | undefined): string {
  const raw = String(v ?? "").trim();
  if (!raw) return raw;
  const match = raw.match(/^SC-(\d{6}|\d{8})-(\d+)$/i);
  if (!match) return raw;
  const mmddyy = surgicalCaseNumberDateToMmddyy(match[1]);
  const serial = String(Number(match[2]));
  return `SC-${mmddyy}-${serial}`;
}

export const SURGICAL_CASE_TYPES = ["observation", "product_support"] as const;
export type SurgicalCaseType = (typeof SURGICAL_CASE_TYPES)[number];

export function isSurgicalObservationCase(caseType: unknown): boolean {
  return String(caseType ?? "").trim().toLowerCase() === "observation";
}

export function formatSurgicalCaseType(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    observation: "Observation",
    product_support: "Product support",
    evaluation: "Evaluation",
    conversion: "Conversion",
    training: "Training",
  };
  return map[s] || (s ? s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Product support");
}

export function formatSurgicalCaseStatus(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    rescheduled: "Rescheduled",
    confirmed: "Confirmed",
    completed: "Completed",
    docs_needed: "Docs needed",
    billing_review: "Billing review",
    invoiced: "Invoiced",
    closed: "Closed",
    cancelled: "Cancelled",
  };
  return map[s] || (s ? s.replace(/_/g, " ") : "—");
}

export function formatSurgicalAccountType(v: string | null | undefined): string {
  const s = String(v ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    hospital: "Hospital",
    asc: "ASC",
    clinic: "Clinic",
    practice: "Practice",
    distributor: "Distributor",
    other: "Other",
  };
  return map[s] || (s ? s : "—");
}

export function formatSurgicalAccountStatus(v: string | null | undefined): string {
  const s = String(v ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    active: "Active",
    inactive: "Inactive",
    prospect: "Prospect",
  };
  return map[s] || (s ? s : "—");
}

export function formatSurgicalContactRole(v: string | null | undefined): string {
  const s = String(v ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    surgeon: "Surgeon",
    office_manager: "Office manager",
    purchasing: "Purchasing",
    billing: "Billing",
    or_staff: "OR staff",
    administrator: "Administrator",
    other: "Other",
  };
  return map[s] || (s ? s.replace(/_/g, " ") : "—");
}

export function contactDisplayName(row: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): string {
  const fn = String(row.first_name ?? "").trim();
  const ln = String(row.last_name ?? "").trim();
  const full = [fn, ln].filter(Boolean).join(" ").trim();
  if (full) return full;
  const em = String(row.email ?? "").trim();
  return em || "—";
}
