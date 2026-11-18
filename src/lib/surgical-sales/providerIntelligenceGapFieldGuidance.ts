/**
 * Executable field guidance per open intelligence gap — who to ask, how, and when.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { intelligenceFieldDisplayName } from "@/lib/surgical-sales/providerIntelligenceLifecycle";

import { PROVIDER_INTEL_DISCOVERY_CARD } from "@/lib/surgical-sales/providerIntelligenceRepVocabulary";

export const INTELLIGENCE_GAP_FIELD_GUIDANCE_LABELS = {
  bestSource: PROVIDER_INTEL_DISCOVERY_CARD.bestPersonToAsk,
  bestInteraction: "Good moment to ask",
  idealTiming: "When to ask",
} as const;

export type IntelligenceGapFieldGuidance = {
  bestSource: string;
  bestInteraction: string;
  idealTiming: string;
};

const SECTION_FIELD_GUIDANCE: Record<ProviderIntelligenceSectionId, IntelligenceGapFieldGuidance> = {
  observation_readiness: {
    bestSource: "OR scheduler or coordinator",
    bestInteraction: "Pre-case scheduling call",
    idealTiming: "Before scheduling observation",
  },
  clinical_workflow: {
    bestSource: "Scrub tech or circulating nurse",
    bestInteraction: "Live case debrief",
    idealTiming: "Next case day",
  },
  or_environment: {
    bestSource: "OR scheduler, materials manager, or credentialing office",
    bestInteraction: "OR access and vendor clearance conversation",
    idealTiming: "Before you commit credentialing time or case days",
  },
  relationship_intelligence: {
    bestSource: "Office manager or surgeon",
    bestInteraction: "Relationship mapping conversation",
    idealTiming: "Next touch",
  },
  commercial_signals: {
    bestSource: "Office manager or supply chain",
    bestInteraction: "Post-case debrief",
    idealTiming: "After first supported case or evaluation touch",
  },
};

/** Per-field executable guidance — shared by gaps, overview scan, and discovery queue. */
export const INTELLIGENCE_GAP_FIELD_GUIDANCE: Record<string, IntelligenceGapFieldGuidance> = {
  provider_observation_feasibility: {
    bestSource: "Practice manager or surgeon",
    bestInteraction: "Allowance conversation",
    idealTiming: "Before scheduling observation",
  },
  provider_observation_credentialing_needed: {
    bestSource: "Credentialing coordinator",
    bestInteraction: "Credentialing checklist review",
    idealTiming: "Before first case day",
  },
  provider_ideal_observation_cases: {
    bestSource: "Surgeon and scheduler",
    bestInteraction: "Case mix planning session",
    idealTiming: "When building observation plan",
  },
  provider_observation_access_path: {
    bestSource: "OR scheduler",
    bestInteraction: "Pre-case scheduling call",
    idealTiming: "Before scheduling observation",
  },
  provider_observation_coordinator_contact: {
    bestSource: "OR scheduler",
    bestInteraction: "Scheduling owner introduction",
    idealTiming: "Before holding first observation slot",
  },
  provider_observation_cadence_preference: {
    bestSource: "OR coordinator",
    bestInteraction: "Cadence alignment call",
    idealTiming: "Before repeating observation trips",
  },
  provider_observation_best_days_case_types: {
    bestSource: "Scheduler",
    bestInteraction: "Posting window review",
    idealTiming: "When scheduling observation",
  },
  provider_first_observation_questions: {
    bestSource: "Surgeon and clinical lead",
    bestInteraction: "Pre-case huddle",
    idealTiming: "Day before first observation",
  },
  provider_procedure_focus: {
    bestSource: "Surgeon",
    bestInteraction: "Case log review",
    idealTiming: "Next surgeon touch",
  },
  provider_technique_preferences: {
    bestSource: "Surgeon or PA",
    bestInteraction: "Preference card walkthrough",
    idealTiming: "Before targeting cases",
  },
  provider_technique_detail: {
    bestSource: "Scrub tech or PA",
    bestInteraction: "Setup and dock walkthrough",
    idealTiming: "First observation case day",
  },
  provider_workflow_pain_points: {
    bestSource: "Scrub tech or circulating nurse",
    bestInteraction: "Turnover and setup debrief",
    idealTiming: "During or after live case",
  },
  provider_case_volume_estimate: {
    bestSource: "Surgeon or scheduler",
    bestInteraction: "Volume band confirmation",
    idealTiming: "Before capacity planning",
  },
  provider_or_team_dynamics: {
    bestSource: "Charge nurse",
    bestInteraction: "Live case shadow",
    idealTiming: "Observation or case day",
  },
  provider_credentialing_status: {
    bestSource: "Vendor credentialing office",
    bestInteraction: "Clearance status check-in",
    idealTiming: "Before case booking",
  },
  provider_current_vendors: {
    bestSource: "OR scheduler or materials manager",
    bestInteraction: "Who is already in the room on cases",
    idealTiming: "On a case day or pre-case scheduling call",
  },
  provider_support_expectations: {
    bestSource: "Coordinator and surgeon",
    bestInteraction: "Support-level alignment",
    idealTiming: "Before first supported case",
  },
  provider_communication_style: {
    bestSource: "Office manager",
    bestInteraction: "Channel preference check",
    idealTiming: "Next office touch",
  },
  provider_responsiveness: {
    bestSource: "Office staff or scheduler",
    bestInteraction: "Response pattern probe",
    idealTiming: "Between case days",
  },
  influence_level: {
    bestSource: "Office manager or supply chain",
    bestInteraction: "Post-case debrief",
    idealTiming: "After first supported case or evaluation touch",
  },
  provider_decision_maker_status: {
    bestSource: "Office manager",
    bestInteraction: "Who approves evaluations conversation",
    idealTiming: "Before evaluation proposal",
  },
  provider_champion_potential: {
    bestSource: "Nursing leadership",
    bestInteraction: "Internal support conversation",
    idealTiming: "After positive case outcome",
  },
  provider_follow_up_approach: {
    bestSource: "Coordinator",
    bestInteraction: "Follow-up plan agreement",
    idealTiming: "After this engagement",
  },
  provider_evaluation_openness: {
    bestSource: "Surgeon or supply chain lead",
    bestInteraction: "Evaluation appetite conversation",
    idealTiming: "Before trial proposal",
  },
  provider_competitive_products: {
    bestSource: "Materials manager",
    bestInteraction: "Preference card review",
    idealTiming: "Before positioning conversation",
  },
  provider_dissatisfaction_areas: {
    bestSource: "Nurse or surgeon",
    bestInteraction: "Pain-point listen",
    idealTiming: "Post-case or office visit",
  },
  provider_preference_card_signals: {
    bestSource: "Materials manager",
    bestInteraction: "Card committee prep call",
    idealTiming: "Before card change push",
  },
};

