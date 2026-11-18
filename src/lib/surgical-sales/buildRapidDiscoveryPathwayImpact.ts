/**
 * Rapid Discovery — pathway impact lines after each answer.
 */

import type { RapidDiscoveryOperationalStatus } from "@/lib/surgical-sales/rapidDiscoveryOperationalStatus";
import { rapidDiscoveryRequirementLink } from "@/lib/surgical-sales/rapidDiscoverySupportContact";

const PATHWAY_IMPACT_BY_DB_KEY: Partial<Record<string, string[]>> = {
  provider_observation_feasibility: ["Observation approval status updated"],
  provider_observation_coordinator_contact: ["Scheduling owner identified"],
  provider_observation_access_path: ["Facility/vendor pathway understood"],
  provider_observation_credentialing_needed: ["Facility/vendor pathway understood"],
  provider_observation_best_days_case_types: ["Observation logistics understood"],
  provider_observation_cadence_preference: ["Observation cadence understood"],
  provider_procedure_focus: ["Workflow fit signal on file"],
  provider_evaluation_openness: ["Provider interest signal captured"],
  provider_credentialing_status: ["Facility/vendor pathway understood"],
  provider_champion_potential: ["Clinical champion identified"],
  provider_or_team_dynamics: ["Clinical champion identified"],
  provider_decision_maker_status: ["Decision influence mapped"],
  influence_level: ["Decision influence mapped"],
};

export type RapidDiscoveryPathwayImpact = {
  lines: string[];
  requirementLink: ReturnType<typeof rapidDiscoveryRequirementLink>;
};

export function buildRapidDiscoveryPathwayImpact(input: {
  dbKey: string;
  operationalStatus: RapidDiscoveryOperationalStatus;
  contactName?: string | null;
}): RapidDiscoveryPathwayImpact {
  const lines = [...(PATHWAY_IMPACT_BY_DB_KEY[input.dbKey] ?? [])];
  if (input.operationalStatus === "cleared") {
    lines.push("Requirement ready to validate");
  }
  if (input.operationalStatus === "blocked") {
    lines.push("Observation logistics blocked until resolved");
  }
  if (input.operationalStatus === "requires_approval") {
    lines.push("Awaiting approval before field motion");
  }

  const requirementLink = rapidDiscoveryRequirementLink({
    dbKey: input.dbKey,
    operationalStatus: input.operationalStatus,
    contactName: input.contactName,
  });

  return { lines, requirementLink };
}
