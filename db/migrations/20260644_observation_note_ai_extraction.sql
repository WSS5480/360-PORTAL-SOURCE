-- AI-extracted entities stored separately from raw observation note text.

alter table if exists public.sales_operational_notes
  add column if not exists ai_extraction_json jsonb null;

comment on column public.sales_operational_notes.ai_extraction_json is
  'AI-extracted observation entities (scheduling contact, procedure focus, category, confidence) — raw body unchanged.';

alter table if exists public.surgical_sales_cases
  add column if not exists observation_workflow_intelligence_snapshot jsonb null;

comment on column public.surgical_sales_cases.observation_workflow_intelligence_snapshot is
  'Rolling AI-organized observation intelligence distilled from timeline notes.';
