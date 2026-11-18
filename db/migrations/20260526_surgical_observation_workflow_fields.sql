alter table if exists public.surgical_sales_cases
  add column if not exists pre_observation_impact_opening_statement text null,
  add column if not exists pre_observation_probes text null,
  add column if not exists pre_observation_tools_resources text null,
  add column if not exists pre_observation_value_hypothesis text null,
  add column if not exists pre_observation_planned_close text null,
  add column if not exists pre_observation_additional_notes text null,
  add column if not exists live_observation_workflow text null,
  add column if not exists live_observation_clinical_pain_points text null,
  add column if not exists live_observation_surgeon_reactions text null,
  add column if not exists live_observation_product_fit text null,
  add column if not exists live_observation_competitors text null,
  add column if not exists live_observation_staff_process text null,
  add column if not exists live_observation_questions text null,
  add column if not exists live_observation_follow_up_items text null,
  add column if not exists debrief_key_findings text null,
  add column if not exists debrief_opportunity_score integer null,
  add column if not exists debrief_recommended_next_stage text null,
  add column if not exists debrief_product_opportunity_identified boolean not null default false,
  add column if not exists debrief_suggested_next_action text null,
  add column if not exists debrief_convert_to_product_support_case boolean not null default false;

comment on column public.surgical_sales_cases.observation_goal is
  'Observation workflow sales call objective / SMART goal.';
comment on column public.surgical_sales_cases.pre_observation_impact_opening_statement is
  'Observation workflow pre-call impact opening statement.';
comment on column public.surgical_sales_cases.pre_observation_probes is
  'Observation workflow probes / information to gather.';
comment on column public.surgical_sales_cases.pre_observation_tools_resources is
  'Observation workflow tools and resources to use.';
comment on column public.surgical_sales_cases.pre_observation_value_hypothesis is
  'Observation workflow value hypothesis.';
comment on column public.surgical_sales_cases.pre_observation_planned_close is
  'Observation workflow planned close / next step.';
comment on column public.surgical_sales_cases.pre_observation_additional_notes is
  'Observation workflow additional planning notes.';
comment on column public.surgical_sales_cases.live_observation_workflow is
  'Structured live notes about workflow observations.';
comment on column public.surgical_sales_cases.live_observation_clinical_pain_points is
  'Structured live notes about clinical pain points.';
comment on column public.surgical_sales_cases.live_observation_surgeon_reactions is
  'Structured live notes about surgeon reactions.';
comment on column public.surgical_sales_cases.live_observation_product_fit is
  'Structured live notes about product fit observations.';
comment on column public.surgical_sales_cases.live_observation_competitors is
  'Structured live notes about competitor products seen.';
comment on column public.surgical_sales_cases.live_observation_staff_process is
  'Structured live notes about staff and process observations.';
comment on column public.surgical_sales_cases.live_observation_questions is
  'Structured live notes about questions raised during the observation.';
comment on column public.surgical_sales_cases.live_observation_follow_up_items is
  'Structured live notes about follow-up items identified during the observation.';
comment on column public.surgical_sales_cases.debrief_key_findings is
  'Observation workflow post-case key findings.';
comment on column public.surgical_sales_cases.debrief_opportunity_score is
  'Observation workflow opportunity score from 0-100.';
comment on column public.surgical_sales_cases.debrief_recommended_next_stage is
  'Recommended linked opportunity pipeline stage after the observation.';
comment on column public.surgical_sales_cases.debrief_product_opportunity_identified is
  'Whether the observation surfaced a product opportunity.';
comment on column public.surgical_sales_cases.follow_up_needed is
  'Whether follow-up is needed after the observation / case.';
comment on column public.surgical_sales_cases.debrief_suggested_next_action is
  'Suggested next action after the observation debrief.';
comment on column public.surgical_sales_cases.debrief_convert_to_product_support_case is
  'Whether the observation should convert into a product support case.';

alter table if exists public.surgical_sales_cases
  drop constraint if exists surgical_sales_cases_debrief_opportunity_score_check;

alter table if exists public.surgical_sales_cases
  add constraint surgical_sales_cases_debrief_opportunity_score_check
  check (
    debrief_opportunity_score is null
    or (debrief_opportunity_score >= 0 and debrief_opportunity_score <= 100)
  );

alter table if exists public.surgical_sales_cases
  drop constraint if exists surgical_sales_cases_debrief_recommended_next_stage_check;

alter table if exists public.surgical_sales_cases
  add constraint surgical_sales_cases_debrief_recommended_next_stage_check
  check (
    debrief_recommended_next_stage is null
    or debrief_recommended_next_stage in (
      'discovery',
      'case_observations',
      'validate_clinical_needs',
      'secure_trial_evaluation_cases',
      'present_data_tell_story',
      'won_update_pref_card',
      'closed_lost'
    )
  );
