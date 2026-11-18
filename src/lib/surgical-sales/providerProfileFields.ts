import {
  buildProviderPlanningCompletion,
  type ProviderPlanningCompletion,
} from "@/lib/surgical-sales/providerPlanningCompletion";

export type { ProviderPlanningCompletion };

export type {
  ProviderPlanningFieldKey,
  ProviderProfileFieldKey,
  ProviderPlanningFieldConfig,
} from "@/lib/surgical-sales/providerPrePlanningFieldConfig";

export {
  PROVIDER_PRE_PLANNING_FIELDS,
  PROVIDER_PLANNING_FIELD_KEYS,
  PROVIDER_PLANNING_FIELD_LABELS,
} from "@/lib/surgical-sales/providerPrePlanningFieldConfig";

import {
  PROVIDER_PLANNING_FIELD_KEYS,
  type ProviderPlanningFieldKey,
  type ProviderProfileFieldKey,
} from "@/lib/surgical-sales/providerPrePlanningFieldConfig";

export function countProviderPlanningFields(
  row: Record<string, unknown>,
  context?: { referenceCaseDate?: string | null; referenceCaseUpdatedAt?: string | null },
): ProviderPlanningCompletion {
  return buildProviderPlanningCompletion(row, context);
}

export function mergeProviderProfilePlanningPatch(
  patch: Record<string, unknown>,
  input: Partial<Record<ProviderProfileFieldKey, string | null>>,
): string | null {
  const trimOrNull = (s: string | null | undefined, max: number): string | null => {
    if (s === null || s === undefined) return null;
    const t = String(s).trim();
    if (!t) return null;
    return t.length > max ? t.slice(0, max) : t;
  };

  const keys: ProviderProfileFieldKey[] = [
    "provider_procedure_focus",
    "provider_product_interests",
    ...PROVIDER_PLANNING_FIELD_KEYS,
  ];

  let planningTouched = false;
  for (const key of keys) {
    if (input[key] === undefined) continue;
    patch[key] = trimOrNull(input[key] ?? null, 16000);
    if (PROVIDER_PLANNING_FIELD_KEYS.includes(key as ProviderPlanningFieldKey)) {
      planningTouched = true;
    }
  }
  if (planningTouched) {
    patch.provider_planning_updated_at = new Date().toISOString();
  }
  return null;
}
