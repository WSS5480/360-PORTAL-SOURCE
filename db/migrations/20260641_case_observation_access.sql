alter table if exists public.surgical_sales_cases
  add column if not exists observation_access_scheduling_owner text null,
  add column if not exists observation_access_pathway text null,
  add column if not exists observation_access_credentialing text null,
  add column if not exists observation_access_vendor_restrictions text null,
  add column if not exists observation_access_preferred_timing text null,
  add column if not exists observation_access_metadata jsonb null;

comment on column public.surgical_sales_cases.observation_access_scheduling_owner is
  'Case-level observation access: who controls timing or OR scheduling.';
comment on column public.surgical_sales_cases.observation_access_pathway is
  'Case-level observation access pathway (rep invite, office manager, OR scheduler, portal, unknown).';
comment on column public.surgical_sales_cases.observation_access_credentialing is
  'Case-level credentialing readiness token: unknown, not_required, required_not_started, in_progress, verified.';
comment on column public.surgical_sales_cases.observation_access_vendor_restrictions is
  'Case-level vendor/rep restrictions for observation access.';
comment on column public.surgical_sales_cases.observation_access_preferred_timing is
  'Case-level preferred timing clues for scheduling an observation.';
comment on column public.surgical_sales_cases.observation_access_metadata is
  'Fallback structured observation access metadata payload captured from New Case flow.';
