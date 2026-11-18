/**
 * Field Briefing — touch- and stakeholder-aware questions (not generic priority queue).
 */

import { normalizeEngagementType, type EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { assessIntelligenceFieldQuality } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  ADMIN_DISCOVERY_DB_KEYS,
  FACILITY_DISCOVERY_DB_KEYS,
  isIntelligenceFieldAppropriateForStakeholder,
  SCHEDULER_DISCOVERY_DB_KEYS,
  SURGEON_DISCOVERY_DB_KEYS,
  type IntelligenceDiscoveryStakeholder,
} from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { isEarlyDiscoveryBriefing } from "@/lib/surgical-sales/providerFieldBriefingCoachingCopy";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export type ProviderFieldBriefingAsk = {
  id: string;
  text: string;
};

type AskTemplate = { dbKey: string; text: string };

/** Credentialing, clearance, purchasing — office / admin touches only. */
const ACCESS_ADMIN_DB_KEYS = new Set([
  ...SCHEDULER_DISCOVERY_DB_KEYS,
  ...ADMIN_DISCOVERY_DB_KEYS,
  "provider_observation_access_path",
  "provider_observation_credentialing_needed",
  "provider_credentialing_status",
  "provider_observation_coordinator_contact",
  "provider_observation_cadence_preference",
  "provider_observation_best_days_case_types",
  "provider_decision_maker_status",
  "provider_preference_card_signals",
  "provider_current_vendors",
  "provider_champion_potential",
]);

const INTRO_CALL_SURGEON_ASKS: AskTemplate[] = [
  {
    dbKey: "provider_workflow_pain_points",
    text: "What creates the most workflow friction in the OR today?",
  },
  {
    dbKey: "provider_procedure_focus",
    text: "Which procedures drive most of your volume right now?",
  },
  {
    dbKey: "provider_technique_preferences",
    text: "What is your primary surgical approach on high-volume cases?",
  },
  {
    dbKey: "influence_level",
    text: "Who shapes technique and workflow choices on your cases?",
  },
  {
    dbKey: "provider_communication_style",
    text: "How do you prefer reps to engage between case days?",
  },
  {
    dbKey: "provider_follow_up_approach",
    text: "What is the best way to follow up — and appetite for a next step?",
  },
  {
    dbKey: "provider_evaluation_openness",
    text: "How open are you to a follow-up conversation after you map the workflow?",
  },
  {
    dbKey: "provider_or_team_dynamics",
    text: "What makes OR workflow smoother or harder on your case days?",
  },
];

const OFFICE_SCHEDULER_ASKS: AskTemplate[] = [
  {
    dbKey: "provider_observation_coordinator_contact",
    text: "Who coordinates observation scheduling?",
  },
  {
    dbKey: "provider_observation_access_path",
    text: "How does vendor observation access work at this facility?",
  },
  {
    dbKey: "provider_observation_credentialing_needed",
    text: "Is vendor credentialing required before observation at this site?",
  },
  {
    dbKey: "provider_credentialing_status",
    text: "What is the facility vendor credentialing process?",
  },
  {
    dbKey: "provider_observation_cadence_preference",
    text: "How far in advance should observation requests be submitted?",
  },
  {
    dbKey: "provider_observation_best_days_case_types",
    text: "What are the best facility windows for observation scheduling?",
  },
  {
    dbKey: "provider_observation_feasibility",
    text: "Who approves vendor observation access before a date is held?",
  },
  {
    dbKey: "provider_responsiveness",
    text: "How responsive is the office when you need something between cases?",
  },
];

const OBSERVATION_PLANNING_ASKS: AskTemplate[] = [
  {
    dbKey: "provider_observation_feasibility",
    text: "Is observation feasible here — and what would block a first case day?",
  },
  {
    dbKey: "provider_ideal_observation_cases",
    text: "Which case types would be most useful for a first observation?",
  },
  {
    dbKey: "provider_observation_access_path",
    text: "What steps are required before a vendor can observe?",
  },
  {
    dbKey: "provider_observation_coordinator_contact",
    text: "Who owns scheduling once access is approved?",
  },
  {
    dbKey: "provider_observation_best_days_case_types",
    text: "How far in advance are observation dates usually handled?",
  },
  {
    dbKey: "provider_observation_credentialing_needed",
    text: "What credentialing or clearance is still required?",
  },
];

const CASE_SUPPORT_ASKS: AskTemplate[] = [
  {
    dbKey: "provider_workflow_pain_points",
    text: "What friction showed up in the room today?",
  },
  {
    dbKey: "provider_support_expectations",
    text: "What support do you want from reps on case days?",
  },
  {
    dbKey: "provider_technique_detail",
    text: "Any instrument or dock preferences that matter on the next case?",
  },
  {
    dbKey: "provider_first_observation_questions",
    text: "What still needs to be validated before the next case day?",
  },
  {
    dbKey: "provider_follow_up_approach",
    text: "What is the best follow-up after today's case?",
  },
];

