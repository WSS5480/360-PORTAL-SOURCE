import type { ProviderPlanningSectionId } from "@/lib/surgical-sales/providerPlanningCompletion";

import {

  PROVIDER_WIZARD_PLANNING_FIELDS,

  PROVIDER_WIZARD_PROCEDURAL_FIELDS,

  PROVIDER_WIZARD_RELATIONSHIP_FIELDS,

} from "@/lib/surgical-sales/providerWizardFields";

import { isDeprecatedProviderPreCallDbKey } from "@/lib/surgical-sales/providerIntelligenceFields";



export const AI_NOTE_CAPTURE_WORKFLOWS = ["provider_planning"] as const;

export type AiNoteCaptureWorkflow = (typeof AI_NOTE_CAPTURE_WORKFLOWS)[number];



export const AI_NOTE_CAPTURE_MERGE_STRATEGIES = ["append", "replace", "create_task", "needs_review"] as const;

export type AiNoteCaptureMergeStrategy = (typeof AI_NOTE_CAPTURE_MERGE_STRATEGIES)[number];



/** Logical field ids used in AI prompts and review UI — provider intelligence only (not Pre-Call Plan). */

export const PROVIDER_PLANNING_LOGICAL_FIELDS = [

  "common_procedures",

  "case_volume_estimate",

  "technique_preferences",

  "current_vendors_products",

  "competitive_products_used",

  "product_interest_areas",

  "evaluation_openness",

  "preference_card_signals",

  "or_team_dynamics",

  "influence_level",

  "decision_maker_status",

  "champion_potential",

  "communication_style",

  "communication_style_notes",

  "follow_up_approach",

  "rep_strategy_notes",

] as const;



export type ProviderPlanningLogicalField = (typeof PROVIDER_PLANNING_LOGICAL_FIELDS)[number];



export type ProviderPlanningWorkflowSection =

  | "provider_basics"

  | "procedural_intelligence"

  | "product_competitor_intelligence"

  | "relationship_strategy"

  | "observation_prompts";



export type AiNoteCaptureWorkflowTarget = {

  workflow: AiNoteCaptureWorkflow;

  section: ProviderPlanningWorkflowSection;

  field: ProviderPlanningLogicalField;

  fieldLabel: string;

  mergeStrategy: AiNoteCaptureMergeStrategy;

};



const LOGICAL_TO_DB: Record<ProviderPlanningLogicalField, string> = {

  common_procedures: "provider_procedure_focus",

  case_volume_estimate: "provider_case_volume_estimate",

  technique_preferences: "provider_technique_preferences",

  current_vendors_products: "provider_current_vendors",

  competitive_products_used: "provider_competitive_products",

  product_interest_areas: "provider_product_interests",

  evaluation_openness: "provider_evaluation_openness",

  preference_card_signals: "provider_preference_card_signals",

  or_team_dynamics: "provider_or_team_dynamics",

  influence_level: "influence_level",

  decision_maker_status: "provider_decision_maker_status",

  champion_potential: "provider_champion_potential",

  communication_style: "preferred_contact_method",

  communication_style_notes: "provider_communication_style",

  follow_up_approach: "provider_follow_up_approach",

  rep_strategy_notes: "provider_rep_strategy_notes",

};



const SECTION_LABELS: Record<ProviderPlanningWorkflowSection, string> = {

  provider_basics: "Provider Basics",

  procedural_intelligence: "Procedural Intelligence",

  product_competitor_intelligence: "Product / Competitor Intelligence",

  relationship_strategy: "Relationship Strategy",

  observation_prompts: "Engagement preparation (not provider profile)",

};



const LOGICAL_TO_SECTION: Record<ProviderPlanningLogicalField, ProviderPlanningWorkflowSection> = {

  common_procedures: "procedural_intelligence",

  case_volume_estimate: "procedural_intelligence",

  technique_preferences: "procedural_intelligence",

  or_team_dynamics: "procedural_intelligence",

  current_vendors_products: "product_competitor_intelligence",

  competitive_products_used: "product_competitor_intelligence",

  product_interest_areas: "product_competitor_intelligence",

  evaluation_openness: "product_competitor_intelligence",

  preference_card_signals: "product_competitor_intelligence",

  influence_level: "relationship_strategy",

  decision_maker_status: "relationship_strategy",

  champion_potential: "relationship_strategy",

  communication_style: "relationship_strategy",

  communication_style_notes: "relationship_strategy",

  follow_up_approach: "relationship_strategy",

  rep_strategy_notes: "relationship_strategy",

};



function labelForLogicalField(field: ProviderPlanningLogicalField): string {

  const dbKey = LOGICAL_TO_DB[field];

  const all = [...PROVIDER_WIZARD_PROCEDURAL_FIELDS, ...PROVIDER_WIZARD_PLANNING_FIELDS, ...PROVIDER_WIZARD_RELATIONSHIP_FIELDS];

  const match = all.find((f) => f.key === dbKey);

  if (match) return match.label;

  return field.replace(/_/g, " ");

}



export function dbColumnForLogicalField(field: ProviderPlanningLogicalField): string {

  const dbKey = LOGICAL_TO_DB[field];

  if (isDeprecatedProviderPreCallDbKey(dbKey)) {

    throw new Error(`Logical field ${field} maps to deprecated Pre-Call column ${dbKey}`);

  }

  return dbKey;

}



export function logicalFieldFromDbColumn(dbKey: string): ProviderPlanningLogicalField | null {

  const entry = Object.entries(LOGICAL_TO_DB).find(([, v]) => v === dbKey);

  return entry ? (entry[0] as ProviderPlanningLogicalField) : null;

}



export function sectionLabel(section: ProviderPlanningWorkflowSection): string {

  return SECTION_LABELS[section];

}



export function planningSectionIdFromWorkflowSection(

  section: ProviderPlanningWorkflowSection,

): ProviderPlanningSectionId | null {

  switch (section) {

    case "procedural_intelligence":

      return "clinical_workflow";

    case "product_competitor_intelligence":

      return "commercial_signals";

    case "relationship_strategy":

      return "relationship_strategy";

    case "observation_prompts":

      return "clinical_workflow";

    case "provider_basics":

      return "basics";

    default:

      return null;

  }

}



export function buildWorkflowTarget(params: {

  field: ProviderPlanningLogicalField;

  mergeStrategy?: AiNoteCaptureMergeStrategy;

}): AiNoteCaptureWorkflowTarget {

  const section = LOGICAL_TO_SECTION[params.field];

  return {

    workflow: "provider_planning",

    section,

    field: params.field,

    fieldLabel: labelForLogicalField(params.field),

    mergeStrategy: params.mergeStrategy ?? "append",

  };

}



export const PROVIDER_PLANNING_FIELD_OPTIONS: Array<{

  section: ProviderPlanningWorkflowSection;

  field: ProviderPlanningLogicalField;

  label: string;

}> = PROVIDER_PLANNING_LOGICAL_FIELDS.map((field) => ({

  field,

  section: LOGICAL_TO_SECTION[field],

  label: labelForLogicalField(field),

}));



export function mergeWorkflowFieldValue(params: {

  existing: string;

  proposed: string;

  mergeStrategy: AiNoteCaptureMergeStrategy;

  isSelectField?: boolean;

}): string {

  const existing = params.existing.trim();

  const proposed = params.proposed.trim();

  if (!proposed) return existing;

  if (params.mergeStrategy === "replace" || params.isSelectField) return proposed;

  if (!existing) return proposed;

  if (existing.toLowerCase().includes(proposed.toLowerCase())) return existing;

  return `${existing}\n${proposed}`;

}