export function intelligenceGapFieldGuidance(
  dbKey: string,
  sectionId?: ProviderIntelligenceSectionId,
): IntelligenceGapFieldGuidance {
  const direct = INTELLIGENCE_GAP_FIELD_GUIDANCE[dbKey];
  if (direct) return direct;

  if (sectionId && SECTION_FIELD_GUIDANCE[sectionId]) {
    return SECTION_FIELD_GUIDANCE[sectionId];
  }

  const label = intelligenceFieldDisplayName(dbKey);
  return {
    bestSource: "Office or clinical contact",
    bestInteraction: `${label} capture conversation`,
    idealTiming: "Next touch",
  };
}

export function intelligenceGapBestSource(
  dbKey: string,
  sectionId?: ProviderIntelligenceSectionId,
): string {
  return intelligenceGapFieldGuidance(dbKey, sectionId).bestSource;
}

export function intelligenceGapBestInteraction(
  dbKey: string,
  sectionId?: ProviderIntelligenceSectionId,
): string {
  return intelligenceGapFieldGuidance(dbKey, sectionId).bestInteraction;
}

export function intelligenceGapIdealTiming(
  dbKey: string,
  sectionId?: ProviderIntelligenceSectionId,
): string {
  return intelligenceGapFieldGuidance(dbKey, sectionId).idealTiming;
}
