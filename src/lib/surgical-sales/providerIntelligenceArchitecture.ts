/**
 * Provider Intelligence sections — surgeon-specific persistent profile only.
 *
 * Three-scope model: intelligenceScopeModel.ts
 * Organization sections: organizationIntelligenceArchitecture.ts
 * Engagement fields: engagementIntelligenceFields.ts
 */

import {
  ORGANIZATION_INTELLIGENCE_SECTION_FIELD_ORDER,
  ORGANIZATION_INTELLIGENCE_SECTION_HINTS,
  ORGANIZATION_INTELLIGENCE_SECTION_LABELS,
} from "@/lib/surgical-sales/organizationIntelligenceArchitecture";
import type { OrganizationIntelligenceFieldDef } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { ORGANIZATION_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/organizationIntelligenceFields";
import type { ProviderIntelligenceCategory, ProviderIntelligenceFieldDef } from "@/lib/surgical-sales/providerIntelligenceFields";
import {
  assertProviderIntelligenceWritableDbKey,
  PROVIDER_INTELLIGENCE_FIELD_DEFS,
} from "@/lib/surgical-sales/providerIntelligenceFields";
import { PRE_CALL_PLAN_FIELD_CONFIGS, type PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import type { WizardFieldConfig } from "@/lib/surgical-sales/providerWizardFields";
import {
  intelligenceCaptureSpecForKey,
  PROVIDER_INTELLIGENCE_CAPTURE_SPECS,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { PROVIDER_INTEL_AREA_LABELS } from "@/lib/surgical-sales/providerIntelligenceRepVocabulary";

/**
 * Provider intelligence tab sections.
 * `or_environment` holds organization-scoped fields shown in provider context (facility-wide).
 */
export type ProviderIntelligenceSectionId =
  | "clinical_workflow"
  | "or_environment"
  | "relationship_intelligence"
  | "commercial_signals"
  | "observation_readiness";

/** Provider-only sections — facility/org fields use ProviderIntelligenceScopeSplit. */
export const PROVIDER_INTELLIGENCE_SECTION_ORDER: ProviderIntelligenceSectionId[] = [
  "observation_readiness",
  "clinical_workflow",
  "relationship_intelligence",
  "commercial_signals",
];

export const PROVIDER_INTELLIGENCE_SECTION_LABELS: Record<ProviderIntelligenceSectionId, string> = {
  clinical_workflow: PROVIDER_INTEL_AREA_LABELS.clinical_workflow,
  or_environment: ORGANIZATION_INTELLIGENCE_SECTION_LABELS.or_environment,
  relationship_intelligence: PROVIDER_INTEL_AREA_LABELS.relationship_intelligence,
  commercial_signals: PROVIDER_INTEL_AREA_LABELS.commercial_signals,
  observation_readiness: PROVIDER_INTEL_AREA_LABELS.observation_readiness,
};

export const PROVIDER_INTELLIGENCE_SECTION_HINTS: Record<ProviderIntelligenceSectionId, string> = {
  clinical_workflow: "Procedure mix, modality, technique, workflow friction, and volume for this surgeon.",
  or_environment: `${ORGANIZATION_INTELLIGENCE_SECTION_HINTS.or_environment} (Organization Intelligence — shared at this facility.)`,
  relationship_intelligence: "Communication style, responsiveness, influence, and follow-up rhythm.",
  commercial_signals: "Evaluation appetite, competitors, and dissatisfaction with this provider.",
  observation_readiness:
    "Whether this surgeon allows observation, ideal cases with them, cadence, and validation questions.",
};

/** Section ids that render organization-scoped fields on the provider profile. */
export const PROVIDER_PROFILE_ORGANIZATION_SECTION_IDS: ProviderIntelligenceSectionId[] = ["or_environment"];

const CATEGORY_TO_SECTION: Record<ProviderIntelligenceCategory, ProviderIntelligenceSectionId> = {
  procedures: "clinical_workflow",
  modality: "clinical_workflow",
  technique_detail: "clinical_workflow",
  workflow_pain: "clinical_workflow",
  case_mix: "clinical_workflow",
  communication_style: "relationship_intelligence",
  responsiveness: "relationship_intelligence",
  decision_influence: "relationship_intelligence",
  follow_up_rhythm: "relationship_intelligence",
  evaluation_openness: "commercial_signals",
  competitor_usage: "commercial_signals",
  dissatisfaction: "commercial_signals",
  product_interest: "commercial_signals",
  observation_feasibility: "observation_readiness",
  ideal_cases: "observation_readiness",
  observation_cadence: "observation_readiness",
  validation_questions: "observation_readiness",
};

export const PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER: Record<ProviderIntelligenceSectionId, readonly string[]> = {
  or_environment: [
    ...ORGANIZATION_INTELLIGENCE_SECTION_FIELD_ORDER.facility_access,
    ...ORGANIZATION_INTELLIGENCE_SECTION_FIELD_ORDER.scheduling_approval,
    ...ORGANIZATION_INTELLIGENCE_SECTION_FIELD_ORDER.or_environment,
    ...ORGANIZATION_INTELLIGENCE_SECTION_FIELD_ORDER.purchasing_committee,
  ],
  clinical_workflow: [
    "provider_procedure_focus",
    "provider_technique_preferences",
    "provider_technique_detail",
    "provider_workflow_pain_points",
    "provider_case_volume_estimate",
  ],
  relationship_intelligence: [
    "provider_communication_style",
    "provider_responsiveness",
    "influence_level",
    "provider_decision_maker_status",
    "provider_champion_potential",
    "provider_follow_up_approach",
  ],
  commercial_signals: [
    "provider_clinical_frustrations",
    "provider_product_gaps",
    "provider_staff_frustrations",
    "provider_future_opportunity_signals",
    "provider_evaluation_openness",
    "provider_competitive_products",
    "provider_dissatisfaction_areas",
  ],
  observation_readiness: [
    "provider_observation_feasibility",
    "provider_ideal_observation_cases",
    "provider_observation_cadence_preference",
    "provider_first_observation_questions",
  ],
};

export const INTERACTION_PLANNING_PROVIDER_DB_KEYS = [
  "provider_pre_observation_impact_opening_statement",
  "provider_pre_observation_probes",
  "provider_pre_observation_tools_resources",
  "provider_pre_observation_value_hypothesis",
  "provider_pre_observation_planned_close",
  "provider_pre_observation_additional_notes",
] as const;

export const ENGAGEMENT_INTERACTION_PLANNING_FIELD_KEYS: PreCallPlanFieldKey[] =
  PRE_CALL_PLAN_FIELD_CONFIGS.map((f) => f.key);

export type ProviderIntelligenceSectionConfig = {
  id: ProviderIntelligenceSectionId;
  label: string;
  hint: string;
  fieldKeys: string[];
  fields: ProviderIntelligenceFieldDef[];
};

export function intelligenceSectionForCategory(
  category: ProviderIntelligenceCategory,
): ProviderIntelligenceSectionId {
  return CATEGORY_TO_SECTION[category];
}

const PROVIDER_FIELD_DEF_BY_KEY = new Map(PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f]));
const ORG_FIELD_DEF_BY_KEY = new Map(ORGANIZATION_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f]));

