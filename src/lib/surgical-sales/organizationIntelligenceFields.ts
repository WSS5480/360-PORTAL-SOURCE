/**
 * Organization Intelligence — facility-wide facts shared across providers at one hospital.
 *
 * Transitional storage: several keys still live on surgical_sales_contacts until
 * accounts.organization_intelligence is introduced. Treat them as organization scope
 * in capture, propagation, and UI — not as provider-specific intelligence.
 */

import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";

export type OrganizationIntelligenceCategory =
  | "vendor_credentialing"
  | "or_access_rules"
  | "observation_approval"
  | "scheduling_pathway"
  | "purchasing_committee"
  | "facility_workflow_culture"
  | "or_vendor_landscape"
  | "support_norms"
  | "spd_tray_behavior"
  | "facility_logistics"
  | "room_turnover";

export type OrganizationIntelligenceFieldDef = {
  dbKey: string;
  label: string;
  category: OrganizationIntelligenceCategory;
  helper?: string;
  /** Where the value is stored today (migration target: account). */
  storageEntity: "account" | "contact_mirror";
  scope: IntelligenceScope;
};

export const ORGANIZATION_INTELLIGENCE_FIELD_DEFS: OrganizationIntelligenceFieldDef[] = [
  {
    dbKey: "provider_credentialing_status",
    label: "Vendor credentialing process",
    category: "vendor_credentialing",
    helper: "How vendor/rep credentialing works at this facility — not one surgeon's status alone.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_observation_credentialing_needed",
    label: "Observation credentialing required?",
    category: "vendor_credentialing",
    helper: "Facility rule: is vendor credentialing required before any observation?",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_credentialing_platform_id",
    label: "Credentialing / vendor access service",
    category: "vendor_credentialing",
    helper: "Linked credentialing service reference for this facility.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_credentialing_platform_name",
    label: "Credentialing / vendor access service",
    category: "vendor_credentialing",
    helper: "Select the vendor access or credentialing system used by this facility. Add it if it is not listed.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_credentialing_contact",
    label: "Credentialing contact",
    category: "vendor_credentialing",
    helper: "Primary contact for vendor credentialing at this facility.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_credentialing_approval_contact",
    label: "Credentialing approval contact",
    category: "vendor_credentialing",
    helper: "Contact who approves vendor or rep access.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_credentialing_renewal_notes",
    label: "Credentialing renewal notes",
    category: "vendor_credentialing",
    helper: "Renewal cadence, expiration dates, and maintenance notes.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_credentialing_required_documents",
    label: "Required credentialing documents",
    category: "vendor_credentialing",
    helper: "Documents required for vendor credentialing.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_credentialing_facility_instructions",
    label: "Facility credentialing instructions",
    category: "vendor_credentialing",
    helper: "Facility-specific onboarding or credentialing instructions.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_or_team_dynamics",
    label: "OR / facility workflow culture",
    category: "facility_workflow_culture",
    helper: "How cases flow in this facility — turnover, team rhythm, and room culture.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_observation_access_path",
    label: "OR access rules",
    category: "or_access_rules",
    helper: "Facility-wide observation access — approvals, scheduler rules, and gates.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_observation_coordinator_contact",
    label: "Scheduling / approval pathway",
    category: "scheduling_pathway",
    helper: "Facility-wide scheduling and approval contacts — shared across providers at this hospital.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_observation_scheduling_control",
    label: "Scheduling control path",
    category: "scheduling_pathway",
    helper: "Where observation scheduling is controlled — provider office, facility, or shared.",
    storageEntity: "contact_mirror",
    scope: "provider",
  },
  {
    dbKey: "provider_scheduling_contact",
    label: "Provider office scheduling contact",
    category: "scheduling_pathway",
    helper: "Office scheduler or coordinator linked to the provider workflow.",
    storageEntity: "contact_mirror",
    scope: "provider",
  },
  {
    dbKey: "provider_facility_scheduling_contact",
    label: "Facility scheduling contact",
    category: "scheduling_pathway",
    helper: "OR scheduler or central scheduling staff at the facility.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_observation_best_days_case_types",
    label: "Best observation days / case types (facility)",
    category: "scheduling_pathway",
    helper: "Facility scheduling windows that work for observation — shared across surgeons.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_preference_card_signals",
    label: "Purchasing / committee process",
    category: "purchasing_committee",
    helper: "Preference card, value analysis, and committee steps at this organization.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_current_vendors",
    label: "Vendors active in the OR",
    category: "or_vendor_landscape",
    helper: "Which vendors are credentialed or active facility-wide.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_support_expectations",
    label: "Facility support norms",
    category: "support_norms",
    helper: "Expected rep and clinical support level at this site.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_facility_spd_tray_behavior",
    label: "SPD / tray behavior",
    category: "spd_tray_behavior",
    helper: "How sterile processing and trays flow at this facility — shared across surgeons.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_facility_logistics_notes",
    label: "Facility logistics",
    category: "facility_logistics",
    helper: "Dock, parking, vendor check-in, and day-of logistics at this site.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
  {
    dbKey: "provider_facility_room_turnover_patterns",
    label: "Room turnover patterns",
    category: "room_turnover",
    helper: "Facility-wide turnover rhythm and constraints — not one surgeon's preference alone.",
    storageEntity: "contact_mirror",
    scope: "organization",
  },
];

export const ORGANIZATION_INTELLIGENCE_DB_KEYS = ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey);

export function isOrganizationIntelligenceDbKey(key: string): boolean {
  return (ORGANIZATION_INTELLIGENCE_DB_KEYS as readonly string[]).includes(key);
}
