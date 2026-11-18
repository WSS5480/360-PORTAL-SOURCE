/**
 * Split vocabulary for intelligence gaps vs discovery coaching.
 *
 * - State labels → what is missing on file (field-sales voice)
 * - Coaching prompts → what to ask on the next touch
 */

import {
  FIELD_SALES_GAP_STATE,
  fieldSalesGapStateLabel,
  fieldSalesStillNeedPhrase,
} from "@/lib/surgical-sales/providerFieldSalesCopy";
import {
  discoveryCoachingPrompt as stakeholderDiscoveryCoachingPrompt,
  type IntelligenceDiscoveryStakeholder,
} from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";

export type IntelligenceGapState = "unknown" | "partial" | "outdated";

export type GapStateLabelDef = { unknown: string; partial?: string };

/** Concise missing-field state — field-sales voice (see providerFieldSalesCopy). */
export const INTELLIGENCE_GAP_STATE_LABELS: Record<string, GapStateLabelDef> = new Proxy(
  {} as Record<string, GapStateLabelDef>,
  {
    get(_target, property) {
      if (typeof property !== "string") return undefined;
      return FIELD_SALES_GAP_STATE[property];
    },
    ownKeys() {
      return Reflect.ownKeys(FIELD_SALES_GAP_STATE);
    },
    getOwnPropertyDescriptor(_target, property) {
      if (typeof property !== "string" || !FIELD_SALES_GAP_STATE[property]) return undefined;
      return { enumerable: true, configurable: true };
    },
  },
);

/** Coaching / action prompts for ranked discovery priorities. */
export const DISCOVERY_COACHING_PROMPTS: Record<string, string> = {
  provider_observation_feasibility: "Ask if they are open to vendor observation for workflow learning",
  provider_ideal_observation_cases: "Ask which procedures are worth watching first",
  provider_observation_access_path: "Ask how observation access works here",
  provider_observation_coordinator_contact: "Ask who coordinates observation scheduling",
  provider_observation_credentialing_needed:
    "Ask what needs to happen before a vendor can observe",
  provider_observation_cadence_preference: "Ask how often observation can realistically happen",
  provider_observation_best_days_case_types:
    "Ask how far in advance observation requests are usually handled",
  provider_first_observation_questions: "List what you still need to validate in the room",
  provider_procedure_focus: "Ask which procedures drive most of their volume",
  provider_technique_preferences: "Confirm open, lap, or robotic mix on upcoming cases",
  provider_technique_detail: "Probe instrument and dock preferences that affect positioning",
  provider_workflow_pain_points: "Ask what creates the most workflow friction today",
  provider_case_volume_estimate: "Quantify weekly volume and case mix patterns",
  provider_or_team_dynamics: "Ask what makes OR workflow smoother or harder on case days",
  provider_credentialing_status: "Confirm where you are in vendor clearance",
  provider_current_vendors: "Ask which vendors are active in their cases — during evaluation",
  provider_support_expectations: "Clarify rep and clinical support they expect in the room",
  provider_communication_style: "Learn how they want updates between visits",
  provider_responsiveness: "Ask how fast the office calls back between case days",
  influence_level: "Ask who shapes technique and workflow choices on their cases",
  provider_decision_maker_status: "Ask who approves evaluations and preference-card changes",
  provider_champion_potential: "Ask whether anyone inside would advocate during evaluation",
  provider_follow_up_approach: "Agree how you'll stay in touch between case days",
  provider_evaluation_openness: "Ask whether they would run a real product evaluation",
  provider_competitive_products: "Ask what systems are entrenched — during evaluation",
  provider_dissatisfaction_areas: "Listen for vendor friction — during evaluation",
  provider_preference_card_signals: "Ask what blocks changes on the preference card",
};

export function intelligenceGapStateLabel(dbKey: string, state: IntelligenceGapState): string {
  if (state === "outdated") return "Needs refresh";
  const def = INTELLIGENCE_GAP_STATE_LABELS[dbKey];
  if (def) {
    if (state === "partial" && def.partial) return def.partial;
    return def.unknown;
  }
  return fieldSalesGapStateLabel(dbKey, state);
}

/** Short clause for bundled open-field summaries */
export function intelligenceGapStillNeedPhrase(dbKey: string): string {
  return fieldSalesStillNeedPhrase(dbKey);
}

export function discoveryCoachingPrompt(
  dbKey: string,
  fieldLabelFallback?: string,
  discoveryStakeholder: IntelligenceDiscoveryStakeholder = "unspecified",
): string {
  if (discoveryStakeholder !== "unspecified") {
    const tailored = stakeholderDiscoveryCoachingPrompt(dbKey, discoveryStakeholder);
    if (tailored) return tailored;
  }
  const prompt = DISCOVERY_COACHING_PROMPTS[dbKey];
  if (prompt) return prompt;
  const label = (fieldLabelFallback ?? dbKey).toLowerCase();
  return `Ask what they can share about ${label}`;
}

/** @deprecated Use INTELLIGENCE_GAP_STATE_LABELS — kept for imports/tests during transition. */
export const INTELLIGENCE_LEARNING_GAP_PHRASES = INTELLIGENCE_GAP_STATE_LABELS;
