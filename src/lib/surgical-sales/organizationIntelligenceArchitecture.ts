/**
 * Organization Intelligence UI sections — facility-wide, shared across providers.
 */

import {
  ORGANIZATION_INTELLIGENCE_FIELD_DEFS,
  type OrganizationIntelligenceCategory,
  type OrganizationIntelligenceFieldDef,
} from "@/lib/surgical-sales/organizationIntelligenceFields";

export type OrganizationIntelligenceSectionId =
  | "facility_access"
  | "scheduling_approval"
  | "purchasing_committee"
  | "or_environment";

export const ORGANIZATION_INTELLIGENCE_SECTION_ORDER: OrganizationIntelligenceSectionId[] = [
  "facility_access",
  "scheduling_approval",
  "or_environment",
  "purchasing_committee",
];

export const ORGANIZATION_INTELLIGENCE_SECTION_LABELS: Record<OrganizationIntelligenceSectionId, string> = {
  facility_access: "Access & credentialing",
  scheduling_approval: "Scheduling & approval",
  or_environment: "OR environment",
  purchasing_committee: "Purchasing & vendors",
};

export const ORGANIZATION_INTELLIGENCE_SECTION_HINTS: Record<OrganizationIntelligenceSectionId, string> = {
  facility_access: "Vendor credentialing, OR access rules, and observation gates at this facility.",
  scheduling_approval: "Who approves observation and facility scheduling windows.",
  or_environment: "Team rhythm, workflow culture, and support norms shared site-wide.",
  purchasing_committee: "Committee process, preference cards, and active vendors in the OR.",
};

const CATEGORY_TO_SECTION: Record<OrganizationIntelligenceCategory, OrganizationIntelligenceSectionId> = {
  vendor_credentialing: "facility_access",
  or_access_rules: "facility_access",
  observation_approval: "facility_access",
  scheduling_pathway: "scheduling_approval",
  purchasing_committee: "purchasing_committee",
  facility_workflow_culture: "or_environment",
  or_vendor_landscape: "purchasing_committee",
  support_norms: "or_environment",
  spd_tray_behavior: "or_environment",
  facility_logistics: "or_environment",
  room_turnover: "or_environment",
};

export const ORGANIZATION_INTELLIGENCE_SECTION_FIELD_ORDER: Record<
  OrganizationIntelligenceSectionId,
  readonly string[]
> = {
  facility_access: [
    "provider_credentialing_status",
    "provider_observation_credentialing_needed",
    "provider_credentialing_platform_name",
    "provider_credentialing_platform_id",
    "provider_credentialing_contact",
    "provider_credentialing_approval_contact",
    "provider_credentialing_renewal_notes",
    "provider_credentialing_required_documents",
    "provider_credentialing_facility_instructions",
    "provider_observation_access_path",
  ],
  scheduling_approval: [
    "provider_observation_scheduling_control",
    "provider_scheduling_contact",
    "provider_facility_scheduling_contact",
    "provider_observation_coordinator_contact",
    "provider_observation_best_days_case_types",
  ],
  or_environment: [
    "provider_or_team_dynamics",
    "provider_support_expectations",
    "provider_facility_spd_tray_behavior",
    "provider_facility_logistics_notes",
    "provider_facility_room_turnover_patterns",
  ],
  purchasing_committee: ["provider_preference_card_signals", "provider_current_vendors"],
};

const FIELD_DEF_BY_KEY = new Map(ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f]));

export type OrganizationIntelligenceSectionConfig = {
  id: OrganizationIntelligenceSectionId;
  label: string;
  hint: string;
  fieldKeys: string[];
  fields: OrganizationIntelligenceFieldDef[];
};

export function buildOrganizationIntelligenceSections(): OrganizationIntelligenceSectionConfig[] {
  return ORGANIZATION_INTELLIGENCE_SECTION_ORDER.map((id) => {
    const order = ORGANIZATION_INTELLIGENCE_SECTION_FIELD_ORDER[id];
    const fields = order
      .map((key) => FIELD_DEF_BY_KEY.get(key))
      .filter((f): f is OrganizationIntelligenceFieldDef => Boolean(f));
    return {
      id,
      label: ORGANIZATION_INTELLIGENCE_SECTION_LABELS[id],
      hint: ORGANIZATION_INTELLIGENCE_SECTION_HINTS[id],
      fieldKeys: fields.map((f) => f.dbKey),
      fields,
    };
  });
}
