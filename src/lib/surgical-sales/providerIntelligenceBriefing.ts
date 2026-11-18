/**
 * Ultra-short copy for Provider Intelligence default (briefing) view.
 * Chip labels read as procedural account intelligence — not CRM field names.
 */

import type { IntelligenceStrengthLabel } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import type { IntelligenceTrackId } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import {
  discoveryCoachingPrompt,
  type IntelligenceGapState,
} from "@/lib/surgical-sales/providerIntelligenceGapVocabulary";
import { intelligenceContextualCaptureCta } from "@/lib/surgical-sales/providerIntelligenceContextualCtas";

/** Short labels on capture / discovery action chips. */
export const OPERATIONAL_INTELLIGENCE_CHIP_LABELS: Record<string, string> = {
  provider_observation_feasibility: "Observation allowance",
  provider_observation_credentialing_needed: "Vendor approval path",
  provider_ideal_observation_cases: "Target procedures",
  provider_observation_access_path: "OR access gates",
  provider_observation_coordinator_contact: "OR scheduling owner",
  provider_observation_cadence_preference: "How OR days post",
  provider_observation_best_days_case_types: "Schedule posting window",
  provider_first_observation_questions: "Room validation plan",
  provider_procedure_focus: "Procedure mix",
  provider_technique_preferences: "Surgical modality",
  provider_technique_detail: "Dock / instrument model",
  provider_workflow_pain_points: "Workflow friction",
  provider_case_volume_estimate: "Weekly case band",
  provider_or_team_dynamics: "OR turnover model",
  provider_credentialing_status: "Vendor clearance path",
  provider_current_vendors: "Vendors in cases",
  provider_support_expectations: "In-room rep model",
  provider_communication_style: "Rep interaction model",
  provider_responsiveness: "Office response time",
  influence_level: "Who influences cases",
  provider_decision_maker_status: "Who approves evaluations",
  provider_champion_potential: "Internal vendor support",
  provider_follow_up_approach: "Between-visit follow-up",
  provider_evaluation_openness: "Trial willingness",
  provider_competitive_products: "Incumbent systems",
  provider_dissatisfaction_areas: "Vendor friction map",
  provider_preference_card_signals: "Preference card gates",
};

/** Ultra-short gap chips for scan UI (unknown / partial). */
export const OPERATIONAL_GAP_CHIP_LABELS: Record<
  string,
  { unknown: string; partial?: string }
> = {
  provider_procedure_focus: {
    unknown: "Procedure mix TBD",
    partial: "Procedure mix thin",
  },
  provider_technique_preferences: {
    unknown: "Modality mix TBD",
    partial: "Modality unvalidated",
  },
  provider_technique_detail: {
    unknown: "Technique prefs TBD",
    partial: "Technique detail thin",
  },
  provider_workflow_pain_points: {
    unknown: "Workflow friction TBD",
    partial: "Friction signals thin",
  },
  provider_case_volume_estimate: {
    unknown: "Case volume TBD",
    partial: "Volume band thin",
  },
  provider_or_team_dynamics: {
    unknown: "OR dynamics TBD",
    partial: "Team pattern thin",
  },
  provider_credentialing_status: {
    unknown: "Clearance TBD",
    partial: "Clearance unvalidated",
  },
  provider_current_vendors: {
    unknown: "Vendors in cases TBD",
    partial: "OR lock-in still fuzzy",
  },
  provider_support_expectations: {
    unknown: "Support level TBD",
    partial: "Support model thin",
  },
  provider_communication_style: {
    unknown: "Engagement style TBD",
    partial: "Surgeon style thin",
  },
  provider_responsiveness: {
    unknown: "Office response TBD",
    partial: "Response pattern thin",
  },
  influence_level: {
    unknown: "Case influence TBD",
    partial: "Who moves cases thin",
  },
  provider_decision_maker_status: {
    unknown: "Evaluator TBD",
    partial: "Who approves thin",
  },
  provider_champion_potential: {
    unknown: "Inside support TBD",
    partial: "Internal backer thin",
  },
  provider_follow_up_approach: {
    unknown: "Follow-up plan TBD",
    partial: "Between-visit touch thin",
  },
  provider_evaluation_openness: {
    unknown: "Trial willingness TBD",
    partial: "Evaluation ask still thin",
  },
  provider_competitive_products: {
    unknown: "Incumbents TBD",
    partial: "Competitive map thin",
  },
  provider_dissatisfaction_areas: {
    unknown: "Vendor friction TBD",
    partial: "Pain signals thin",
  },
  provider_preference_card_signals: {
    unknown: "Card path TBD",
    partial: "Card friction thin",
  },
  provider_observation_feasibility: {
    unknown: "Allowance TBD",
    partial: "Allowance unvalidated",
  },
  provider_observation_credentialing_needed: {
    unknown: "Vendor path TBD",
    partial: "Approval path thin",
  },
  provider_ideal_observation_cases: {
    unknown: "Target cases TBD",
    partial: "Case targets thin",
  },
  provider_observation_access_path: {
    unknown: "OR gates TBD",
    partial: "Access gates thin",
  },
  provider_observation_coordinator_contact: {
    unknown: "No OR scheduling owner",
    partial: "Scheduler unvalidated",
  },
  provider_observation_cadence_preference: {
    unknown: "Case-day rhythm TBD",
    partial: "Cadence thin",
  },
  provider_observation_best_days_case_types: {
    unknown: "Posting window TBD",
    partial: "Posting window thin",
  },
  provider_first_observation_questions: {
    unknown: "Room validation TBD",
    partial: "Validation plan thin",
  },
};

