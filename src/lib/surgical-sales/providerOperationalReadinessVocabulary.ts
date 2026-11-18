/**
 * Unified operational readiness — med-device field language (not CRM scoring).
 */

export const OPERATIONAL_READINESS_ENGINE_TITLE = "Operational readiness";
export const OPERATIONAL_READINESS_ENGINE_KICKER =
  "Single field verdict from OR access, workflow, relationship, scheduling, procedure fit, vendor gates, and commercial influence";

export const OPERATIONAL_READINESS_VERDICT_IDS = [
  "not_viable_yet",
  "observation_possible_with_risk",
  "operationally_qualified",
  "evaluation_ready",
  "commercial_expansion_candidate",
] as const;

export type OperationalReadinessVerdictId = (typeof OPERATIONAL_READINESS_VERDICT_IDS)[number];

export const OPERATIONAL_READINESS_VERDICT_LABELS: Record<OperationalReadinessVerdictId, string> = {
  not_viable_yet: "Operational picture still developing",
  observation_possible_with_risk: "Observation possible with risk",
  operationally_qualified: "Operationally qualified",
  evaluation_ready: "Evaluation-ready",
  commercial_expansion_candidate: "Commercial expansion candidate",
};

export const OPERATIONAL_READINESS_VERDICT_SCANS: Record<OperationalReadinessVerdictId, string> = {
  not_viable_yet:
    "Do not book OR time — allowance, access, or vendor gates are not cleared for a productive case day.",
  observation_possible_with_risk:
    "Remote-validate or light OR touch only — observation may fail, slip, or waste a posted case.",
  operationally_qualified:
    "Enough on file to plan observation with controlled risk — coordinator, workflow, and access are mapped.",
  evaluation_ready:
    "Clinical and access foundation supports in-room evaluation in this service line.",
  commercial_expansion_candidate:
    "Champion, preference-card, and deployment path are strong enough to expand supported cases.",
};

/** Seven engine inputs — aligned to rep field workflow. */
export const OPERATIONAL_READINESS_INPUT_IDS = [
  "or_access_maturity",
  "workflow_intelligence",
  "relationship_mapping",
  "scheduling_clarity",
  "procedural_alignment",
  "vendor_pathway",
  "commercialization_influence",
] as const;

export type OperationalReadinessInputId = (typeof OPERATIONAL_READINESS_INPUT_IDS)[number];

export const OPERATIONAL_READINESS_INPUT_LABELS: Record<OperationalReadinessInputId, string> = {
  or_access_maturity: "OR access maturity",
  workflow_intelligence: "Workflow intelligence",
  relationship_mapping: "Relationship mapping",
  scheduling_clarity: "Scheduling clarity",
  procedural_alignment: "Procedural alignment",
  vendor_pathway: "Vendor pathway",
  commercialization_influence: "Commercialization influence",
};
