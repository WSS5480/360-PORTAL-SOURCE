/**
 * @deprecated Meeting strategy was removed from Provider Intelligence.
 * Use preCallPlanFields.ts (Engagement Preparation on engagements) for:
 * meeting objectives, discovery hypotheses, talking points, next-visit priorities, tactical asks.
 *
 * Persistent provider fields: providerIntelligenceFields.ts
 */

export type ProviderPlanningFieldKey = never;

export type ProviderProfileFieldKey = "provider_procedure_focus" | "provider_product_interests";

export type ProviderPlanningFieldConfig = {
  key: ProviderPlanningFieldKey;
  label: string;
  helper?: string;
  rows: number;
};

/** @deprecated Empty — strategic goal belongs on Engagement Preparation, not the provider profile. */
export const PROVIDER_INTELLIGENCE_STRATEGIC_FIELDS: ProviderPlanningFieldConfig[] = [];

/** @deprecated */
export const PROVIDER_PRE_PLANNING_FIELDS = PROVIDER_INTELLIGENCE_STRATEGIC_FIELDS;

export const PROVIDER_PLANNING_FIELD_KEYS: ProviderPlanningFieldKey[] = [];

export const PROVIDER_PLANNING_FIELD_LABELS = {} as Record<ProviderPlanningFieldKey, string>;
