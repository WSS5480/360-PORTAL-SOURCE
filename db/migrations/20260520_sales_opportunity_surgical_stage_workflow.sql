-- Surgical opportunity workflow stage migration
-- Maps legacy generic CRM stages to surgical lead workflow stages.

alter table public.sales_opportunities
  drop constraint if exists sales_opportunities_stage_check;

update public.sales_opportunities
set stage = case stage
  when 'new_lead' then 'discovery'
  when 'demo_scheduled' then 'case_observations'
  when 'trial_running' then 'secure_trial_evaluation_cases'
  when 'contract_review' then 'present_data_tell_story'
  when 'closed_won' then 'won_update_pref_card'
  when 'closed_lost' then 'closed_lost'
  else stage
end
where stage in (
  'new_lead',
  'demo_scheduled',
  'trial_running',
  'contract_review',
  'closed_won',
  'closed_lost'
);

alter table public.sales_opportunities
  add constraint sales_opportunities_stage_check
  check (
    stage in (
      'discovery',
      'case_observations',
      'validate_clinical_needs',
      'secure_trial_evaluation_cases',
      'present_data_tell_story',
      'won_update_pref_card',
      'closed_lost'
    )
  );

alter table public.sales_opportunities
  alter column stage set default 'discovery';
