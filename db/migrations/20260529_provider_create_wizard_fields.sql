-- Provider create wizard: procedural intelligence, extended pre-observation, relationship strategy.

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_onboarding_status text null default 'active',
  add column if not exists provider_case_volume_estimate text null,
  add column if not exists provider_current_vendors text null,
  add column if not exists provider_competitive_products text null,
  add column if not exists provider_evaluation_openness text null,
  add column if not exists provider_or_team_dynamics text null,
  add column if not exists provider_first_observation_questions text null,
  add column if not exists provider_decision_maker_status text null,
  add column if not exists provider_champion_potential text null,
  add column if not exists provider_communication_style text null,
  add column if not exists provider_follow_up_approach text null,
  add column if not exists provider_rep_strategy_notes text null;

comment on column public.surgical_sales_contacts.provider_onboarding_status is
  'draft = saved from create wizard before planning complete; active = onboarding finished or legacy.';
comment on column public.surgical_sales_contacts.provider_case_volume_estimate is
  'Estimated monthly or annual case volume for procedural intelligence.';
comment on column public.surgical_sales_contacts.provider_current_vendors is
  'Current vendors / products used by this provider.';
comment on column public.surgical_sales_contacts.provider_competitive_products is
  'Competitive products this provider uses.';
comment on column public.surgical_sales_contacts.provider_evaluation_openness is
  'Openness to evaluating new products.';
comment on column public.surgical_sales_contacts.provider_or_team_dynamics is
  'OR team dynamics notes for pre-observation planning.';
comment on column public.surgical_sales_contacts.provider_first_observation_questions is
  'Questions to answer during the first observation.';
comment on column public.surgical_sales_contacts.provider_decision_maker_status is
  'Decision-maker status for relationship strategy.';
comment on column public.surgical_sales_contacts.provider_champion_potential is
  'Champion potential assessment.';
comment on column public.surgical_sales_contacts.provider_communication_style is
  'Preferred communication style notes.';
comment on column public.surgical_sales_contacts.provider_follow_up_approach is
  'Follow-up approach for this provider.';
comment on column public.surgical_sales_contacts.provider_rep_strategy_notes is
  'Rep strategy notes for the relationship.';
