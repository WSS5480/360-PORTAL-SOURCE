alter table if exists public.surgical_sales_cases
  add column if not exists case_type text not null default 'product_support',
  add column if not exists observation_goal text null,
  add column if not exists follow_up_needed boolean not null default false,
  add column if not exists related_opportunity_id uuid null references public.sales_opportunities(id) on delete set null;

alter table if exists public.surgical_sales_cases
  drop constraint if exists surgical_sales_cases_case_type_check;

alter table if exists public.surgical_sales_cases
  add constraint surgical_sales_cases_case_type_check
  check (case_type in ('observation', 'product_support'));

create index if not exists idx_surgical_sales_cases_case_type
  on public.surgical_sales_cases (case_type);

create index if not exists idx_surgical_sales_cases_related_opportunity_id
  on public.surgical_sales_cases (related_opportunity_id)
  where related_opportunity_id is not null;
