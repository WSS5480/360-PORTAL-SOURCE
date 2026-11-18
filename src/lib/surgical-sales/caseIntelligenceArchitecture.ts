/**
 * Case Intelligence UI sections — logistics and observation workflow for one scheduled case.
 */

import {
  CASE_INTELLIGENCE_FIELD_DEFS,
  CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS,
  type CaseIntelligenceCategory,
  type CaseIntelligenceFieldDef,
} from "@/lib/surgical-sales/caseIntelligenceFields";

export type CaseIntelligenceSectionId = "case_logistics" | "live_observation" | "debrief_outcome";

export const CASE_INTELLIGENCE_SECTION_ORDER: CaseIntelligenceSectionId[] = [
  "case_logistics",
  "live_observation",
  "debrief_outcome",
];

export const CASE_INTELLIGENCE_SECTION_LABELS: Record<CaseIntelligenceSectionId, string> = {
  case_logistics: "Case logistics",
  live_observation: "Live observation",
  debrief_outcome: "Debrief & outcome",
};

export const CASE_INTELLIGENCE_SECTION_HINTS: Record<CaseIntelligenceSectionId, string> = {
  case_logistics:
    "Implants, trays, room assignment, support coverage, arrival time, product needs, and case-specific risks.",
  live_observation: "What happened in the room during this procedure.",
  debrief_outcome: "Findings, follow-up, and routing after this case.",
};

const CATEGORY_TO_SECTION: Record<CaseIntelligenceCategory, CaseIntelligenceSectionId> = {
  case_setup: "case_logistics",
  implants_trays: "case_logistics",
  room_logistics: "case_logistics",
  support_coverage: "case_logistics",
  product_needs: "case_logistics",
  case_risks: "case_logistics",
  live_observation: "live_observation",
  debrief_outcome: "debrief_outcome",
};

export const CASE_INTELLIGENCE_SECTION_FIELD_ORDER: Record<CaseIntelligenceSectionId, readonly string[]> = {
  case_logistics: CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS.map((f) => f.dbKey),
  live_observation: CASE_INTELLIGENCE_FIELD_DEFS.filter((f) => f.category === "live_observation").map(
    (f) => f.dbKey,
  ),
  debrief_outcome: CASE_INTELLIGENCE_FIELD_DEFS.filter((f) => f.category === "debrief_outcome").map(
    (f) => f.dbKey,
  ),
};

const FIELD_DEF_BY_KEY = new Map(CASE_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f]));

export type CaseIntelligenceSectionConfig = {
  id: CaseIntelligenceSectionId;
  label: string;
  hint: string;
  fieldKeys: readonly string[];
  fields: CaseIntelligenceFieldDef[];
};

export function buildCaseIntelligenceSections(): CaseIntelligenceSectionConfig[] {
  return CASE_INTELLIGENCE_SECTION_ORDER.map((id) => {
    const order = CASE_INTELLIGENCE_SECTION_FIELD_ORDER[id];
    const fields = order
      .map((key) => FIELD_DEF_BY_KEY.get(key))
      .filter((f): f is CaseIntelligenceFieldDef => Boolean(f));
    return {
      id,
      label: CASE_INTELLIGENCE_SECTION_LABELS[id],
      hint: CASE_INTELLIGENCE_SECTION_HINTS[id],
      fieldKeys: order,
      fields,
    };
  });
}

export function caseIntelligenceSectionForCategory(
  category: CaseIntelligenceCategory,
): CaseIntelligenceSectionId {
  return CATEGORY_TO_SECTION[category];
}
