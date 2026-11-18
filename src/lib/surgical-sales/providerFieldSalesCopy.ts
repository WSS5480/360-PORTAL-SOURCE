/**
 * Field-sales vocabulary — experienced rep preparing for a real visit.
 * Single source for open-field phrasing (not CRM / framework jargon).
 */

import { intelligenceFieldDisplayName } from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import { sanitizeOperationalIntelCopy } from "@/lib/surgical-sales/providerIntelligenceOperationalCopy";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

/** Clause used in summaries — e.g. "Still open: who approves evaluations." */
export const FIELD_SALES_STILL_NEED: Partial<Record<string, string>> = {
  provider_observation_feasibility: "whether you can observe cases here",
  provider_observation_credentialing_needed: "what credentialing blocks the first case",
  provider_ideal_observation_cases: "which procedures are realistically observable",
  provider_observation_access_path: "how observation access works here",
  provider_observation_coordinator_contact: "who owns OR scheduling",
  provider_observation_cadence_preference: "how OR days actually get posted",
  provider_observation_best_days_case_types: "which days cases actually post",
  provider_first_observation_questions: "what to validate on the first case day",
  provider_procedure_focus: "which procedures drive their volume",
  provider_technique_preferences: "open vs lap vs robotic mix",
  provider_technique_detail: "instrument and dock preferences",
  provider_workflow_pain_points: "where turnover or setup slows them down",
  provider_case_volume_estimate: "rough weekly case volume",
  provider_or_team_dynamics: "how charge and turnover run in the room",
  provider_credentialing_status: "how vendor clearance works here",
  provider_current_vendors: "which vendors are active in their cases",
  provider_support_expectations: "how much rep support they want in-room",
  provider_communication_style: "how they want updates between visits",
  provider_responsiveness: "how fast the office responds",
  influence_level: "who influences product choices on cases",
  provider_decision_maker_status: "who approves evaluations",
  provider_champion_potential: "whether anyone inside will back a new vendor",
  provider_follow_up_approach: "how to stay in touch between case days",
  provider_evaluation_openness: "whether they'll run a real evaluation",
  provider_competitive_products: "what systems are already in their cases",
  provider_dissatisfaction_areas: "where current vendors frustrate them",
  provider_preference_card_signals: "who gates preference-card changes",
};

/** One-sentence primary unknown (Understanding cards). */
export const FIELD_SALES_PRIMARY_UNKNOWN: Partial<Record<string, string>> = {
  provider_observation_feasibility: "Whether you can observe cases here still unclear.",
  provider_observation_credentialing_needed: "What credentialing blocks the first case still unclear.",
  provider_ideal_observation_cases: "Which procedures are realistically observable still unclear.",
  provider_observation_access_path: "How observation access works here still unclear.",
  provider_observation_coordinator_contact: "Who owns OR scheduling still unclear.",
  provider_observation_cadence_preference: "How OR days actually get posted still unclear.",
  provider_observation_best_days_case_types: "Which days cases actually post still unclear.",
  provider_first_observation_questions: "What to validate on the first case day still unclear.",
  provider_procedure_focus: "Which procedures drive their volume still unclear.",
  provider_technique_preferences: "Open vs lap vs robotic mix still unclear.",
  provider_technique_detail: "Instrument and dock preferences are still unknown.",
  provider_workflow_pain_points: "Where turnover or setup slows them down still unclear.",
  provider_case_volume_estimate: "Rough weekly case volume still unclear.",
  provider_or_team_dynamics: "How charge and turnover run in the room still unclear.",
  provider_credentialing_status: "How vendor clearance works here still unclear.",
  provider_current_vendors: "Which vendors are active in their cases still unclear.",
  provider_support_expectations: "How much rep support they want in-room still unclear.",
  provider_communication_style: "How they want updates between visits still unclear.",
  provider_responsiveness: "How fast the office responds still unclear.",
  influence_level: "Who influences product choices on cases still unclear.",
  provider_decision_maker_status: "Who approves evaluations still unclear.",
  provider_champion_potential: "Whether anyone inside will back a new vendor still unclear.",
  provider_follow_up_approach: "How to stay in touch between case days still unclear.",
  provider_evaluation_openness: "Whether they'll run a real evaluation still unclear.",
  provider_competitive_products: "What systems are already in their cases still unclear.",
  provider_dissatisfaction_areas: "Where current vendors frustrate them still unclear.",
  provider_preference_card_signals: "Who gates preference-card changes still unclear.",
};