const TOUCH_ASK_POOL: Partial<Record<EngagementType, AskTemplate[]>> = {
  intro_call: INTRO_CALL_SURGEON_ASKS,
  office_visit_360: OFFICE_SCHEDULER_ASKS,
  observation_request: OBSERVATION_PLANNING_ASKS,
  or_visit: CASE_SUPPORT_ASKS,
  follow_up: OFFICE_SCHEDULER_ASKS,
};

function normalizeAskText(text: string): string {
  return scanLine(text.replace(/^Ask\s+/i, "").replace(/\.\s*$/, ""), 96);
}

function stakeholderForTouch(engagementType: string): IntelligenceDiscoveryStakeholder {
  const t = normalizeEngagementType(engagementType) || engagementType;
  if (t === "office_visit_360" || t === "follow_up") return "scheduler_office";
  if (t === "observation_request") return "scheduler_office";
  return "provider_surgeon";
}

function touchAskTemplates(engagementType: string): AskTemplate[] {
  const t = normalizeEngagementType(engagementType) || engagementType;
  return TOUCH_ASK_POOL[t as EngagementType] ?? INTRO_CALL_SURGEON_ASKS;
}

function isAccessAdminField(dbKey: string): boolean {
  return ACCESS_ADMIN_DB_KEYS.has(dbKey) || FACILITY_DISCOVERY_DB_KEYS.has(dbKey);
}

export function fieldAppropriateForFieldBriefingTouch(
  dbKey: string,
  engagementType: string,
): boolean {
  const t = normalizeEngagementType(engagementType) || engagementType;
  const stakeholder = stakeholderForTouch(engagementType);

  if (t === "intro_call") {
    if (isAccessAdminField(dbKey)) return false;
    return isIntelligenceFieldAppropriateForStakeholder(dbKey, "provider_surgeon");
  }

  if (t === "office_visit_360" || t === "follow_up") {
    return (
      SCHEDULER_DISCOVERY_DB_KEYS.has(dbKey) ||
      FACILITY_DISCOVERY_DB_KEYS.has(dbKey) ||
      isIntelligenceFieldAppropriateForStakeholder(dbKey, "scheduler_office") ||
      isIntelligenceFieldAppropriateForStakeholder(dbKey, "facility_or_access")
    );
  }

  if (t === "observation_request") {
    return (
      SCHEDULER_DISCOVERY_DB_KEYS.has(dbKey) ||
      FACILITY_DISCOVERY_DB_KEYS.has(dbKey) ||
      dbKey === "provider_observation_feasibility" ||
      dbKey === "provider_ideal_observation_cases" ||
      dbKey === "provider_first_observation_questions"
    );
  }

  if (t === "or_visit") {
    if (isAccessAdminField(dbKey) && !SURGEON_DISCOVERY_DB_KEYS.has(dbKey)) return false;
    return isIntelligenceFieldAppropriateForStakeholder(dbKey, stakeholder);
  }

  return isIntelligenceFieldAppropriateForStakeholder(dbKey, stakeholder);
}

function intelligenceSectionForDbKey(dbKey: string): ProviderIntelligenceSectionId {
  for (const [sectionId, keys] of Object.entries(PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER)) {
    if ((keys as string[]).includes(dbKey)) {
      return sectionId as ProviderIntelligenceSectionId;
    }
  }
  return "clinical_workflow";
}

export function fieldBriefingLogResponseHref(intelligenceHref: string, dbKey: string): string {
  const sectionId = intelligenceSectionForDbKey(dbKey);
  const base = intelligenceHref.includes("?") ? intelligenceHref : `${intelligenceHref}?`;
  const u = new URL(base, "http://local");
  u.searchParams.set("tab", "intelligence");
  u.searchParams.set("planning_section", sectionId);
  return `${u.pathname}${u.search}`;
}

function askNeedsValidation(
  contact: Record<string, unknown>,
  planning: ProviderPlanningCompletion | null | undefined,
  dbKey: string,
): boolean {
  const raw = contact[dbKey] as string | null | undefined;
  if (!fieldHasIntelligenceSignal(dbKey, raw)) return true;

  const quality = assessIntelligenceFieldQuality(dbKey, raw);
  if (quality.depth === "validated" || quality.depth === "structured") return false;

  const gaps = buildIntelligenceLearningGaps(contact, planning, 20);
  const gap = gaps.find((g) => g.dbKey === dbKey);
  if (!gap) return quality.depth === "weak";
  return gap.state === "unknown" || gap.state === "partial" || gap.state === "outdated";
}

