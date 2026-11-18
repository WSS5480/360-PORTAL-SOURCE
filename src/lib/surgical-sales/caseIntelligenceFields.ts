/**
 * Case Intelligence — facts specific to one scheduled surgical case.
 *
 * Authoritative storage: surgical_sales_cases columns (live observation, debrief, logistics).
 * Pre-Call Plan keys on engagements are case-scoped when tied to an observation case
 * (see engagementIntelligenceFields.ts — scope is still "case").
 */

import {
  OBSERVATION_CASE_WORKFLOW_FIELDS,
  type ObservationCaseWorkflowFieldKey,
} from "@/lib/surgical-sales/observationCaseWorkflowFields";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";

export type CaseIntelligenceCategory =
  | "case_setup"
  | "implants_trays"
  | "room_logistics"
  | "support_coverage"
  | "product_needs"
  | "live_observation"
  | "debrief_outcome"
  | "case_risks";

export type CaseIntelligenceFieldDef = {
  dbKey: string;
  label: string;
  category: CaseIntelligenceCategory;
  helper?: string;
  storageEntity: "case" | "engagement";
  scope: IntelligenceScope;
};

/** Operational logistics — scheduled case execution (not provider profile). */
export const CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS: CaseIntelligenceFieldDef[] = [
  {
    dbKey: "case_implants_on_site",
    label: "Implants on site",
    category: "implants_trays",
    helper: "Whether required implants are on site for this case.",
    storageEntity: "case",
    scope: "case",
  },
  {
    dbKey: "case_trays_sterilization_status",
    label: "Trays ready / sterilized",
    category: "implants_trays",
    helper: "Tray and sterilization readiness for this case day.",
    storageEntity: "case",
    scope: "case",
  },
  {
    dbKey: "case_room_assignment",
    label: "Room assignment",
    category: "room_logistics",
    helper: "OR or procedure room assigned for this case.",
    storageEntity: "case",
    scope: "case",
  },
  {
    dbKey: "case_support_coverage",
    label: "Support coverage",
    category: "support_coverage",
    helper: "Rep or clinical support planned in-room for this case.",
    storageEntity: "case",
    scope: "case",
  },
  {
    dbKey: "case_planned_arrival_time",
    label: "Arrival time",
    category: "room_logistics",
    helper: "When the team or rep should arrive for this case.",
    storageEntity: "case",
    scope: "case",
  },
  {
    dbKey: "case_product_needs",
    label: "Product needs",
    category: "product_needs",
    helper: "Products, sets, or disposables needed for this case only.",
    storageEntity: "case",
    scope: "case",
  },
  {
    dbKey: "case_operational_risks",
    label: "Case-specific risks",
    category: "case_risks",
    helper: "Operational risks for this case day — not standing facility or surgeon profile.",
    storageEntity: "case",
    scope: "case",
  },
];

function workflowFieldToCaseDef(
  key: ObservationCaseWorkflowFieldKey,
  label: string,
  category: CaseIntelligenceCategory,
  helper?: string,
): CaseIntelligenceFieldDef {
  return {
    dbKey: key,
    label,
    category,
    helper,
    storageEntity: "case",
    scope: "case",
  };
}

const WORKFLOW_CASE_DEFS: CaseIntelligenceFieldDef[] = OBSERVATION_CASE_WORKFLOW_FIELDS.filter(
  (f) => f.recommendedFutureOwner === "case",
).map((f) => {
  let category: CaseIntelligenceCategory = "live_observation";
  if (f.stage === "debrief") category = "debrief_outcome";
  if (f.stage === "follow_up" || f.key === "follow_up_needed") category = "debrief_outcome";
  return workflowFieldToCaseDef(f.key, f.label, category, f.ownershipNotes);
});

export const CASE_INTELLIGENCE_FIELD_DEFS: CaseIntelligenceFieldDef[] = [
  ...CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS,
  ...WORKFLOW_CASE_DEFS,
];

export const CASE_INTELLIGENCE_DB_KEYS = CASE_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey);

export const CASE_INTELLIGENCE_LOGISTICS_DB_KEYS = CASE_INTELLIGENCE_LOGISTICS_FIELD_DEFS.map(
  (f) => f.dbKey,
);

export function isCaseIntelligenceDbKey(key: string): boolean {
  return (CASE_INTELLIGENCE_DB_KEYS as readonly string[]).includes(key);
}

export function isCaseIntelligenceLogisticsDbKey(key: string): boolean {
  return (CASE_INTELLIGENCE_LOGISTICS_DB_KEYS as readonly string[]).includes(key);
}