/** Gap state lines — what is missing on file (not coaching prompts). */
export const FIELD_SALES_GAP_STATE: Record<
  string,
  { unknown: string; partial?: string }
> = {
  provider_responsiveness: {
    unknown: "Office callback speed not nailed down",
    partial: "Response time needs a live check",
  },
  influence_level: {
    unknown: "Who moves product choices on cases not clear",
    partial: "Buying influence needs validation on a case day",
  },
  provider_decision_maker_status: {
    unknown: "Who approves evaluations not identified",
    partial: "Evaluator vs influencer role needs a confirm",
  },
  provider_champion_potential: {
    unknown: "No one inside confirmed to push a new vendor",
    partial: "Internal support needs proof on the next touch",
  },
  provider_follow_up_approach: {
    unknown: "Follow-up plan between case days not agreed",
    partial: "How to stay in touch needs alignment",
  },
  provider_evaluation_openness: {
    unknown: "Whether they'll run a real evaluation not clear",
    partial: "Trial willingness needs a direct ask",
  },
  provider_observation_coordinator_contact: {
    unknown: "Scheduling process still being learned",
    partial: "Scheduler referenced — contact details still open",
  },
  provider_observation_access_path: {
    unknown: "OR access path still forming",
    partial: "Access details heard — confirm with scheduler or credentialing",
  },
  provider_observation_cadence_preference: {
    unknown: "How OR days actually get posted not clear",
    partial: "Posting rhythm needs alignment with scheduler",
  },
  provider_ideal_observation_cases: {
    unknown: "Realistic observation procedures not picked",
    partial: "First cases to watch need surgeon alignment",
  },
  provider_credentialing_status: {
    unknown: "Vendor clearance path not clear",
    partial: "Credentialing status needs a refresh",
  },
  provider_observation_feasibility: {
    unknown: "Observation allowance not confirmed with surgeon",
    partial: "Whether you can observe needs reconfirmation",
  },
  provider_observation_credentialing_needed: {
    unknown: "Credentialing steps before first case not clear",
    partial: "Vendor gates need a status check",
  },
  provider_procedure_focus: {
    unknown: "Clinical workflow not yet observed in the field",
    partial: "Procedure mix forming — confirm on a case day",
  },
  provider_technique_preferences: {
    unknown: "Clinical workflow not yet observed in the field",
    partial: "Modality mix forming — confirm in the OR",
  },
  provider_technique_detail: {
    unknown: "Dock and instrument preferences not validated in the field",
    partial: "Technique detail needs scrub-tech confirm",
  },
  provider_workflow_pain_points: {
    unknown: "Turnover and setup friction not documented",
    partial: "Workflow pain needs a live case watch",
  },
  provider_case_volume_estimate: {
    unknown: "Weekly case volume band not confirmed",
    partial: "Volume pattern needs a quick confirm",
  },
  provider_or_team_dynamics: {
    unknown: "OR turnover rhythm still unclear",
    partial: "OR team pattern still developing",
  },
  provider_current_vendors: {
    unknown: "Vendors in active cases not confirmed",
    partial: "Vendor list partial — confirm during evaluation",
  },
  provider_support_expectations: {
    unknown: "In-room rep support level not aligned",
    partial: "Support expectations need alignment",
  },
  provider_communication_style: {
    unknown: "Engagement and update style not validated",
    partial: "Contact style needs confirmation",
  },
  provider_competitive_products: {
    unknown: "Incumbent footprint in cases not validated",
    partial: "Competitive footprint needs refresh",
  },
  provider_dissatisfaction_areas: {
    unknown: "Vendor pain points not documented",
    partial: "Vendor friction needs depth",
  },
  provider_preference_card_signals: {
    unknown: "Who gates preference-card changes not clear",
    partial: "Card committee path needs detail",
  },
  provider_observation_best_days_case_types: {
    unknown: "Which days cases post for observation not clear",
    partial: "Best posting days need scheduler proof",
  },
  provider_first_observation_questions: {
    unknown: "First-case validation list not written",
    partial: "In-room checklist needs detail",
  },
};