const TRACK_BRIEF_LABELS: Record<IntelligenceTrackId, string> = {
  clinical: "Clinical",
  relationship: "Relationship",
  product_competitor: "Commercial",
};

export function commercialBriefLine(
  overallStatus: IntelligenceStrengthLabel,
  weakestTrackId: IntelligenceTrackId,
): string {
  const lane = TRACK_BRIEF_LABELS[weakestTrackId] ?? "Profile";
  if (overallStatus === "Strong") return "Solid read";
  if (overallStatus === "Limited") return `Early · ${lane} thin`;
  return `Building · tighten ${lane.toLowerCase()}`;
}

export function operationalIntelligenceChipLabel(
  dbKey: string,
  fieldLabelFallback?: string,
): string {
  return (
    OPERATIONAL_INTELLIGENCE_CHIP_LABELS[dbKey] ??
    discoveryCoachingPrompt(dbKey, fieldLabelFallback).split(" ").slice(0, 5).join(" ")
  );
}

/** Compact action label for intelligence quick-capture strips. */
export function discoveryActionChipLabel(dbKey: string, _fieldLabelFallback?: string): string {
  return intelligenceContextualCaptureCta(dbKey);
}

export function intelligenceGapChipLabel(
  dbKey: string,
  state: IntelligenceGapState,
): string {
  const def = OPERATIONAL_GAP_CHIP_LABELS[dbKey];
  if (!def) {
    return state === "unknown" ? "Still learning" : "Needs validation";
  }
  if (state === "outdated") return "Needs refresh";
  if (state === "partial" && def.partial) return def.partial;
  return def.unknown;
}

export function signalLineToChips(signalLine: string, max = 4): string[] {
  if (
    !signalLine ||
    signalLine.startsWith("No signals") ||
    /confirmed yet\.?$/i.test(signalLine) ||
    /^Still learning |visibility limited/i.test(signalLine)
  ) {
    return [];
  }
  return signalLine
    .split(" · ")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

/** @deprecated Prefer intelligenceGapChipLabel when dbKey is known. */
export function gapPhraseToChip(phrase: string): string {
  return phrase
    .replace(/^Observation /, "Obs. ")
    .replace(/ not yet confirmed on file$/, " TBD")
    .replace(/ not confirmed$/, " TBD")
    .replace(/ not validated in the field$/, " — validate live")
    .replace(/ not documented$/, " TBD")
    .replace(/ not validated$/, " thin")
    .replace(/ needs field validation$/, " thin");
}
