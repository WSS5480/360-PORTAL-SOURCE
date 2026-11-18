/**
 * Case-scoped touch planning — Pre-Call Plan and prepare artifacts for one visit.
 *
 * Stored on surgical_sales_engagements (Pre-Call Plan, prepare JSON, notes).
 * Classified as Case Intelligence in the three-scope model — not provider or facility profile.
 */

import {
  PRE_CALL_PLAN_FIELD_CONFIGS,
  PROVIDER_PRE_CALL_PLAN_LEGACY_KEYS,
  type PreCallPlanFieldKey,
} from "@/lib/surgical-sales/preCallPlanFields";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";

export type EngagementIntelligenceCategory =
  | "meeting_objectives"
  | "discovery_hypotheses"
  | "talking_points"
  | "next_visit_priorities"
  | "tactical_asks"
  | "visit_notes"
  | "commitments";

export type EngagementIntelligenceFieldDef = {
  dbKey: string;
  label: string;
  category: EngagementIntelligenceCategory;
  scope: IntelligenceScope;
};

const PRE_CALL_DEFS: EngagementIntelligenceFieldDef[] = PRE_CALL_PLAN_FIELD_CONFIGS.map((f) => ({
  dbKey: f.key,
  label: f.label,
  category: categoryForPreCallKey(f.key),
  scope: "case" as const,
}));

function categoryForPreCallKey(key: PreCallPlanFieldKey): EngagementIntelligenceCategory {
  switch (key) {
    case "observation_goal":
      return "meeting_objectives";
    case "pre_observation_value_hypothesis":
      return "discovery_hypotheses";
    case "pre_observation_impact_opening_statement":
    case "pre_observation_probes":
      return "talking_points";
    case "pre_observation_planned_close":
      return "next_visit_priorities";
    case "pre_observation_tools_resources":
    case "pre_observation_additional_notes":
      return "tactical_asks";
    default:
      return "visit_notes";
  }
}

/** Engagement-only columns beyond Pre-Call Plan. */
export const ENGAGEMENT_INTELLIGENCE_EXTRA_KEYS = [
  "prepare_tactical_asks",
  "prepare_checklist_json",
  "notes",
  "prepared_at",
] as const;

export const ENGAGEMENT_INTELLIGENCE_FIELD_DEFS: EngagementIntelligenceFieldDef[] = [
  ...PRE_CALL_DEFS,
  {
    dbKey: "prepare_tactical_asks",
    label: "Tactical asks",
    category: "tactical_asks",
    scope: "case",
  },
  {
    dbKey: "prepare_checklist_json",
    label: "Prepare checklist",
    category: "tactical_asks",
    scope: "case",
  },
  { dbKey: "notes", label: "Visit notes", category: "visit_notes", scope: "case" },
  {
    dbKey: "prepared_at",
    label: "Meeting prepared",
    category: "visit_notes",
    scope: "case",
  },
];

/** Legacy provider-contact mirrors of engagement strategy. */
export const ENGAGEMENT_STRATEGY_PROVIDER_MIRROR_KEYS = [
  "provider_strategic_goal",
  "provider_rep_strategy_notes",
  ...PROVIDER_PRE_CALL_PLAN_LEGACY_KEYS,
  "provider_pre_observation_impact_opening_statement",
  "provider_pre_observation_probes",
  "provider_pre_observation_tools_resources",
  "provider_pre_observation_value_hypothesis",
  "provider_pre_observation_planned_close",
  "provider_pre_observation_additional_notes",
] as const;

export const ENGAGEMENT_INTELLIGENCE_DB_KEYS = [
  ...ENGAGEMENT_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey),
  ...ENGAGEMENT_STRATEGY_PROVIDER_MIRROR_KEYS,
] as const;

export function isEngagementIntelligenceDbKey(key: string): boolean {
  return (ENGAGEMENT_INTELLIGENCE_DB_KEYS as readonly string[]).includes(key);
}

export function isEngagementStrategyMirrorDbKey(key: string): boolean {
  return (ENGAGEMENT_STRATEGY_PROVIDER_MIRROR_KEYS as readonly string[]).includes(key);
}
