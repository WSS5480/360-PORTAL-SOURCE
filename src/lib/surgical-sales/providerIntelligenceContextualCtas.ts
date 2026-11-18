/**
 * Operationally meaningful CTA copy for Provider Intelligence — no generic "Capture signal".
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { intelligenceFieldDisplayName } from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";

export type IntelligenceStatusCardId =
  | "observation_pathway"
  | "workflow_understanding"
  | "commercial_influence"
  | "relationship_confidence";

export type IntelligenceStatusCardConfidence = "low" | "partial" | "strong" | "validated";

/** Primary action when a specific field is the top gap. */
export const INTELLIGENCE_CAPTURE_CTA_BY_FIELD: Record<string, string> = {
  provider_observation_feasibility: "Confirm observation allowance",
  provider_observation_credentialing_needed: "Complete credentialing",
  provider_ideal_observation_cases: "Confirm observable procedures",
  provider_observation_access_path: "Add OR access details",
  provider_observation_coordinator_contact: "Confirm OR scheduling owner",
  provider_observation_cadence_preference: "Confirm OR posting rhythm",
  provider_observation_best_days_case_types: "Confirm bookable case days",
  provider_first_observation_questions: "List in-room validation items",
  provider_procedure_focus: "Confirm procedure focus",
  provider_technique_preferences: "Confirm technique mix",
  provider_technique_detail: "Confirm technique preferences",
  provider_workflow_pain_points: "Document workflow friction",
  provider_case_volume_estimate: "Confirm weekly case volume",
  provider_or_team_dynamics: "Confirm OR team access",
  provider_credentialing_status: "Confirm vendor clearance",
  provider_current_vendors: "Confirm vendors in cases",
  provider_support_expectations: "Confirm in-room support level",
  provider_communication_style: "Confirm surgeon contact style",
  provider_responsiveness: "Confirm office response time",
  influence_level: "Confirm who influences cases",
  provider_decision_maker_status: "Confirm who approves evaluations",
  provider_champion_potential: "Confirm internal vendor support",
  provider_follow_up_approach: "Confirm follow-up between visits",
  provider_evaluation_openness: "Confirm trial willingness",
  provider_competitive_products: "Confirm competitive footprint",
  provider_dissatisfaction_areas: "Document vendor pain points",
  provider_preference_card_signals: "Confirm preference-card path",
};

/** When a validated signal needs refresh. */
export const INTELLIGENCE_REVALIDATE_CTA_BY_FIELD: Record<string, string> = {
  provider_observation_feasibility: "Re-confirm observation allowance",
  provider_observation_credentialing_needed: "Re-validate observation rules",
  provider_ideal_observation_cases: "Refresh ideal case mix",
  provider_observation_access_path: "Refresh OR access details",
  provider_observation_coordinator_contact: "Refresh OR coordinator",
  provider_observation_cadence_preference: "Re-confirm scheduling cadence",
  provider_observation_best_days_case_types: "Refresh observation days",
  provider_first_observation_questions: "Update first-case questions",
  provider_procedure_focus: "Refresh procedure focus",
  provider_technique_preferences: "Re-confirm technique mix",
  provider_technique_detail: "Refresh technique detail",
  provider_workflow_pain_points: "Re-confirm workflow friction",
  provider_case_volume_estimate: "Refresh volume estimate",
  provider_or_team_dynamics: "Re-confirm OR dynamics",
  provider_credentialing_status: "Re-confirm credentialing",
  provider_current_vendors: "Refresh vendors in cases",
  provider_support_expectations: "Re-confirm support expectations",
  provider_communication_style: "Re-confirm engagement style",
  provider_responsiveness: "Re-check office response time",
  influence_level: "Re-confirm who influences cases",
  provider_decision_maker_status: "Re-confirm who approves evaluations",
  provider_champion_potential: "Re-check internal vendor support",
  provider_follow_up_approach: "Re-confirm follow-up plan",
  provider_evaluation_openness: "Re-ask about trial willingness",
  provider_competitive_products: "Refresh competitive landscape",
  provider_dissatisfaction_areas: "Refresh dissatisfaction drivers",
  provider_preference_card_signals: "Re-read preference-card path",
};

