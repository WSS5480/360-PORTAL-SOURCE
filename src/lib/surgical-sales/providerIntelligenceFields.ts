/**
 * Provider Intelligence — persistent facts specific to one surgeon/provider.
 *
 * Organization-scoped fields live in organizationIntelligenceFields.ts.
 * Case-scoped fields live in caseIntelligenceFields.ts / engagementIntelligenceFields.ts.
 */

import {
  ENGAGEMENT_STRATEGY_PROVIDER_MIRROR_KEYS,
  isEngagementIntelligenceDbKey,
  isEngagementStrategyMirrorDbKey,
} from "@/lib/surgical-sales/engagementIntelligenceFields";
import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { PRE_CALL_PLAN_CASE_KEYS, type PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";

export type ProviderIntelligenceCategory =
  | "procedures"
  | "modality"
  | "technique_detail"
  | "workflow_pain"
  | "case_mix"
  | "communication_style"
  | "responsiveness"
  | "decision_influence"
  | "follow_up_rhythm"
  | "evaluation_openness"
  | "competitor_usage"
  | "product_interest"
  | "dissatisfaction"
  | "observation_feasibility"
  | "ideal_cases"
  | "observation_cadence"
  | "validation_questions";

export type ProviderIntelligenceFieldDef = {
  dbKey: string;
  label: string;
  category: ProviderIntelligenceCategory;
  helper?: string;
  scope: IntelligenceScope;
};

/** Provider-scoped columns only — not facility-wide organization intelligence. */
export const PROVIDER_INTELLIGENCE_FIELD_DEFS: ProviderIntelligenceFieldDef[] = [
  { dbKey: "provider_procedure_focus", label: "Procedures", category: "procedures", scope: "provider" },
  {
    dbKey: "provider_technique_preferences",
    label: "Modality",
    category: "modality",
    helper: "Primary surgical approach — Open, lap, robotic, etc.",
    scope: "provider",
  },
  {
    dbKey: "provider_technique_detail",
    label: "Technique preferences",
    category: "technique_detail",
    helper: "Approach, docking, or instrument preferences when they matter.",
    scope: "provider",
  },
  {
    dbKey: "provider_workflow_pain_points",
    label: "Workflow pain points",
    category: "workflow_pain",
    helper: "Persistent friction in their clinical workflow.",
    scope: "provider",
  },
  {
    dbKey: "provider_case_volume_estimate",
    label: "Case mix",
    category: "case_mix",
    helper: "Volume and case-mix signal for prioritization.",
    scope: "provider",
  },
  {
    dbKey: "provider_communication_style",
    label: "Communication style",
    category: "communication_style",
    helper: "Warmth and how they prefer to communicate.",
    scope: "provider",
  },
  {
    dbKey: "provider_responsiveness",
    label: "Responsiveness",
    category: "responsiveness",
    helper: "How quickly the provider or office gets back to you.",
    scope: "provider",
  },
  { dbKey: "influence_level", label: "Influence level", category: "decision_influence", scope: "provider" },
  {
    dbKey: "provider_decision_maker_status",
    label: "Decision-maker status",
    category: "decision_influence",
    scope: "provider",
  },
  {
    dbKey: "provider_champion_potential",
    label: "Champion potential",
    category: "decision_influence",
    scope: "provider",
  },
  {
    dbKey: "provider_follow_up_approach",
    label: "Follow-up rhythm",
    category: "follow_up_rhythm",
    helper: "How they expect ongoing rep touchpoints.",
    scope: "provider",
  },
  {
    dbKey: "provider_evaluation_openness",
    label: "Evaluation openness",
    category: "evaluation_openness",
    scope: "provider",
  },
  {
    dbKey: "provider_product_interests",
    label: "Product interests",
    category: "product_interest",
    helper: "Products, features, or fit questions the provider is interested in evaluating or learning more about.",
    scope: "provider",
  },
  {
    dbKey: "provider_competitive_products",
    label: "Competitor usage",
    category: "competitor_usage",
    scope: "provider",
  },
  {
    dbKey: "provider_dissatisfaction_areas",
    label: "Dissatisfaction areas",
    category: "dissatisfaction",
    helper: "What frustrates them about current solutions.",
    scope: "provider",
  },
  {
    dbKey: "provider_clinical_frustrations",
    label: "Clinical frustrations",
    category: "dissatisfaction",
    helper: "Clinical pain points mentioned in debriefs or observation.",
    scope: "provider",
  },
  {
    dbKey: "provider_product_gaps",
    label: "Product gaps",
    category: "dissatisfaction",
    helper: "Unmet needs where incumbent products fall short.",
    scope: "provider",
  },
  {
    dbKey: "provider_staff_frustrations",
    label: "Staff frustrations",
    category: "workflow_pain",
    helper: "Nursing, tech, or coordination frustrations affecting adoption.",
    scope: "provider",
  },
  {
    dbKey: "provider_future_opportunity_signals",
    label: "Future opportunity signals",
    category: "evaluation_openness",
    helper: "Growth, expansion, or evaluation windows hinted in the field.",
    scope: "provider",
  },
  {
    dbKey: "provider_observation_feasibility",
    label: "Observation allowed?",
    category: "observation_feasibility",
    helper: "Can reps observe cases with this provider — now and going forward?",
    scope: "provider",
  },
  {
    dbKey: "provider_ideal_observation_cases",
    label: "Ideal procedures to observe",
    category: "ideal_cases",
    helper: "Procedure types that make the best first or repeat observation with this surgeon.",
    scope: "provider",
  },
  {
    dbKey: "provider_observation_cadence_preference",
    label: "Observation cadence preference",
    category: "observation_cadence",
    helper: "How often this provider is open to observation touchpoints.",
    scope: "provider",
  },
  {
    dbKey: "provider_first_observation_questions",
    label: "Questions to validate",
    category: "validation_questions",
    helper: "Persistent hypotheses to confirm on observation — not per-visit probes.",
    scope: "provider",
  },
];

export const PROVIDER_INTELLIGENCE_DB_KEYS = PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => f.dbKey);

