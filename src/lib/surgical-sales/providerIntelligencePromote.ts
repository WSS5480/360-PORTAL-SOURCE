import { PRE_CALL_PLAN_CASE_KEYS } from "@/lib/surgical-sales/preCallPlanFields";

export const UPDATE_PROVIDER_INTELLIGENCE_ACTION_LABEL = "Update provider intelligence from this case";

export type ProviderIntelligencePromoteFieldId =
  | "technique_preferences"
  | "product_preferences"
  | "competitive_products"
  | "or_team_dynamics"
  | "training_needs"
  | "evaluation_interest"
  | "relationship_notes"
  | "preference_card_signals";

export type ProviderIntelligencePromoteMode = "replace" | "append";

export type ProviderIntelligencePromoteFieldConfig = {
  id: ProviderIntelligencePromoteFieldId;
  label: string;
  providerKey: string;
  helper?: string;
  rows: number;
};

export const PROVIDER_INTELLIGENCE_PROMOTE_FIELDS: ProviderIntelligencePromoteFieldConfig[] = [
  {
    id: "technique_preferences",
    label: "Technique preferences observed",
    providerKey: "provider_technique_preferences",
    helper: "Technique checkpoints and preferences noted during observation.",
    rows: 4,
  },
  {
    id: "product_preferences",
    label: "Product preferences observed",
    providerKey: "provider_current_vendors",
    helper: "Products, vendors, and fit signals from this case.",
    rows: 4,
  },
  {
    id: "competitive_products",
    label: "Competitive products observed",
    providerKey: "provider_competitive_products",
    rows: 3,
  },
  {
    id: "or_team_dynamics",
    label: "OR workflow / team dynamics",
    providerKey: "provider_or_team_dynamics",
    rows: 4,
  },
  {
    id: "training_needs",
    label: "Enablement / training signals",
    providerKey: "provider_rep_strategy_notes",
    helper: "Durable enablement gaps — not one-off questions for a single visit.",
    rows: 3,
  },
  {
    id: "evaluation_interest",
    label: "Evaluation interest",
    providerKey: "provider_evaluation_openness",
    rows: 3,
  },
  {
    id: "relationship_notes",
    label: "Relationship notes",
    providerKey: "provider_rep_strategy_notes",
    rows: 4,
  },
  {
    id: "preference_card_signals",
    label: "Preference card signals",
    providerKey: "provider_preference_card_signals",
    helper: "Signals that may affect preference card or product adoption.",
    rows: 3,
  },
];

const PROMOTE_FIELD_BY_ID = Object.fromEntries(
  PROVIDER_INTELLIGENCE_PROMOTE_FIELDS.map((f) => [f.id, f]),
) as Record<ProviderIntelligencePromoteFieldId, ProviderIntelligencePromoteFieldConfig>;

export function getProviderIntelligencePromoteField(
  id: ProviderIntelligencePromoteFieldId,
): ProviderIntelligencePromoteFieldConfig {
  return PROMOTE_FIELD_BY_ID[id];
}

function joinCaseLines(parts: unknown[]): string | null {
  const lines = parts
    .map((p) => String(p ?? "").trim())
    .filter(Boolean);
  return lines.length > 0 ? lines.join("\n\n") : null;
}

