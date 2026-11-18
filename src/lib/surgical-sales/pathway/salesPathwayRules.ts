/**
 * 360 Medical Sales Pathway — global rules layer.
 *
 * Official stages: Discovery → Observation → Debrief → Evaluation → Commitment → Outcomes
 *
 * Required progression vs optional intelligence: @/lib/surgical-sales/pathway/pathwayProgressionPolicy
 * Stage advancement is evidence-gated only — never from optional field knowledge or operational artifacts alone.
 */

import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";

/** Official pathway stage order (single source of truth for labels lives in salesPathwayCanonical). */
export const SALES_PATHWAY_OFFICIAL_STAGE_ORDER: readonly SalesPathwayStageId[] = [
  "discovery",
  "observe",
  "debrief",
  "evaluation",
  "commitment",
  "outcomes",
] as const;

/** Stage goals — why the provider remains in each stage. */
export const SALES_PATHWAY_STAGE_GOALS: Record<SalesPathwayStageId, string> = {
  discovery: "Secure observation approval.",
  observe: "Complete 5 observed cases.",
  debrief:
    "Review findings with the provider and validate whether a 360 Medical solution adds value.",
  evaluation:
    "Evaluate a product through Product Trial, 360 Experience, In-Service, Surgeon Education, or Additional Observation.",
  commitment: "Provider agrees to structured product use.",
  outcomes: "Track utilization, outcomes, and QTi.",
};

/**
 * Evaluation activities — not pathway stages.
 * 360 Experience is an evaluation activity, not a required stage.
 */
export const SALES_PATHWAY_EVALUATION_ACTIVITY_LABELS = [
  "Product Trial",
  "360 Experience",
  "In-Service",
  "Surgeon Education",
  "Additional Observation",
] as const;

export type SalesPathwayEvaluationActivityLabel = (typeof SALES_PATHWAY_EVALUATION_ACTIVITY_LABELS)[number];

/** Documented transition rules (human-readable; enforced in pathwayStageGates). */
export const SALES_PATHWAY_TRANSITION_RULES = {
  discovery_to_observation: "observation_approved = Yes (validated on file only).",
  observation_to_debrief:
    "completed_observation_count >= 5 OR customer OR provider_observation_sequence_complete = Yes",
  debrief_to_evaluation: "debrief_completed = true AND product_fit_validated = true",
  evaluation_to_commitment:
    "Product evaluation activity completed OR explicit provider commitment (360 Experience optional).",
  commitment_to_outcomes: "Commitment case target met on file.",
} as const;

/**
 * Events that must never advance pathway stage on their own.
 * Milestones like scheduler identified and credentialing path remain discovery work.
 */
export const SALES_PATHWAY_NON_ADVANCING_EVENTS = [
  "engagement_created",
  "briefing_created",
  "template_generated",
  "optional_intelligence_entry",
  "scheduler_identified",
  "credentialing_path_entered",
  "notes_without_confirmed_outcome",
  "positive_sentiment",
  "interest_signal",
  "implied_openness",
  "follow_up_needed",
  "conditional_access",
] as const;

export type SalesPathwayNonAdvancingEvent = (typeof SALES_PATHWAY_NON_ADVANCING_EVENTS)[number];

export function isNonAdvancingPathwayEvent(event: string): event is SalesPathwayNonAdvancingEvent {
  return (SALES_PATHWAY_NON_ADVANCING_EVENTS as readonly string[]).includes(event);
}

/** Next stage in the official pathway, or null at Outcomes. */
export function nextSalesPathwayStage(stageId: SalesPathwayStageId): SalesPathwayStageId | null {
  const index = SALES_PATHWAY_OFFICIAL_STAGE_ORDER.indexOf(stageId);
  if (index < 0 || index >= SALES_PATHWAY_OFFICIAL_STAGE_ORDER.length - 1) return null;
  return SALES_PATHWAY_OFFICIAL_STAGE_ORDER[index + 1] ?? null;
}

export function salesPathwayStageGoal(stageId: SalesPathwayStageId): string {
  return SALES_PATHWAY_STAGE_GOALS[stageId];
}
