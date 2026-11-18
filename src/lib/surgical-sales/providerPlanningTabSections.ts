/**

 * Provider intelligence tab — persistent profile fields only (no Pre-Call Plan / interaction planning).

 */



import {

  buildProviderIntelligenceSections,
  PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  PROVIDER_INTELLIGENCE_SECTION_LABELS,
  PROVIDER_INTELLIGENCE_SECTION_ORDER,
  wizardFieldsForIntelligenceSection,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import { splitProviderPlanningPatchByLayer } from "@/lib/surgical-sales/intelligenceLayerArchitecture";
import { PROVIDER_CREATE_PLANNING_REQUIRED_KEYS, type WizardFieldConfig } from "@/lib/surgical-sales/providerWizardFields";



export type ProviderPlanningTabSectionId = ProviderIntelligenceSectionId;



/** @deprecated Redirects in normalizePlanningSectionId. */

export type ProviderPlanningSectionId =

  | "basics"

  | ProviderPlanningTabSectionId

  | "clinical_intelligence"

  | "product_preferences"

  | "competitor_usage"

  | "communication_style"

  | "influence_level"

  | "relationship_strategy"

  | "procedural"

  | "product_competitor"

  | "relationship"

  | "observation_prompts"

  | "observation_readiness"

  | "planning"

  | "clinical_discovery";



export const PROVIDER_PLANNING_TAB_SECTION_ORDER = PROVIDER_INTELLIGENCE_SECTION_ORDER;



export const PROVIDER_PLANNING_TAB_SECTION_LABELS = PROVIDER_INTELLIGENCE_SECTION_LABELS;



function buildSectionFieldKeys(): Record<ProviderPlanningTabSectionId, readonly string[]> {
  const out = {} as Record<ProviderPlanningTabSectionId, readonly string[]>;
  for (const s of buildProviderIntelligenceSections()) {
    out[s.id] = s.fieldKeys;
  }
  return out;
}

const SECTION_FIELD_KEYS = buildSectionFieldKeys();



export const PROVIDER_PLANNING_CLINICAL_WORKFLOW_FIELD_KEYS = SECTION_FIELD_KEYS.clinical_workflow;

/** Facility-wide organization intelligence (shown in scope split, not provider accordion). */
export const PROVIDER_PLANNING_OR_ENVIRONMENT_FIELD_KEYS =
  PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER.or_environment ?? [];

export const PROVIDER_PLANNING_RELATIONSHIP_INTELLIGENCE_FIELD_KEYS = SECTION_FIELD_KEYS.relationship_intelligence;

export const PROVIDER_PLANNING_COMMERCIAL_SIGNALS_FIELD_KEYS = SECTION_FIELD_KEYS.commercial_signals;



export const PROVIDER_PLANNING_OBSERVATION_READINESS_FIELD_KEYS = SECTION_FIELD_KEYS.observation_readiness;



export const PROVIDER_PLANNING_SECTION_LABELS: Record<ProviderPlanningSectionId, string> = {

  basics: "Provider basics",

  clinical_workflow: PROVIDER_PLANNING_TAB_SECTION_LABELS.clinical_workflow,

  or_environment: PROVIDER_PLANNING_TAB_SECTION_LABELS.or_environment,

  relationship_intelligence: PROVIDER_PLANNING_TAB_SECTION_LABELS.relationship_intelligence,

  commercial_signals: PROVIDER_PLANNING_TAB_SECTION_LABELS.commercial_signals,

  clinical_intelligence: PROVIDER_PLANNING_TAB_SECTION_LABELS.clinical_workflow,

  product_preferences: PROVIDER_PLANNING_TAB_SECTION_LABELS.commercial_signals,

  competitor_usage: PROVIDER_PLANNING_TAB_SECTION_LABELS.commercial_signals,

  communication_style: PROVIDER_PLANNING_TAB_SECTION_LABELS.relationship_intelligence,

  influence_level: PROVIDER_PLANNING_TAB_SECTION_LABELS.relationship_intelligence,

  relationship_strategy: PROVIDER_PLANNING_TAB_SECTION_LABELS.relationship_intelligence,

  procedural: PROVIDER_PLANNING_TAB_SECTION_LABELS.clinical_workflow,

  product_competitor: PROVIDER_PLANNING_TAB_SECTION_LABELS.commercial_signals,

  relationship: PROVIDER_PLANNING_TAB_SECTION_LABELS.relationship_intelligence,

  observation_prompts: "Engagement preparation",

  observation_readiness: PROVIDER_PLANNING_TAB_SECTION_LABELS.observation_readiness,

  planning: "Operational intelligence planning",

  clinical_discovery: "Engagement preparation",

};



export const PROVIDER_PLANNING_PROFILE_SECTION_ORDER: ProviderPlanningTabSectionId[] = [

  ...PROVIDER_PLANNING_TAB_SECTION_ORDER,

];



/** @deprecated */

export const PROVIDER_PLANNING_CLINICAL_FIELD_KEYS = [

  ...PROVIDER_PLANNING_CLINICAL_WORKFLOW_FIELD_KEYS,

  ...PROVIDER_PLANNING_OR_ENVIRONMENT_FIELD_KEYS,

] as const;



/** @deprecated */

export const PROVIDER_PLANNING_PRODUCT_PREFERENCE_FIELD_KEYS = [

  "provider_current_vendors",

  "provider_product_interests",

  "provider_evaluation_openness",

  "provider_preference_card_signals",

] as const;



/** @deprecated */

export const PROVIDER_PLANNING_COMPETITOR_FIELD_KEYS = ["provider_competitive_products"] as const;



/** @deprecated */

export const PROVIDER_PLANNING_COMMUNICATION_FIELD_KEYS = [

  "preferred_contact_method",

  "provider_communication_style",

] as const;



/** @deprecated */

export const PROVIDER_PLANNING_INFLUENCE_FIELD_KEYS = [

  "influence_level",

  "provider_decision_maker_status",

  "provider_champion_potential",

] as const;



/** @deprecated */

export const PROVIDER_PLANNING_RELATIONSHIP_STRATEGY_FIELD_KEYS = [

  "provider_follow_up_approach",

  "provider_rep_strategy_notes",

  "provider_strategic_goal",

] as const;



/** @deprecated */

export const PROVIDER_PLANNING_PROCEDURAL_FIELD_KEYS = PROVIDER_PLANNING_CLINICAL_WORKFLOW_FIELD_KEYS;



/** @deprecated */

export const PROVIDER_PLANNING_PRODUCT_COMPETITOR_FIELD_KEYS = PROVIDER_PLANNING_COMMERCIAL_SIGNALS_FIELD_KEYS;



/** @deprecated */

export const PROVIDER_PLANNING_PRE_OBSERVATION_FIELD_KEYS = [] as const;



export const PRE_CALL_PLAN_DEPRECATED_PROVIDER_FIELD_KEYS = PROVIDER_PLANNING_PRE_OBSERVATION_FIELD_KEYS;



/** @deprecated */

export const PROVIDER_PLANNING_OBSERVATION_PROMPT_FIELD_KEYS = [] as const;



/** @deprecated */

export const PROVIDER_PLANNING_RELATIONSHIP_FIELD_KEYS = PROVIDER_PLANNING_RELATIONSHIP_INTELLIGENCE_FIELD_KEYS;



export function wizardFieldsForSection(sectionId: ProviderPlanningTabSectionId): WizardFieldConfig[] {

  return wizardFieldsForIntelligenceSection(sectionId);

}



export function fieldKeysForPlanningSection(sectionId: ProviderPlanningTabSectionId): string[] {

  return wizardFieldsForSection(sectionId).map((f) => f.key);

}



export function isPlanningFieldRequired(key: string): boolean {

  return (PROVIDER_CREATE_PLANNING_REQUIRED_KEYS as readonly string[]).includes(key);

}



const LEGACY_SECTION_MAP: Record<string, ProviderPlanningTabSectionId> = {

  clinical_intelligence: "clinical_workflow",

  procedural: "clinical_workflow",

  clinical_discovery: "clinical_workflow",

  planning: "clinical_workflow",

  observation_prompts: "clinical_workflow",

  observation_readiness: "observation_readiness",

  product_preferences: "commercial_signals",

  competitor_usage: "commercial_signals",

  product_competitor: "commercial_signals",

  communication_style: "relationship_intelligence",

  influence_level: "relationship_intelligence",

  relationship_strategy: "relationship_intelligence",

  relationship: "relationship_intelligence",

};



export function normalizePlanningSectionId(

  raw: string | null | undefined,

): ProviderPlanningTabSectionId | null {

  const v = (raw || "").trim();

  if ((PROVIDER_PLANNING_TAB_SECTION_ORDER as readonly string[]).includes(v)) {

    return v as ProviderPlanningTabSectionId;

  }

  return LEGACY_SECTION_MAP[v] ?? null;

}



export function hydrateProviderPlanningDraft(provider: Record<string, unknown>): Record<string, string> {

  const draft: Record<string, string> = {};

  for (const sectionId of PROVIDER_PLANNING_TAB_SECTION_ORDER) {

    for (const field of wizardFieldsForSection(sectionId)) {

      draft[field.key] = String(provider[field.key] ?? "");

    }

  }

  return draft;

}



export function buildPlanningPatchFromDraft(draft: Record<string, string>): Record<string, string | null> {
  const out: Record<string, string | null> = {};

  for (const sectionId of PROVIDER_PLANNING_TAB_SECTION_ORDER) {
    for (const field of wizardFieldsForSection(sectionId)) {
      const raw = draft[field.key];
      if (raw === undefined) continue;
      out[field.key] = String(raw).trim() || null;
    }
  }

  return splitProviderPlanningPatchByLayer(out).persistent;
}


