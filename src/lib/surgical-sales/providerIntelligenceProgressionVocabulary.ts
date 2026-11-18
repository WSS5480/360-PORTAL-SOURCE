/**
 * Intelligence progression — movement toward operational deployment (not static documentation).
 */

export const INTELLIGENCE_PROGRESSION_DASHBOARD_TITLE = "Field readiness path";
export const INTELLIGENCE_PROGRESSION_DASHBOARD_KICKER =
  "How account understanding builds before you spend time in the field";

export const PROGRESSION_LANE_IDS = [
  "operational_maturity",
  "deployment_progression",
  "observation_readiness",
  "commercialization",
] as const;

export type IntelligenceProgressionLaneId = (typeof PROGRESSION_LANE_IDS)[number];

import { PROGRESSION_LANE_LABELS_INVESTIGATION } from "@/lib/surgical-sales/providerIntelligenceInvestigationLabels";

export const PROGRESSION_LANE_LABELS: Record<IntelligenceProgressionLaneId, string> = {
  operational_maturity: PROGRESSION_LANE_LABELS_INVESTIGATION.operational_maturity,
  deployment_progression: PROGRESSION_LANE_LABELS_INVESTIGATION.deployment_progression,
  observation_readiness: PROGRESSION_LANE_LABELS_INVESTIGATION.observation_readiness,
  commercialization: PROGRESSION_LANE_LABELS_INVESTIGATION.commercialization,
};

export const DEPLOYMENT_PROGRESSION_PHASE_LABELS = {
  discovery: "Early discovery",
  access_mapping: "Access mapping",
  observation_feasible: "Observation validated",
  workflow_validated: "Workflow aligned",
  evaluation_ready: "Evaluation-ready",
  commercialization_ready: "Commercialization-ready",
} as const;

export type DeploymentProgressionPhaseId = keyof typeof DEPLOYMENT_PROGRESSION_PHASE_LABELS;

export const DEPLOYMENT_PROGRESSION_PHASE_IDS = [
  "discovery",
  "access_mapping",
  "observation_feasible",
  "workflow_validated",
  "evaluation_ready",
  "commercialization_ready",
] as const satisfies readonly DeploymentProgressionPhaseId[];

/** Observation readiness evolution — four beats on the OR path. */
export const OBSERVATION_READINESS_EVOLUTION_STEPS = [
  { id: "unmapped", label: "Path unmapped" },
  { id: "access_emerging", label: "Access emerging" },
  { id: "observation_validated", label: "Observation validated" },
  { id: "or_rhythm_proven", label: "OR rhythm proven" },
] as const;

/** Commercialization progression — aligned to workflow motion. */
export const COMMERCIALIZATION_PROGRESSION_STEPS = [
  { id: "early_discovery", label: "Early discovery" },
  { id: "observation_motion", label: "Observation motion" },
  { id: "evaluation_ready", label: "Evaluation-ready" },
  { id: "commercialization_ready", label: "Commercialization-ready" },
] as const;

/** Operational maturity — rep-facing evolution (maps to intelligence maturity). */
export const OPERATIONAL_MATURITY_EVOLUTION_STEPS = [
  { id: "early_discovery", label: "Early discovery" },
  { id: "access_mapping", label: "Access mapping" },
  { id: "observation_ready", label: "Observation ready" },
  { id: "evaluation_active", label: "Evaluation active" },
  { id: "adoption_building", label: "Adoption building" },
  { id: "strategic_account", label: "Strategic account" },
] as const;
