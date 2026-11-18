/**

 * Field execution risk — re-exports controlled overview vocabulary.

 */



export type ProviderFieldTimeRiskState =
  | "efficient_field_target"
  | "worth_exploratory_visit"
  | "requires_remote_validation_first"
  | "high_wasted_field_risk";

import {

  PROVIDER_OVERVIEW_FIELD_EXECUTION_RISK_INPUT_LABELS,

  PROVIDER_OVERVIEW_FIELD_EXECUTION_RISK_KICKER,

  PROVIDER_OVERVIEW_FIELD_EXECUTION_RISK_TITLE,

} from "@/lib/surgical-sales/providerOverviewVocabulary";



export const PROVIDER_FIELD_TIME_RISK_TITLE = PROVIDER_OVERVIEW_FIELD_EXECUTION_RISK_TITLE;

export const PROVIDER_FIELD_TIME_RISK_KICKER = PROVIDER_OVERVIEW_FIELD_EXECUTION_RISK_KICKER;

export const PROVIDER_FIELD_TIME_RISK_INPUT_LABELS = PROVIDER_OVERVIEW_FIELD_EXECUTION_RISK_INPUT_LABELS;

export type ProviderFieldTimeRiskInputId = keyof typeof PROVIDER_FIELD_TIME_RISK_INPUT_LABELS;

export type ProviderFieldTimeRiskInputStatus = "strong" | "partial" | "open" | "blocking";



export const PROVIDER_FIELD_TIME_RISK_STATE_LABELS: Record<ProviderFieldTimeRiskState, string> = {
  efficient_field_target: "Field-ready context",
  worth_exploratory_visit: "Light touch recommended",
  requires_remote_validation_first: "Remote validation first",
  high_wasted_field_risk: "Early visibility — map access first",
};

export const PROVIDER_FIELD_TIME_RISK_STATE_GUIDANCE: Record<ProviderFieldTimeRiskState, string> = {
  efficient_field_target: "OR access and workflow support the next field touch.",
  worth_exploratory_visit: "Light touch only — build context before heavier OR days.",
  requires_remote_validation_first: "Confirm scheduling ownership and OR access remotely first.",
  high_wasted_field_risk: "Map access and scheduling before booking OR time.",
};



export const PROVIDER_FIELD_TIME_RISK_INPUT_STATUS_LABELS = {

  strong: "Mapped",

  partial: "Partial",

  open: "Open",

  blocking: "Still open",

} as const;

