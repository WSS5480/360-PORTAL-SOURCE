-- Pre-Call Plan: case-scoped planning fields (terminology + optional name overrides).

alter table public.surgical_sales_cases
  add column if not exists pre_call_hospital_name text null,
  add column if not exists pre_call_surgeon_name text null;

comment on column public.surgical_sales_cases.pre_call_hospital_name is
  'Pre-Call Plan: facility for this interaction (override). Defaults from case organization when empty.';
comment on column public.surgical_sales_cases.pre_call_surgeon_name is
  'Pre-Call Plan: clinician for this interaction (override). Defaults from assigned provider when empty.';

comment on column public.surgical_sales_cases.observation_goal is
  'Pre-Call Plan: sales call objective / SMART goal for this case interaction.';
comment on column public.surgical_sales_cases.pre_observation_impact_opening_statement is
  'Pre-Call Plan: impact opening statement for this case interaction.';
comment on column public.surgical_sales_cases.pre_observation_probes is
  'Pre-Call Plan: probes / information to gather for this case interaction.';
comment on column public.surgical_sales_cases.pre_observation_tools_resources is
  'Pre-Call Plan: tools and resources for this case interaction.';
comment on column public.surgical_sales_cases.pre_observation_value_hypothesis is
  'Pre-Call Plan: value hypothesis for this case interaction.';
comment on column public.surgical_sales_cases.pre_observation_planned_close is
  'Pre-Call Plan: planned close / next step for this case interaction.';
comment on column public.surgical_sales_cases.pre_observation_additional_notes is
  'Pre-Call Plan: additional notes for this case interaction.';

comment on column public.surgical_sales_contacts.provider_pre_observation_impact_opening_statement is
  'Deprecated: historical pre-call plan copy. Authoritative plan is per case (pre_observation_* on surgical_sales_cases).';
comment on column public.surgical_sales_contacts.provider_pre_observation_probes is
  'Deprecated: historical pre-call plan copy. Authoritative plan is per case.';
comment on column public.surgical_sales_contacts.provider_pre_observation_tools_resources is
  'Deprecated: historical pre-call plan copy. Authoritative plan is per case.';
comment on column public.surgical_sales_contacts.provider_pre_observation_value_hypothesis is
  'Deprecated: historical pre-call plan copy. Authoritative plan is per case.';
comment on column public.surgical_sales_contacts.provider_pre_observation_planned_close is
  'Deprecated: historical pre-call plan copy. Authoritative plan is per case.';
comment on column public.surgical_sales_contacts.provider_pre_observation_additional_notes is
  'Deprecated: historical pre-call plan copy. Authoritative plan is per case.';
