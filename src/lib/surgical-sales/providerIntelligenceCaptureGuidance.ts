/**
 * Operational “Why this matters” copy for intelligence capture — sections and fields.
 * Short, field-focused, non-salesy. Used in guided capture, full-form edit, and discovery priorities.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

export const WHY_THIS_MATTERS_LABEL = "Why this matters";

/** One-line rationale per intelligence section (major capture area). */
export const PROVIDER_INTELLIGENCE_SECTION_WHY_IT_MATTERS: Record<
  ProviderIntelligenceSectionId,
  string
> = {
  observation_readiness:
    "Shows whether observation or in-room evaluation is realistic before you commit scheduling and credentialing time.",
  clinical_workflow:
    "Procedure mix and workflow friction define which cases matter and what to validate on a live day.",
  or_environment:
    "Maps how observation access and clearance work before you commit credentialing time or case days.",
  relationship_intelligence:
    "Maps how to reach stakeholders between case days — not incumbent vendor footprint.",
  commercial_signals:
    "Surfaces evaluation appetite, vendors in cases, and what still blocks adoption — after operational access is mapped.",
};

/** One-line rationale per capture field. */
export const INTELLIGENCE_FIELD_WHY_IT_MATTERS: Record<string, string> = {
  provider_observation_feasibility:
    "Confirms whether observation is allowed before you invest in credentialing and scheduling.",
  provider_observation_credentialing_needed:
    "Surfaces credentialing and vendor approval steps that delay the first case day.",
  provider_ideal_observation_cases:
    "Targets procedures that produce usable workflow intelligence on the first observation.",
  provider_observation_access_path:
    "Documents how observation access works — approvals, scheduler rules, and steps before the first case day.",
  provider_observation_coordinator_contact:
    "Identifies who coordinates vendor observation scheduling and owns the OR calendar.",
  provider_observation_cadence_preference:
    "Sets how often case-day access can realistically happen for validation work.",
  provider_observation_best_days_case_types:
    "Defines how far ahead cases post so observation can be booked, not just discussed.",
  provider_first_observation_questions:
    "Keeps the first case day focused on workflow facts you still need on file.",
  provider_procedure_focus:
    "Aligns field time to procedures that actually drive volume at this account.",
  provider_technique_preferences:
    "Open, lap, and robotic mix shapes setup, positioning, and what to watch in the room.",
  provider_technique_detail:
    "Dock, approach, and instrument choices affect in-room workflow and trial design.",
  provider_workflow_pain_points:
    "Documents turnover and setup friction that matter for procedural change conversations.",
  provider_case_volume_estimate:
    "Volume band helps prioritize case days and forecast where adoption could land.",
  provider_or_team_dynamics:
    "Captures OR workflow rhythm and friction on case days — not who already has vendor access.",
  provider_credentialing_status:
    "Clarifies vendor approval paths and whether credentialing is the real gate before case coverage.",
  provider_current_vendors:
    "Maps which vendors are active in cases — useful during evaluation, not required for intro or observation prep.",
  provider_support_expectations:
    "Clarifies rep and clinical support expected during cases and observations.",
  provider_communication_style:
    "Defines how updates should flow between visits without coordinator bottlenecks.",
  provider_responsiveness:
    "Shows whether the office or provider returns outreach between scheduled case days.",
  influence_level: "Identifies who controls procedural adoption decisions.",
  provider_decision_maker_status:
    "Separates who approves evaluations from people who only influence cases.",
  provider_champion_potential:
    "Signals whether someone internal would advocate if the workflow fit is strong.",
  provider_follow_up_approach:
    "Documents agreed touch rhythm so access does not stall after a case day.",
  provider_evaluation_openness:
    "Shows whether a formal evaluation path is realistic versus observation-only work.",
  provider_competitive_products:
    "Maps systems in active use — informs evaluation design after operational access is clear.",
  provider_dissatisfaction_areas:
    "Captures vendor or workflow friction that opens a procedural change discussion.",
  provider_preference_card_signals:
    "Surfaces committee, proof, or card blockers before adoption work proceeds.",
};

export function intelligenceSectionWhyItMatters(
  sectionId: ProviderIntelligenceSectionId,
): string {
  return PROVIDER_INTELLIGENCE_SECTION_WHY_IT_MATTERS[sectionId] ?? "";
}

export function intelligenceFieldWhyItMatters(dbKey: string): string | undefined {
  const text = INTELLIGENCE_FIELD_WHY_IT_MATTERS[dbKey]?.trim();
  return text || undefined;
}

/** Apply canonical why-it-matters copy onto progressive discovery prompts. */
export function applyFieldWhyItMattersToPrompts<
  T extends { whyItMatters?: string },
>(prompts: Record<string, T>): Record<string, T> {
  const out = { ...prompts };
  for (const [dbKey, def] of Object.entries(out)) {
    const why = intelligenceFieldWhyItMatters(dbKey);
    if (why) out[dbKey] = { ...def, whyItMatters: why };
  }
  return out;
}
