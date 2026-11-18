/**
 * Product knowledge types for Observation Debrief strategy planning.
 * Static config first — structured for future DB or CMS migration.
 */

import type { PreCallPlanProductLine } from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import type { ProviderDebriefPlanProductFitLevel } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";

/** Supported debrief product lines — aligned with PRE_CALL_PLAN_PRODUCT_LINES. */
export type DebriefProductKnowledgeId = PreCallPlanProductLine;

export const DEBRIEF_PRODUCT_KNOWLEDGE_IDS = [
  "ACSIS",
  "BioTissue",
  "Merakris",
  "TelaBio",
  "Skeletal Dynamics",
  "Endolumik",
] as const satisfies readonly DebriefProductKnowledgeId[];

export type DebriefProductKnowledge = {
  id: DebriefProductKnowledgeId;
  name: string;
  shortDescription: string;
  bestFitProcedures: string[];
  problemsSolved: string[];
  workflowTriggers: string[];
  clinicalTriggers: string[];
  idealProviderSignals: string[];
  commonObjections: string[];
  discoveryQuestions: string[];
  experience360Positioning: string;
  evaluationCaseTriggers: string[];
  avoidWhen: string[];
};

/** Minimal product signal for ranking knowledge candidates (avoids builder circular imports). */
export type DebriefProductKnowledgeSignal = {
  product: string;
  fitLevel?: ProviderDebriefPlanProductFitLevel;
};

/** Context bundle for debrief strategy builders (and future AI prompts). */
export type DebriefStrategyProductContext = {
  primaryProductId: DebriefProductKnowledgeId | null;
  primary: DebriefProductKnowledge | null;
  /** All products with any signal in the observation plan, strongest first. */
  candidates: DebriefProductKnowledge[];
};
