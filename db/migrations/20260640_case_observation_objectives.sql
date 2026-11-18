-- Observation objectives captured at case create / setup (visible again at debrief).

alter table if exists public.surgical_sales_cases
  add column if not exists observation_key_questions text null,
  add column if not exists observation_signals_to_validate text null;

comment on column public.surgical_sales_cases.observation_goal is
  'Primary observation objective for this case — what the rep aims to learn or validate.';
comment on column public.surgical_sales_cases.observation_key_questions is
  'Key questions the rep wants answered during or after this observation case.';
comment on column public.surgical_sales_cases.observation_signals_to_validate is
  'Optional early signals or hypotheses to validate during the observation.';
