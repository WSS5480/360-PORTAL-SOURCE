/**
 * Required progression vs optional intelligence — platform-wide rule.
 *
 * Required pathway: Discovery → Observation → Debrief → Evaluation → Commitment → Outcomes
 * Advancement depends ONLY on major stage gates (execution milestones).
 * Optional intelligence improves planning and visibility but never blocks progression.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { isOptionalIntelligenceDbKey } from "@/lib/surgical-sales/optionalIntelligenceCategories";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { buildDiscoveryMilestoneRequirements } from "@/lib/surgical-sales/providerDiscoveryReadinessMilestones";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import type { PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";
import {
  countObservedProcedures,
  hasDebriefCompleted,
  hasObservationApproved,
  isCommitmentStageComplete,
  isDebriefStageComplete,
  isDiscoveryReadyForObserve,
  isEvaluationStageComplete,
  isObserveStageComplete,
  providerSkipsObservationSequence,
} from "@/lib/surgical-sales/pathwayStageGates";

export const PATHWAY_PROGRESSION_POLICY_LEAD =
  "Mission progression beats data completeness. Stages advance only on major execution milestones; optional field intelligence improves planning but never blocks advancement.";

/** Field intelligence that improves execution — never blocks sales pathway stage advancement. */
export const EXECUTION_INTELLIGENCE_DB_KEYS = new Set([
  "provider_observation_coordinator_contact",
  "provider_scheduling_contact",
  "provider_facility_scheduling_contact",
  "provider_observation_scheduling_control",
  "provider_observation_credentialing_needed",
  "provider_credentialing_status",
  "provider_credentialing_platform_name",
  "provider_credentialing_contact",
  "provider_observation_access_path",
  "provider_observation_best_days_case_types",
  "provider_ideal_observation_cases",
  "provider_procedure_focus",
  "provider_technique_preferences",
  "provider_evaluation_openness",
  "provider_competitive_products",
  "provider_preference_card_signals",
  "provider_champion_potential",
  "provider_decision_maker_status",
  "provider_workflow_pain_points",
  "provider_or_team_dynamics",
  "influence_level",
  "provider_communication_style",
  "provider_responsiveness",
]);

export function isExecutionIntelligenceDbKey(dbKey: string | null | undefined): boolean {
  if (!dbKey) return false;
  if (EXECUTION_INTELLIGENCE_DB_KEYS.has(dbKey)) return true;
  return isOptionalIntelligenceDbKey(dbKey);
}

/** Individual CRM fields never block advancement — only hard stage gates do. */
export function intelligenceDbKeyBlocksPathwayAdvancement(_dbKey: string): boolean {
  return false;
}

/** Human-readable gate for each stage transition (enforced in pathwayStageGates). */
export const SALES_PATHWAY_REQUIRED_STAGE_GATES: Record<
  SalesPathwayStageId,
  { gateId: string; label: string; summary: string }
> = {
  discovery: {
    gateId: "observation_permission_confirmed",
    label: "Observation permission confirmed",
    summary: "Observation permission confirmed = Yes on file.",
  },
  observe: {
    gateId: "observation_sequence_complete",
    label: "Observation sequence complete",
    summary: "Five completed observations on file, customer status, or rep marks the sequence complete.",
  },
  debrief: {
    gateId: "debrief_and_product_fit",
    label: "Debrief and product fit validated",
    summary: "Provider debrief completed and product fit validated — not interest or follow-up alone.",
  },
  evaluation: {
    gateId: "evaluation_activity_complete",
    label: "Evaluation activity complete",
    summary:
      "Product trial, 360 experience, in-service, surgeon education, or additional observation completed.",
  },
  commitment: {
    gateId: "commitment_cases_complete",
    label: "Commitment case target met",
    summary: "Structured product-use case target reached on file.",
  },
  outcomes: {
    gateId: "outcomes_tracking_active",
    label: "Outcomes tracking active",
    summary: "Adoption and outcomes tracking underway.",
  },
};

export type PathwayHardGateBlocker = {
  stageId: SalesPathwayStageId;
  signalId: string;
  label: string;
  summary: string | null;
};

function gateMetForStage(stageId: SalesPathwayStageId, input: PathwayGateInput): boolean {
  switch (stageId) {
    case "discovery":
      return isDiscoveryReadyForObserve(input);
    case "observe":
      return isObserveStageComplete(input);
    case "debrief":
      return isDebriefStageComplete(input);
    case "evaluation":
      return isEvaluationStageComplete(input);
    case "commitment":
      return isCommitmentStageComplete(input);
    case "outcomes":
      return true;
    default:
      return false;
  }
}

/** Blockers for the active stage — hard gates only, never optional intelligence fields. */
export function pathwayStageHardGateBlockers(
  stageId: SalesPathwayStageId,
  input: PathwayGateInput,
): PathwayHardGateBlocker[] {
  if (gateMetForStage(stageId, input)) return [];

  const gate = SALES_PATHWAY_REQUIRED_STAGE_GATES[stageId];
  const blockers: PathwayHardGateBlocker[] = [
    {
      stageId,
      signalId: gate.gateId,
      label: gate.label,
      summary: gate.summary,
    },
  ];

  if (stageId === "observe") {
    if (providerSkipsObservationSequence(input.contact)) {
      blockers[0].summary = "Customer — observation series is not required.";
    } else {
      const count = countObservedProcedures(input);
      blockers[0].summary = `${count} of 5 observations complete, or mark the sequence complete.`;
    }
  }
  if (stageId === "debrief" && hasDebriefCompleted(input)) {
    blockers[0].summary =
      "Debrief is complete — validate product fit on file to advance (sentiment and follow-up needed do not advance).";
  }

  return blockers;
}

/** Intelligence db keys and signals used for visibility only — never stage gates. */
export function isPathwayIntelligenceInformational(dbKey: string): boolean {
  return isOptionalIntelligenceDbKey(dbKey);
}

/** Optional intelligence categories must not affect alerts, leaderboard, or needs-action. */
export function optionalIntelligenceAffectsProgression(_dbKey: string): boolean {
  return false;
}

export type PathwayStageGateRequirement = {
  label: string;
  met: boolean;
  dbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
};

/** Requirements that actually gate stage advancement — milestone achievement only. */
export function buildPathwayStageGateRequirements(
  stageId: SalesPathwayStageId,
  input: PathwayGateInput,
): PathwayStageGateRequirement[] {
  if (stageId === "discovery") {
    return buildDiscoveryMilestoneRequirements({
      contact: input.contact,
      engagements: input.engagements,
    });
  }

  const gate = SALES_PATHWAY_REQUIRED_STAGE_GATES[stageId];
  const met = gateMetForStage(stageId, input);
  return [{ label: gate.label, met }];
}

export function observationProgressPercent(input: PathwayGateInput): number {
  if (providerSkipsObservationSequence(input.contact)) return 100;
  const count = countObservedProcedures(input);
  return Math.min(100, Math.round((count / 5) * 100));
}

export function debriefGateMet(input: PathwayGateInput): boolean {
  return hasDebriefCompleted(input);
}

export function discoveryGateMet(input: PathwayGateInput): boolean {
  return hasObservationApproved(input);
}

export type { ProviderEngagementSummary };
