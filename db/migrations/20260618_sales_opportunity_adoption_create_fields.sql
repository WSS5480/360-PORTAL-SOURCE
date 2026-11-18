-- Product adoption initiative create-flow fields (sales_opportunities).

alter table public.sales_opportunities
  add column if not exists procedure_focus text null,
  add column if not exists adoption_goal text null,
  add column if not exists evaluation_needed boolean not null default false,
  add column if not exists preference_card_target text null,
  add column if not exists competitive_product text null,
  add column if not exists next_action text null,
  add column if not exists source_engagement_id uuid null references public.surgical_sales_engagements (id) on delete set null,
  add column if not exists source_case_id uuid null references public.surgical_sales_cases (id) on delete set null;

create index if not exists idx_sales_opportunities_source_engagement_id
  on public.sales_opportunities (source_engagement_id)
  where source_engagement_id is not null;

create index if not exists idx_sales_opportunities_source_case_id
  on public.sales_opportunities (source_case_id)
  where source_case_id is not null;

comment on column public.sales_opportunities.procedure_focus is
  'Target procedure / clinical focus for this adoption initiative.';
comment on column public.sales_opportunities.adoption_goal is
  'Goal or desired outcome for product adoption.';
comment on column public.sales_opportunities.evaluation_needed is
  'Whether a formal product evaluation is expected.';
comment on column public.sales_opportunities.preference_card_target is
  'Preference card update target or notes.';
comment on column public.sales_opportunities.competitive_product is
  'Competitive product in play for this initiative.';
comment on column public.sales_opportunities.next_action is
  'Rep-defined next action for this initiative.';
comment on column public.sales_opportunities.source_engagement_id is
  'Engagement this initiative was created from (also links engagement.opportunity_id).';
comment on column public.sales_opportunities.source_case_id is
  'Case this initiative was created from (also links case.related_opportunity_id).';
