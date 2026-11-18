-- Structured quick-finding: product interest level (None / Mentioned / Strong).

alter table if exists public.surgical_sales_cases
  add column if not exists observation_quick_finding_product_interest text null;

comment on column public.surgical_sales_cases.observation_quick_finding_product_interest is
  'Observation quick finding — product interest level before full debrief.';
