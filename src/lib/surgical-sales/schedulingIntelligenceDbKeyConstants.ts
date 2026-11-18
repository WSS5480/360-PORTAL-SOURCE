/** Scheduling intelligence db keys — leaf module (no imports) to avoid init-order cycles. */

export const SCHEDULING_DB_KEY_CANDIDATES = [
  "provider_scheduling_contact",
  "provider_observation_scheduling_control",
  "provider_observation_coordinator_contact",
  "provider_facility_scheduling_contact",
  "provider_observation_best_days_case_types",
] as const;

export const SCHEDULING_OWNER_FIELD_DB_KEYS: readonly string[] = SCHEDULING_DB_KEY_CANDIDATES;