export function isOrganizationSectionOnProviderProfile(sectionId: ProviderIntelligenceSectionId): boolean {
  return PROVIDER_PROFILE_ORGANIZATION_SECTION_IDS.includes(sectionId);
}

export function fieldDefForProviderSectionKey(
  dbKey: string,
  sectionId: ProviderIntelligenceSectionId,
): ProviderIntelligenceFieldDef | OrganizationIntelligenceFieldDef | undefined {
  if (isOrganizationSectionOnProviderProfile(sectionId)) {
    return ORG_FIELD_DEF_BY_KEY.get(dbKey);
  }
  return PROVIDER_FIELD_DEF_BY_KEY.get(dbKey);
}

export function intelligenceSectionIdForDbKey(dbKey: string): ProviderIntelligenceSectionId | null {
  const providerDef = PROVIDER_FIELD_DEF_BY_KEY.get(dbKey);
  if (providerDef) return intelligenceSectionForCategory(providerDef.category);
  if (ORG_FIELD_DEF_BY_KEY.has(dbKey)) return "or_environment";
  for (const sectionId of PROVIDER_INTELLIGENCE_SECTION_ORDER) {
    const keys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId];
    if ((keys as readonly string[]).includes(dbKey)) return sectionId;
  }
  return null;
}

export function buildProviderIntelligenceSections(): ProviderIntelligenceSectionConfig[] {
  return PROVIDER_INTELLIGENCE_SECTION_ORDER.map((id) => {
    const order = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[id];
    const fields = order
      .map((key) => fieldDefForProviderSectionKey(key, id))
      .filter((f): f is ProviderIntelligenceFieldDef => Boolean(f && !isOrganizationSectionOnProviderProfile(id)));
    const orgFields = isOrganizationSectionOnProviderProfile(id)
      ? order
          .map((key) => ORG_FIELD_DEF_BY_KEY.get(key))
          .filter((f): f is OrganizationIntelligenceFieldDef => Boolean(f))
      : [];
    const sectionFields = isOrganizationSectionOnProviderProfile(id) ? orgFields : fields;
    return {
      id,
      label: PROVIDER_INTELLIGENCE_SECTION_LABELS[id],
      hint: PROVIDER_INTELLIGENCE_SECTION_HINTS[id],
      fieldKeys: sectionFields.map((f) => f.dbKey),
      fields: sectionFields as ProviderIntelligenceFieldDef[],
    };
  });
}

