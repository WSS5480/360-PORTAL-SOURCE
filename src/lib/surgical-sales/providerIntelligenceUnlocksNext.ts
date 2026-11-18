/**
 * Unlocks next — what operational capability becomes possible after a signal is solved.
 * Single source for discovery missions, learning gaps, and capture tasks.
 */

import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export { INTELLIGENCE_UNLOCKS_NEXT_LABEL } from "@/lib/surgical-sales/providerIntelligenceRepVocabulary";

const DEFAULT_CAPABILITY = "Sharper field and OR planning on the next touch";

/**
 * Operational capability phrasing (no "Unlocks" prefix — use format helpers below).
 */
export const INTELLIGENCE_UNLOCKS_NEXT_BY_DB_KEY: Record<string, string> = {
  provider_observation_feasibility: "confident observation scheduling decisions",
  provider_observation_credentialing_needed: "a clear credentialing pathway before OR day",
  provider_ideal_observation_cases: "targeted first-case observation planning",
  provider_observation_access_path: "a mapped observation access and approval workflow",
  provider_observation_coordinator_contact: "a named owner for observation scheduling",
  provider_observation_cadence_preference: "repeatable observation cadence on the calendar",
  provider_observation_best_days_case_types: "bookable case days for field coverage",
  provider_first_observation_questions: "a focused first observation that validates fit",
  provider_procedure_focus: "targeted evaluation positioning",
  provider_technique_preferences: "modality-accurate trial and observation design",
  provider_technique_detail: "setup and dock planning matched to live workflow",
  provider_workflow_pain_points: "conversion hooks tied to real OR friction",
  provider_case_volume_estimate: "territory prioritization grounded in volume",
  provider_or_team_dynamics: "realistic in-room access and turnover expectations",
  provider_credentialing_status: "vendor clearance path clarity before travel",
  provider_current_vendors: "a clear picture of vendors active in cases for evaluation planning",
  provider_support_expectations: "right-sized field and clinical support on case days",
  provider_communication_style: "coordinator handoffs that hold between visits",
  provider_responsiveness: "predictable deal velocity between OR touches",
  influence_level: "economic buyer strategy",
  provider_decision_maker_status: "evaluation motion aimed at the real signatory",
  provider_champion_potential: "internal air cover during trials",
  provider_follow_up_approach: "sustainable momentum without over-contacting the office",
  provider_evaluation_openness: "economic buyer strategy",
  provider_competitive_products: "competitive evaluation framing",
  provider_dissatisfaction_areas: "committee and preference-card narratives with teeth",
  provider_preference_card_signals: "preference-card conversion planning",
};

export function intelligenceUnlocksNextCapability(dbKey: string): string {
  const custom = INTELLIGENCE_UNLOCKS_NEXT_BY_DB_KEY[dbKey];
  if (custom?.trim()) return custom.trim();
  return DEFAULT_CAPABILITY;
}

/** Outcome line for learn-next cards (no framework prefix). */
export function intelligenceUnlocksNextLine(dbKey: string, maxLen = 72): string {
  return scanLine(intelligenceUnlocksNextCapability(dbKey), maxLen);
}

/** Arrow form for paired task → outcome copy */
export function intelligenceUnlocksNextArrow(dbKey: string, maxLen = 72): string {
  return scanLine(`→ ${intelligenceUnlocksNextCapability(dbKey)}`, maxLen);
}
