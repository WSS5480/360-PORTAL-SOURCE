-- Observation Readiness — central provider intelligence for OR access and observation logistics.

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_observation_credentialing_needed text null,
  add column if not exists provider_observation_coordinator_contact text null,
  add column if not exists provider_observation_cadence_preference text null,
  add column if not exists provider_observation_best_days_case_types text null;

comment on column public.surgical_sales_contacts.provider_observation_feasibility is
  'Whether observation is allowed for this provider (persistent access posture).';
comment on column public.surgical_sales_contacts.provider_observation_credentialing_needed is
  'Whether vendor/rep credentialing is required before observation.';
comment on column public.surgical_sales_contacts.provider_ideal_observation_cases is
  'Ideal procedures or case types to observe for adoption planning.';
comment on column public.surgical_sales_contacts.provider_observation_access_path is
  'OR access constraints, blockers, and clearance requirements.';
comment on column public.surgical_sales_contacts.provider_observation_coordinator_contact is
  'Primary OR/scheduling coordinator contact for observation access.';
comment on column public.surgical_sales_contacts.provider_observation_cadence_preference is
  'Preferred cadence for observation touchpoints (per case, monthly, etc.).';
comment on column public.surgical_sales_contacts.provider_observation_best_days_case_types is
  'Best days of week and case types for productive observation.';