/** @deprecated Historical provider copies of engagement strategy — engagement scope only. */
export const PROVIDER_INTELLIGENCE_DEPRECATED_PRE_CALL_DB_KEYS = [
  ...ENGAGEMENT_STRATEGY_PROVIDER_MIRROR_KEYS,
] as const;

/** Case columns that belong to Pre-Call Plan only — engagement scope. */
export const CASE_PRE_CALL_PLAN_ONLY_KEYS = [...PRE_CALL_PLAN_CASE_KEYS] as const;

export function isProviderIntelligenceDbKey(key: string): boolean {
  return (PROVIDER_INTELLIGENCE_DB_KEYS as readonly string[]).includes(key);
}

export function isDeprecatedProviderPreCallDbKey(key: string): boolean {
  return isEngagementStrategyMirrorDbKey(key);
}

export function isCasePreCallPlanOnlyKey(key: string): boolean {
  return (CASE_PRE_CALL_PLAN_ONLY_KEYS as readonly string[]).includes(key);
}

/**
 * Structural ownership (C3): evaluation/outcome lifecycle columns are owned by
 * their dedicated writers (evaluation path, commitment outcomes) — never the
 * log-update / AI-extraction pipeline.
 */
export const EVALUATION_OUTCOME_RESERVED_DB_KEYS = new Set([
  "provider_evaluation_activity_status",
  "provider_evaluation_path",
  "provider_commitment_outcome",
  "provider_outcome_status",
]);

export function assertProviderIntelligenceWritableDbKey(dbKey: string): void {
  if (isOrganizationIntelligenceDbKey(dbKey)) {
    throw new Error(
      `Column ${dbKey} is organization intelligence (facility-wide), not provider intelligence. Use Organization Intelligence.`,
    );
  }
  if (isEngagementIntelligenceDbKey(dbKey) || isDeprecatedProviderPreCallDbKey(dbKey)) {
    throw new Error(
      `Column ${dbKey} is case intelligence for one scheduled case, not provider intelligence.`,
    );
  }
  if (dbKey === "provider_strategic_goal" || dbKey === "provider_rep_strategy_notes") {
    throw new Error(
      `Column ${dbKey} is case intelligence — use Case Intelligence on the case or linked engagement.`,
    );
  }
  if (EVALUATION_OUTCOME_RESERVED_DB_KEYS.has(dbKey)) {
    throw new Error(
      `Column ${dbKey} is an evaluation/outcome lifecycle field — owned by its dedicated workflow, not log-update extraction.`,
    );
  }
}