export function isInteractionPlanningProviderDbKey(key: string): boolean {
  return (INTERACTION_PLANNING_PROVIDER_DB_KEYS as readonly string[]).includes(key);
}

export function isPersistentProviderIntelligenceDbKey(key: string): boolean {
  return PROVIDER_INTELLIGENCE_FIELD_DEFS.some((f) => f.dbKey === key);
}

export { isEngagementStrategyDbKey } from "@/lib/surgical-sales/intelligenceLayerArchitecture";

export function wizardFieldFromIntelligenceDef(
  def: ProviderIntelligenceFieldDef | OrganizationIntelligenceFieldDef,
): WizardFieldConfig {
  if ("storageEntity" in def) {
    const capture = intelligenceCaptureSpecForKey(def.dbKey);
    if (capture) {
      const options = capture.options ?? capture.suggestedChips;
      return {
        key: def.dbKey,
        label: def.label,
        helper: def.helper,
        input: capture.input === "compact_text" ? "compact_text" : "structured",
        capture,
        options: options?.map((o) => ({ value: o.value, label: o.label })),
        notesPlaceholder: capture.notesPlaceholder,
        compactPlaceholder: capture.compactPlaceholder,
        rows: capture.input === "textarea" ? 3 : undefined,
      };
    }
    return { key: def.dbKey, label: def.label, helper: def.helper, rows: 3, input: "textarea" };
  }
  assertProviderIntelligenceWritableDbKey(def.dbKey);
  const capture = intelligenceCaptureSpecForKey(def.dbKey);
  if (capture) {
    const options = capture.options ?? capture.suggestedChips;
    return {
      key: def.dbKey,
      label: def.label,
      helper: def.helper,
      input: capture.input === "compact_text" ? "compact_text" : "structured",
      capture,
      options: options?.map((o) => ({ value: o.value, label: o.label })),
      notesPlaceholder: capture.notesPlaceholder,
      compactPlaceholder: capture.compactPlaceholder,
      rows: capture.input === "textarea" ? 3 : undefined,
    };
  }
  return {
    key: def.dbKey,
    label: def.label,
    helper: def.helper,
    rows: 3,
    input: "textarea",
  };
}

export { PROVIDER_INTELLIGENCE_CAPTURE_SPECS };

export function wizardFieldsForIntelligenceSection(
  sectionId: ProviderIntelligenceSectionId,
): WizardFieldConfig[] {
  const section = buildProviderIntelligenceSections().find((s) => s.id === sectionId);
  if (!section) return [];
  return section.fields.map(wizardFieldFromIntelligenceDef);
}

export const PROVIDER_INTELLIGENCE_PERSISTENT_DB_KEYS = PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey);

export const PROVIDER_INTELLIGENCE_REQUIRED_DB_KEYS = ["provider_observation_feasibility"] as const;

export {
  ENGAGEMENT_INTELLIGENCE_LAYER_LABEL,
  ENGAGEMENT_INTELLIGENCE_SCOPE_DESCRIPTION,
  ENGAGEMENT_PREPARATION_LAYER_LABEL,
  ENGAGEMENT_PREPARATION_SCOPE_DESCRIPTION,
  ENGAGEMENT_SPECIFIC_INTELLIGENCE_LAYER_LABEL,
  ENGAGEMENT_SPECIFIC_INTELLIGENCE_SCOPE_DESCRIPTION,
  filterContactToPersistentIntelligenceLayer,
  filterContactToProviderIntelligenceScope,
  ORGANIZATION_INTELLIGENCE_LAYER_LABEL,
  ORGANIZATION_INTELLIGENCE_SCOPE_DESCRIPTION,
  PERSISTENT_PROVIDER_INTELLIGENCE_LAYER_LABEL,
  PERSISTENT_PROVIDER_INTELLIGENCE_SCOPE_DESCRIPTION,
  PROVIDER_INTELLIGENCE_EXCLUDES_ENGAGEMENT_STRATEGY,
  PROVIDER_INTELLIGENCE_LAYER_LABEL,
  PROVIDER_INTELLIGENCE_SCOPE_DESCRIPTION,
  splitProviderPlanningPatchByLayer,
  splitProviderPlanningPatchByScope,
  type IntelligenceLayer,
} from "@/lib/surgical-sales/intelligenceLayerArchitecture";