/** Short chip labels on briefing strips */
export const FIELD_SALES_CHIP_LABEL: Partial<Record<string, string>> = {
  provider_responsiveness: "Office response time",
  influence_level: "Who influences cases",
  provider_decision_maker_status: "Who approves evaluations",
  provider_champion_potential: "Internal vendor support",
  provider_follow_up_approach: "Between-visit follow-up",
  provider_evaluation_openness: "Trial willingness",
  provider_observation_coordinator_contact: "OR scheduling owner",
  provider_observation_cadence_preference: "How days post",
  provider_observation_access_path: "OR access details",
  provider_ideal_observation_cases: "Observable procedures",
  provider_credentialing_status: "Vendor clearance",
};

/** Display-area phrase mapping for legacy missing-area strings */
export const FIELD_SALES_MISSING_AREA_PHRASE: Record<string, string> = {
  "procedure focus": "which procedures drive volume",
  "technique preferences": "open vs lap vs robotic mix",
  "case volume": "weekly case volume",
  "or team dynamics": "how the OR team runs turnover",
  "first-observation questions": "what to check on first case day",
  "current product usage": "what they use in cases today",
  "product interests": "what products they want to try",
  "evaluation openness": "whether they'll run an evaluation",
  "preference card signals": "who gates preference-card changes",
  "competitive products": "what is already in their cases",
  "contact channel": "best way to reach them",
  "communication style": "how they want updates",
  "influence level": "who influences product choices",
  "decision-maker status": "who approves evaluations",
  "champion potential": "internal support for new vendors",
  "follow-up approach": "how to follow up between visits",
  "rep strategy notes": "your game plan",
  "strategic goal": "strategic goal",
  "clinical discovery answers": "field notes",
  "clinical intelligence": "how they operate in the OR",
  "engagement responsiveness": "how fast the office responds",
  "procedural influence": "who influences product choices",
  "approval authority": "who approves evaluations",
  "internal advocate": "internal support for new vendors",
  "access rhythm": "how to stay in touch between case days",
  "evaluation posture": "whether they'll run an evaluation",
  "evaluation appetite": "whether they'll run an evaluation",
  "trial posture": "whether they'll run an evaluation",
};

export function fieldSalesStillNeedPhrase(dbKey: string, fallbackLabel?: string): string {
  const direct = FIELD_SALES_STILL_NEED[dbKey];
  if (direct) return direct;
  if (fallbackLabel?.trim()) return fallbackLabel.trim().toLowerCase();
  return intelligenceFieldDisplayName(dbKey).toLowerCase();
}

export function fieldSalesPrimaryUnknown(dbKey: string, max = 88): string {
  const direct = FIELD_SALES_PRIMARY_UNKNOWN[dbKey];
  if (direct) return scanLine(direct.replace(/ not confirmed yet\.?$/i, " still unclear."), max);
  const phrase = fieldSalesStillNeedPhrase(dbKey);
  return scanLine(`${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} still unclear.`, max);
}

export function formatFieldSalesStillNeedSummary(phrases: string[], maxItems = 3): string {
  const unique = [...new Set(phrases.map((p) => p.trim()).filter(Boolean))].slice(0, maxItems);
  if (unique.length === 0) return "";
  if (unique.length === 1) return `Still open: ${unique[0]}.`;
  if (unique.length === 2) return `Still open: ${unique[0]} and ${unique[1]}.`;
  return `Still open: ${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}.`;
}

export function formatFieldSalesMissingArea(raw: string): string {
  const key = raw.trim().toLowerCase();
  for (const [pattern, label] of Object.entries(FIELD_SALES_MISSING_AREA_PHRASE)) {
    if (key.includes(pattern)) return label;
  }
  if (/^\d+ clinical discovery/.test(key) || key.includes("intelligence categor")) {
    return "open field notes";
  }
  return raw.replace(/^provider_/, "").replace(/_/g, " ");
}

export function fieldSalesGapStateLabel(
  dbKey: string,
  state: "unknown" | "partial",
): string {
  const def = FIELD_SALES_GAP_STATE[dbKey];
  if (!def) {
    return state === "unknown" ? "Still learning on the operational map" : "Needs field validation";
  }
  if (state === "partial" && def.partial) return sanitizeOperationalIntelCopy(def.partial);
  return sanitizeOperationalIntelCopy(def.unknown);
}