export const INTELLIGENCE_REVIEW_CTA_BY_CARD: Record<IntelligenceStatusCardId, string> = {
  observation_pathway: "Review observation path",
  workflow_understanding: "Review workflow map",
  commercial_influence: "Review commercial posture",
  relationship_confidence: "Review influence map",
};

export const INTELLIGENCE_AREA_FALLBACK_CAPTURE_CTA: Record<IntelligenceStatusCardId, string> = {
  observation_pathway: "Confirm observation path",
  workflow_understanding: "Document clinical workflow",
  commercial_influence: "Confirm commercial path",
  relationship_confidence: "Confirm adoption influence",
};

const CARD_PRIMARY_SECTION: Record<IntelligenceStatusCardId, ProviderIntelligenceSectionId> = {
  observation_pathway: "observation_readiness",
  workflow_understanding: "clinical_workflow",
  commercial_influence: "commercial_signals",
  relationship_confidence: "relationship_intelligence",
};

export type IntelligenceContextualCtaOptions = {
  /** Use re-validation wording (stale validated signals). */
  revalidate?: boolean;
};

export function intelligenceContextualCaptureCta(
  dbKey: string,
  options?: IntelligenceContextualCtaOptions,
): string {
  const map = options?.revalidate
    ? INTELLIGENCE_REVALIDATE_CTA_BY_FIELD
    : INTELLIGENCE_CAPTURE_CTA_BY_FIELD;
  const direct = map[dbKey];
  if (direct) return direct;
  const label = intelligenceFieldDisplayName(dbKey);
  if (options?.revalidate) return `Reconfirm ${label.toLowerCase()}`;
  return `Confirm ${label.toLowerCase()}`;
}

/** @deprecated Alias — discovery priorities and quick strips use capture CTAs. */
export function discoveryPriorityCaptureLabel(dbKey: string): string {
  return intelligenceContextualCaptureCta(dbKey);
}

export function intelligenceContextualReviewCta(cardId: IntelligenceStatusCardId): string {
  return INTELLIGENCE_REVIEW_CTA_BY_CARD[cardId];
}

export function intelligenceContextualStatusCardCta(input: {
  cardId: IntelligenceStatusCardId;
  confidence: IntelligenceStatusCardConfidence;
  topGap: IntelligenceLearningGap | null;
}): {
  ctaLabel: string;
  ctaMode: "capture" | "review";
  targetSectionId: ProviderIntelligenceSectionId;
  targetDbKey: string | null;
} {
  const targetSectionId = input.topGap?.sectionId ?? CARD_PRIMARY_SECTION[input.cardId];
  const targetDbKey = input.topGap?.dbKey ?? null;

  if (input.confidence === "validated" || (input.confidence === "strong" && !input.topGap)) {
    return {
      ctaLabel: intelligenceContextualReviewCta(input.cardId),
      ctaMode: "review",
      targetSectionId,
      targetDbKey,
    };
  }

  if (targetDbKey) {
    const revalidate = input.topGap?.state === "outdated";
    return {
      ctaLabel: intelligenceContextualCaptureCta(targetDbKey, { revalidate }),
      ctaMode: "capture",
      targetSectionId,
      targetDbKey,
    };
  }

  return {
    ctaLabel: INTELLIGENCE_AREA_FALLBACK_CAPTURE_CTA[input.cardId],
    ctaMode: "capture",
    targetSectionId,
    targetDbKey,
  };
}

/** Short label for compact chips (quick-scan strips). */
export function intelligenceContextualChipLabel(dbKey: string): string {
  const cta = intelligenceContextualCaptureCta(dbKey);
  if (cta.length <= 28) return cta;
  const map = INTELLIGENCE_CAPTURE_CTA_BY_FIELD[dbKey];
  if (map) {
    const words = map.split(" ");
    if (words.length >= 2) return `${words[0]} ${words[1]}…`;
  }
  return cta.slice(0, 26).trimEnd() + "…";
}
