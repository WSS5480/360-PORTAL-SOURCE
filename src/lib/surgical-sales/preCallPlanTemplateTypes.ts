/**

 * Pre-Call Plan templates — organized by product line and engagement type.

 * Template engagement types match surgical_sales_engagements.engagement_type (CRM dropdown).

 */



import type { SalesStage } from "@/lib/sales/stages";

import {

  ENGAGEMENT_TYPES,

  ENGAGEMENT_TYPE_LABELS,

  MVP_STRATEGIC_ENGAGEMENT_TYPES,

  type EngagementType,

  formatEngagementType,

  isEngagementType,

} from "@/lib/surgical-sales/engagements/engagementTypes";



export const PRE_CALL_PLAN_PRODUCT_LINES = [

  "ACSIS",

  "BioTissue",

  "Merakris",

  "TelaBio",

  "Skeletal Dynamics",

  "Endolumik",

] as const;



export type PreCallPlanProductLine = (typeof PRE_CALL_PLAN_PRODUCT_LINES)[number];



/** All CRM engagement types (validation / legacy records). */

export const PRE_CALL_PLAN_TEMPLATE_ENGAGEMENT_TYPES = ENGAGEMENT_TYPES;



/** MVP types for new template authoring and template picker filters. */

export const PRE_CALL_PLAN_TEMPLATE_ENGAGEMENT_TYPES_MVP = [

  ...MVP_STRATEGIC_ENGAGEMENT_TYPES,

] as const satisfies readonly EngagementType[];



export type PreCallPlanTemplateEngagementType = EngagementType;



export const PRE_CALL_PLAN_TEMPLATE_ENGAGEMENT_LABELS = ENGAGEMENT_TYPE_LABELS;



/** Legacy playbook type slugs → CRM engagement type (migration / read-time normalize). */

export const LEGACY_TEMPLATE_ENGAGEMENT_TO_CRM: Record<string, EngagementType> = {

  intro_discovery: "intro_call",

  observation_request: "observation_request",

  evaluation_planning: "product_demo",

  evaluation_discussion: "product_demo",

  active_evaluation: "product_demo",

  preference_card_conversion: "follow_up",

  preference_card_discussion: "follow_up",

  follow_up_expansion: "follow_up",

  follow_up_meeting: "follow_up",

  or_access_discussion: "or_visit",

  business_review: "office_visit_360",

};



export function normalizeTemplateEngagementType(raw: string | null | undefined): EngagementType | "" {

  const key = String(raw ?? "").trim();

  if (!key) return "";

  if (isEngagementType(key)) return key;

  return LEGACY_TEMPLATE_ENGAGEMENT_TO_CRM[key] ?? "";

}



/** Opportunity pipeline stage → CRM engagement type for template suggestions. */

export const OPPORTUNITY_STAGE_TO_TEMPLATE_ENGAGEMENT: Partial<

  Record<SalesStage, EngagementType>

> = {

  discovery: "intro_call",

  clinical_validation: "observation_request",

  evaluation_planned: "product_demo",

  evaluation_active: "product_demo",

  outcome_review: "follow_up",

  preference_card_progress: "follow_up",

  adoption_expanding: "follow_up",

};



export type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";



/** Legacy seed file field names (mapped to canonical DB columns on sync). */

export type PreCallPlanTemplateContent = {

  observation_goal: string;

  pre_observation_impact_opening_statement: string;

  pre_observation_probes: string;

  pre_observation_tools_resources: string;

  pre_observation_value_hypothesis: string;

  pre_observation_planned_close: string;

  suggested_next_step: string;

  pre_observation_additional_notes: string | null;

};



/** @deprecated Use PreCallPlanTemplate (camelCase API shape). */

export type PreCallPlanTemplateRow = import("@/lib/surgical-sales/preCallPlanTemplateModel").PreCallPlanTemplate;



export function formatTemplateEngagementType(raw: string | null | undefined): string {

  const normalized = normalizeTemplateEngagementType(raw);

  if (normalized) return ENGAGEMENT_TYPE_LABELS[normalized];

  return formatEngagementType(raw);

}



export function isPreCallPlanProductLine(raw: string): raw is PreCallPlanProductLine {

  return (PRE_CALL_PLAN_PRODUCT_LINES as readonly string[]).includes(raw);

}



export function isPreCallPlanTemplateEngagementType(raw: string): raw is PreCallPlanTemplateEngagementType {

  return isEngagementType(raw);

}