/** Maps this-case workflow answers into provider profile fields (persistent intelligence). */
export function buildCaseIntelligenceSuggestions(
  caseRow: Record<string, unknown>,
): Record<ProviderIntelligencePromoteFieldId, string | null> {
  const scoreRaw = caseRow.debrief_opportunity_score;
  const score =
    scoreRaw == null || scoreRaw === "" ? null : Number(scoreRaw);
  const productOpp = Boolean(caseRow.debrief_product_opportunity_identified);

  return {
    technique_preferences: joinCaseLines([
      caseRow.live_observation_workflow,
      caseRow.live_observation_surgeon_reactions,
      caseRow.live_observation_staff_process,
    ]),
    product_preferences: joinCaseLines([
      caseRow.live_observation_product_fit,
      caseRow.live_observation_clinical_pain_points,
    ]),
    competitive_products: joinCaseLines([caseRow.live_observation_competitors]),
    or_team_dynamics: joinCaseLines([
      caseRow.live_observation_staff_process,
      caseRow.live_observation_workflow,
      caseRow.live_observation_questions,
    ]),
    training_needs: joinCaseLines([
      caseRow.live_observation_clinical_pain_points,
      caseRow.live_observation_questions,
      caseRow.debrief_suggested_next_action,
    ]),
    evaluation_interest: joinCaseLines([
      caseRow.observation_quick_finding_product_interest
        ? `Product interest: ${caseRow.observation_quick_finding_product_interest}`
        : null,
      productOpp ? "Product fit identified on this case." : null,
      Number.isFinite(score) ? `Product fit score: ${score}` : null,
      caseRow.debrief_key_findings,
    ]),
    relationship_notes: joinCaseLines([
      caseRow.live_observation_surgeon_reactions,
      caseRow.debrief_suggested_next_action,
      caseRow.live_observation_follow_up_items,
    ]),
    preference_card_signals: joinCaseLines([
      caseRow.live_observation_product_fit,
      productOpp ? "Product accepted or strong fit — confirm preference card process." : null,
    ]),
  };
}

export function readProviderFieldValue(
  provider: Record<string, unknown>,
  providerKey: string,
): string | null {
  const t = String(provider[providerKey] ?? "").trim();
  return t || null;
}

export function mergePromotedProviderValue(
  existing: string | null,
  incoming: string,
  mode: ProviderIntelligencePromoteMode,
  caseLabel: string,
): string {
  const next = incoming.trim();
  if (!next) return existing?.trim() || "";
  if (!existing?.trim() || mode === "replace") return next;
  if (existing.includes(next)) return existing;
  return `${existing.trim()}\n\n---\nFrom ${caseLabel}:\n${next}`;
}

export const PROVIDER_INTELLIGENCE_PROMOTE_FIELD_IDS = PROVIDER_INTELLIGENCE_PROMOTE_FIELDS.map((f) => f.id);

const PROMOTE_ELIGIBLE_ACTIVITY_TYPES = new Set([
  "case_updated",
  "note",
  "ai_note_capture",
  "clinical_discovery_insight_from_case",
]);

const PROMOTE_WORKFLOW_FIELD_PREFIXES = ["live_observation_", "debrief_"];

const PRE_CALL_PLAN_KEY_SET = new Set<string>(PRE_CALL_PLAN_CASE_KEYS);

function isPreCallPlanFieldKey(key: string): boolean {
  return PRE_CALL_PLAN_KEY_SET.has(key);
}

function metadataChangedKeys(metadata?: Record<string, unknown>): string[] {
  if (!metadata) return [];
  const fields = metadata.fields;
  if (Array.isArray(fields)) {
    return fields.filter((f): f is string => typeof f === "string");
  }
  const next = metadata.new_values;
  if (next && typeof next === "object") {
    return Object.keys(next as Record<string, unknown>);
  }
  return [];
}

/** Whether an activity feed row can offer “promote to provider profile”. */
export function activityItemEligibleForProviderIntelligencePromote(params: {
  eventType?: string | null;
  category?: string | null;
  metadata?: Record<string, unknown>;
  workflowStage?: string | null;
}): boolean {
  const rawType = String(params.eventType ?? "").toLowerCase();
  if (rawType === "provider_intelligence_promoted") return false;
  if (rawType.startsWith("pre_call_plan_")) return false;

  if (rawType === "workflow_stage_completed" || params.workflowStage === "debrief") {
    return true;
  }

  if (!PROMOTE_ELIGIBLE_ACTIVITY_TYPES.has(rawType)) {
    return params.category === "workflow" || params.category === "ai";
  }

  const keys = metadataChangedKeys(params.metadata);
  if (keys.length === 0) return rawType === "ai_note_capture" || rawType === "note";

  return keys.some((key) => {
    if (isPreCallPlanFieldKey(key)) return false;
    if (key.startsWith("pre_call_") || key.startsWith("pre_observation_")) return false;
    return (
      PROMOTE_WORKFLOW_FIELD_PREFIXES.some((prefix) => key.startsWith(prefix)) ||
      (key.includes("debrief") && !key.startsWith("pre_"))
    );
  });
}
