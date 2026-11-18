-- Provider-level longitudinal intelligence (persists on surgical_sales_contacts; clinicians only in UI).

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_strategic_goal text null,
  add column if not exists provider_procedure_focus text null,
  add column if not exists provider_product_interests text null,
  add column if not exists provider_pre_observation_impact_opening_statement text null,
  add column if not exists provider_pre_observation_probes text null,
  add column if not exists provider_pre_observation_tools_resources text null,
  add column if not exists provider_pre_observation_value_hypothesis text null,
  add column if not exists provider_pre_observation_planned_close text null,
  add column if not exists provider_pre_observation_additional_notes text null;

comment on column public.surgical_sales_contacts.provider_strategic_goal is
  'Provider-level strategic / SMART goal for observation and engagement planning.';
comment on column public.surgical_sales_contacts.provider_procedure_focus is
  'Primary procedures or clinical focus areas for this provider.';
comment on column public.surgical_sales_contacts.provider_product_interests is
  'Free-text product families or lines of interest for this provider relationship.';
comment on column public.surgical_sales_contacts.provider_pre_observation_impact_opening_statement is
  'Provider-level pre-observation impact opening statement (not tied to a single case).';
comment on column public.surgical_sales_contacts.provider_pre_observation_probes is
  'Provider-level probes / information to gather before engagements.';
comment on column public.surgical_sales_contacts.provider_pre_observation_tools_resources is
  'Provider-level tools and resources to use across engagements.';
comment on column public.surgical_sales_contacts.provider_pre_observation_value_hypothesis is
  'Provider-level value hypothesis for the relationship.';
comment on column public.surgical_sales_contacts.provider_pre_observation_planned_close is
  'Provider-level planned close / next step for the relationship.';
comment on column public.surgical_sales_contacts.provider_pre_observation_additional_notes is
  'Provider-level additional planning notes.';
