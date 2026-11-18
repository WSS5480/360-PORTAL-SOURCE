/**
 * Provider overview — direct field-risk language (titles + consequences).
 * Field-tested phrasing: what may fail, without hypotheticals or AI analysis tone.
 */

import type { ProtectFieldTimeDimensionId } from "@/lib/surgical-sales/protectFieldTimeVocabulary";
import type { ProviderOperationalRiskId } from "@/lib/surgical-sales/buildProviderOperationalRisks";

export const OVERVIEW_RISK_TITLE_MAX_WORDS = 7;

const BANNED_TITLE_RE =
  /\b(travel risk|wasted or travel|protect field time|feasibility still soft|operational impact)\b/i;
const DASH_CLAUSE_RE = /\s*—\s*/;
const BANNED_DESCRIPTION_RE =
  /\b(assuming|assumes|may assume|operational problem|business risk|field inefficiency|proceeding without|investing rep|equating|treating prior)\b/i;

export type OverviewRiskTitleInput = {
  riskId?: ProviderOperationalRiskId | string;
  protectDimensionId?: ProtectFieldTimeDimensionId;
  dbKey?: string;
  rawHeadline?: string;
};

export const OVERVIEW_RISK_TITLE_BY_RISK_ID: Record<ProviderOperationalRiskId, string> = {
  credentialing_unknown: "Vendor clearance not confirmed",
  or_access_blockers: "OR access not confirmed",
  incumbent_vendor_strength: "Incumbent vendor on file",
  unclear_influence_structure: "Buying path not mapped",
  scheduling_uncertainty: "Scheduling not locked",
  weak_engagement_responsiveness: "Office response is slow",
};

export const OVERVIEW_RISK_TITLE_BY_PROTECT_DIMENSION: Record<ProtectFieldTimeDimensionId, string> = {
  wasted_or_travel: "OR access not confirmed",
  observation_failure: "Observation not confirmed",
  wrong_procedure_target: "Procedure focus not set",
  scheduling_collapse: "Case schedule unstable",
  vendor_gate_failure: "Vendor clearance not confirmed",
};

export const OVERVIEW_RISK_TITLE_BY_DB_KEY: Record<string, string> = {
  provider_observation_access_path: "OR access not confirmed",
  provider_observation_feasibility: "Observation not confirmed",
  provider_observation_credentialing_needed: "Credentialing not confirmed",
  provider_observation_coordinator_contact: "Scheduling owner not named",
  provider_observation_cadence_preference: "OR rhythm not confirmed",
  provider_observation_best_days_case_types: "Case days not confirmed",
  provider_ideal_observation_cases: "Target cases not set",
  provider_credentialing_status: "Vendor clearance not confirmed",
  provider_current_vendors: "Incumbent vendor rules unclear",
  provider_competitive_products: "Competitive picture still developing",
  provider_procedure_focus: "Procedure focus not set",
  provider_workflow_pain_points: "Workflow friction not mapped",
  provider_or_team_dynamics: "OR team access uncertain",
  provider_technique_preferences: "Technique mix not confirmed",
  provider_responsiveness: "Office response is slow",
  influence_level: "Trial influence not confirmed",
  provider_decision_maker_status: "Decision role not confirmed",
  provider_champion_potential: "Champion not confirmed",
  relationship_strength: "Relationship still thin",
};

/** Direct field consequence — one line, “may fail / wasted / break down” pattern. */
export const OVERVIEW_RISK_DESCRIPTION_BY_RISK_ID: Record<ProviderOperationalRiskId, string> = {
  credentialing_unknown: "Observation may fail if vendor clearance is not confirmed.",
  or_access_blockers: "Observation access may break down at the OR desk.",
  incumbent_vendor_strength: "Trial time may be wasted if incumbent access rules are unclear.",
  unclear_influence_structure: "Case day may be wasted if you are not with the decision-maker.",
  scheduling_uncertainty: "Case day may be wasted without a scheduling owner.",
  weak_engagement_responsiveness: "Follow-up may stall if the office does not respond between case days.",
};

export const OVERVIEW_RISK_DESCRIPTION_BY_DB_KEY: Record<string, string> = {
  provider_observation_feasibility: "Observation may fail if allowance is not confirmed.",
  provider_observation_access_path: "Observation access may break down at the OR desk.",
  provider_observation_credentialing_needed: "Observation may fail if credentialing is not cleared.",
  provider_observation_coordinator_contact: "Case day may be wasted without a scheduling owner.",
  provider_observation_cadence_preference: "Case day may land on the wrong posting window.",
  provider_observation_best_days_case_types: "Case day may land on low-signal posted cases.",
  provider_ideal_observation_cases: "Observation may miss the cases that matter for trial proof.",
  provider_credentialing_status: "Observation may fail if vendor clearance is not confirmed.",
  provider_current_vendors: "OR time may be wasted if incumbent vendor rules block entry.",
  provider_competitive_products: "Trial talk may miss who is already in the room.",
  provider_procedure_focus: "OR day may be wasted on the wrong procedure mix.",
  provider_technique_preferences: "OR day may miss the technique mix you need to see.",
  provider_workflow_pain_points: "Turnover pain may be misread without in-room confirmation.",
  provider_or_team_dynamics: "In-room time may be cut short by OR team rules.",
  provider_responsiveness: "Follow-up may stall if the office does not respond between case days.",
  influence_level: "Trial motion may stall if buying influence is not confirmed.",
  provider_decision_maker_status: "Preference-card work may stall without the signatory mapped.",
  provider_champion_potential: "Access may go cold without someone inside backing you.",
  provider_communication_style: "Rep touch may misfire without a read on engagement style.",
  provider_follow_up_approach: "Momentum may slip between case days without a follow-up plan.",
  provider_evaluation_openness: "Trial time may be wasted if they will not run an evaluation.",
  provider_preference_card_signals: "Adoption may stall if preference-card friction is not mapped.",
};

