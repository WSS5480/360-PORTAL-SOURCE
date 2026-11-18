/**
 * Protect field time — central operational doctrine for scarce OR / field execution.
 */

export const PROTECT_FIELD_TIME_TITLE = "Protect field time";
export const PROTECT_FIELD_TIME_KICKER =
  "Continuous guard on wasted travel, failed observation, wrong cases, collapsed scheduling, and vendor gates";

export const PROTECT_FIELD_TIME_DIMENSION_IDS = [
  "wasted_or_travel",
  "observation_failure",
  "wrong_procedure_target",
  "scheduling_collapse",
  "vendor_gate_failure",
] as const;

export type ProtectFieldTimeDimensionId = (typeof PROTECT_FIELD_TIME_DIMENSION_IDS)[number];

export type ProtectFieldTimeRiskLevel = "low" | "elevated" | "high" | "critical";

export type ProtectFieldTimePosture = "clear_to_deploy" | "validate_before_travel" | "hold_field_time" | "protect_field_time";

export const PROTECT_FIELD_TIME_DIMENSION_LABELS: Record<ProtectFieldTimeDimensionId, string> = {
  wasted_or_travel: "OR access",
  observation_failure: "Observation approval",
  wrong_procedure_target: "Procedure focus",
  scheduling_collapse: "Case schedule",
  vendor_gate_failure: "Vendor clearance",
};

export const PROTECT_FIELD_TIME_LEVEL_LABELS: Record<ProtectFieldTimeRiskLevel, string> = {
  low: "Clear",
  elevated: "Check",
  high: "Open",
  critical: "Stop",
};

export const PROTECT_FIELD_TIME_POSTURE_LABELS: Record<ProtectFieldTimePosture, string> = {
  clear_to_deploy: "Clear to book OR time",
  validate_before_travel: "Confirm before booking",
  hold_field_time: "Hold OR booking",
  protect_field_time: "Do not book yet",
};