function validationBoost(
  contact: Record<string, unknown>,
  planning: ProviderPlanningCompletion | null | undefined,
  dbKey: string,
): number {
  if (!askNeedsValidation(contact, planning, dbKey)) return 0;

  const raw = contact[dbKey];
  if (!fieldHasIntelligenceSignal(dbKey, raw)) return 120;

  const gaps = buildIntelligenceLearningGaps(contact, planning, 16);
  const gap = gaps.find((g) => g.dbKey === dbKey);
  if (!gap) return 90;
  if (gap.state === "unknown") return 100;
  if (gap.state === "partial") return 80;
  if (gap.state === "outdated") return 70;
  return 60;
}

export function buildProviderFieldBriefingAsks(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  engagementType: string;
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
  limit?: number;
}): ProviderFieldBriefingAsk[] {
  const limit = input.limit ?? 5;
  const templates = touchAskTemplates(input.engagementType);
  const early = isEarlyDiscoveryBriefing(input.relationshipStage, input.commercialStage);
  const touchType = normalizeEngagementType(input.engagementType) || input.engagementType;

  const scored: { id: string; text: string; score: number; order: number }[] = [];

  templates.forEach((template, order) => {
    if (!fieldAppropriateForFieldBriefingTouch(template.dbKey, input.engagementType)) return;

    const text = normalizeAskText(template.text);
    if (!text) return;
    if (!askNeedsValidation(input.contact, input.planning, template.dbKey)) return;

    let score = validationBoost(input.contact, input.planning, template.dbKey);
    score += Math.max(0, 48 - order * 6);

    if (early && touchType === "intro_call" && isAccessAdminField(template.dbKey)) {
      score -= 200;
    }

    if (score <= 0) return;

    scored.push({
      id: template.dbKey,
      text,
      score,
      order,
    });
  });

  scored.sort((a, b) => b.score - a.score || a.order - b.order);

  const seen = new Set<string>();
  const asks: ProviderFieldBriefingAsk[] = [];
  for (const row of scored) {
    const key = row.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    asks.push({ id: row.id, text: row.text });
    if (asks.length >= limit) break;
  }

  return asks;
}

const TOUCH_LEARN_CHIP_LABELS: Partial<Record<EngagementType, Record<string, string>>> = {
  intro_call: {
    provider_workflow_pain_points: "Workflow friction",
    provider_procedure_focus: "Procedure mix",
    provider_technique_preferences: "Technique preference",
    influence_level: "Who shapes cases",
    provider_communication_style: "Communication preference",
    provider_follow_up_approach: "Follow-up path",
    provider_evaluation_openness: "Openness to next touch",
    provider_or_team_dynamics: "OR team dynamics",
  },
  office_visit_360: {
    provider_observation_coordinator_contact: "Scheduling owner",
    provider_observation_access_path: "Access steps",
    provider_observation_credentialing_needed: "Credentialing required?",
    provider_credentialing_status: "Clearance process",
    provider_observation_cadence_preference: "Lead time for requests",
    provider_observation_best_days_case_types: "Best windows / case types",
    provider_observation_feasibility: "Who approves observation",
    provider_responsiveness: "Office responsiveness",
  },
  observation_request: {
    provider_observation_feasibility: "Observation feasible?",
    provider_ideal_observation_cases: "First case profile",
    provider_observation_access_path: "Access requirements",
    provider_observation_coordinator_contact: "Scheduling owner",
    provider_observation_best_days_case_types: "Timing / lead time",
    provider_observation_credentialing_needed: "Clearance still needed",
  },
  or_visit: {
    provider_workflow_pain_points: "In-room friction",
    provider_support_expectations: "Support on case days",
    provider_technique_detail: "Instrument / dock prefs",
    provider_first_observation_questions: "Still to validate",
    provider_follow_up_approach: "Post-case follow-up",
  },
};

export type ProviderFieldBriefingLearnChip = {
  id: string;
  label: string;
};

export function buildFieldBriefingLearnChips(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  engagementType: string;
  excludeDbKeys?: string[];
  limit?: number;
}): ProviderFieldBriefingLearnChip[] {
  const limit = input.limit ?? 6;
  const touchType = normalizeEngagementType(input.engagementType) || input.engagementType;
  const labelMap = TOUCH_LEARN_CHIP_LABELS[touchType as EngagementType] ?? {};
  const excluded = new Set(input.excludeDbKeys ?? []);

  const gaps = buildIntelligenceLearningGaps(input.contact, input.planning, 16);
  const chips: ProviderFieldBriefingLearnChip[] = [];
  const seen = new Set<string>();

  for (const gap of gaps) {
    if (gap.state !== "unknown" && gap.state !== "partial" && gap.state !== "outdated") continue;
    if (!fieldAppropriateForFieldBriefingTouch(gap.dbKey, input.engagementType)) continue;
    if (excluded.has(gap.dbKey)) continue;

    const label = scanLine(labelMap[gap.dbKey] ?? "", 36);
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    chips.push({ id: gap.dbKey, label });
    if (chips.length >= limit) break;
  }

  return chips;
}
