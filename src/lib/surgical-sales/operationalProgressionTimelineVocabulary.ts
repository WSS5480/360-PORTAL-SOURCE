/**
 * Deployment progression timeline — primary path toward field deployment.
 */

import {
  DEPLOYMENT_PROGRESSION_PHASE_IDS,
  DEPLOYMENT_PROGRESSION_PHASE_LABELS,
  type DeploymentProgressionPhaseId,
} from "@/lib/surgical-sales/providerIntelligenceProgressionVocabulary";

export const OPERATIONAL_PROGRESSION_TIMELINE_TITLE = "Deployment progression";
export const OPERATIONAL_PROGRESSION_TIMELINE_KICKER =
  "Movement toward operational deployment — each phase unlocks the next field motion";

export const OPERATIONAL_PROGRESSION_PHASE_IDS = DEPLOYMENT_PROGRESSION_PHASE_IDS;

export type OperationalProgressionPhaseId = DeploymentProgressionPhaseId;

export const OPERATIONAL_PROGRESSION_PHASE_LABELS = DEPLOYMENT_PROGRESSION_PHASE_LABELS;