const OVERVIEW_RISK_MITIGATION_BY_RISK_ID: Partial<Record<ProviderOperationalRiskId, string>> = {
  credentialing_unknown: "Confirm vendor clearance with the coordinator.",
  or_access_blockers: "Confirm OR access path and observation allowance.",
  incumbent_vendor_strength: "Map incumbent vendors during evaluation — not early discovery.",
  unclear_influence_structure: "Confirm who signs off and who influences trials.",
  scheduling_uncertainty: "Confirm scheduling owner and posting window.",
  weak_engagement_responsiveness: "Test office response time on the next touch.",
};

export function countOverviewRiskWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function enforceOverviewRiskWordLimit(text: string, maxWords = OVERVIEW_RISK_TITLE_MAX_WORDS): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}

export function sanitizeOverviewRiskTitle(raw: string): string {
  let text = raw.replace(BANNED_TITLE_RE, "").trim();
  const dash = text.indexOf(" — ");
  if (dash > 0) {
    const left = text.slice(0, dash).trim();
    const right = text.slice(dash + 3).trim();
    text = countOverviewRiskWords(left) <= countOverviewRiskWords(right) ? left : right;
  }
  text = text.replace(DASH_CLAUSE_RE, " ").replace(/\s{2,}/g, " ").trim();
  if (!text) return "Field plan needs a check";
  return enforceOverviewRiskWordLimit(text);
}

export function overviewRiskTitle(input: OverviewRiskTitleInput): string {
  if (input.riskId && input.riskId in OVERVIEW_RISK_TITLE_BY_RISK_ID) {
    return OVERVIEW_RISK_TITLE_BY_RISK_ID[input.riskId as ProviderOperationalRiskId];
  }
  if (input.protectDimensionId) {
    return OVERVIEW_RISK_TITLE_BY_PROTECT_DIMENSION[input.protectDimensionId];
  }
  if (input.dbKey) {
    const mapped = OVERVIEW_RISK_TITLE_BY_DB_KEY[input.dbKey];
    if (mapped) return mapped;
  }
  if (input.rawHeadline?.trim()) {
    return sanitizeOverviewRiskTitle(input.rawHeadline);
  }
  return "Field plan needs a check";
}

export function overviewRiskFieldDescription(input: OverviewRiskTitleInput): string {
  if (input.dbKey && OVERVIEW_RISK_DESCRIPTION_BY_DB_KEY[input.dbKey]) {
    return OVERVIEW_RISK_DESCRIPTION_BY_DB_KEY[input.dbKey]!;
  }
  if (input.riskId && input.riskId in OVERVIEW_RISK_DESCRIPTION_BY_RISK_ID) {
    return OVERVIEW_RISK_DESCRIPTION_BY_RISK_ID[input.riskId as ProviderOperationalRiskId];
  }
  if (input.rawHeadline?.trim()) {
    const cleaned = input.rawHeadline.replace(BANNED_DESCRIPTION_RE, "").trim();
    if (cleaned.length > 12) return cleaned;
  }
  return "Field time may be wasted until this is confirmed in the OR.";
}

/** @deprecated Use overviewRiskFieldDescription */
export function overviewRiskConsequence(
  riskId: ProviderOperationalRiskId,
  fallback: string,
): string {
  return (
    OVERVIEW_RISK_DESCRIPTION_BY_RISK_ID[riskId] ??
    fallback.replace(DASH_CLAUSE_RE, ". ").replace(BANNED_DESCRIPTION_RE, "").trim()
  );
}

export function overviewRiskMitigation(riskId: ProviderOperationalRiskId, fallback: string): string {
  return OVERVIEW_RISK_MITIGATION_BY_RISK_ID[riskId] ?? fallback.replace(DASH_CLAUSE_RE, ". ");
}

export function overviewRiskTitleForIncumbent(entrenched: boolean, unknownOnly: boolean): string {
  if (entrenched) return "Incumbent vendor looks entrenched";
  if (unknownOnly) return "Competitive picture still developing";
  return OVERVIEW_RISK_TITLE_BY_RISK_ID.incumbent_vendor_strength;
}

export function overviewRiskTitleForInfluence(unknownCount: number): string {
  if (unknownCount >= 2) return "Buying path not mapped";
  return "Decision path not confirmed";
}

export function overviewRiskTitleForScheduling(coordinatorUnknown: boolean): string {
  if (coordinatorUnknown) return "Scheduling owner not named";
  return OVERVIEW_RISK_TITLE_BY_RISK_ID.scheduling_uncertainty;
}

export function overviewRiskTitleForOrAccess(hasBlockerSignal: boolean): string {
  if (hasBlockerSignal) return "OR access not yet confirmed";
  return OVERVIEW_RISK_TITLE_BY_RISK_ID.or_access_blockers;
}
