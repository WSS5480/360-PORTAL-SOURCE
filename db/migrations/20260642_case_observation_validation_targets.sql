alter table if exists public.surgical_sales_cases
  add column if not exists observation_validation_targets jsonb null;

comment on column public.surgical_sales_cases.observation_validation_targets is
  'Structured post-case validation targets captured during observation planning.';
