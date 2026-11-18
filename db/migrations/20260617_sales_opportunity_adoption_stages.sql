-- Product adoption initiative stages (v3).
-- Maps all prior stage slugs in-place; does not delete rows or orphan data.

alter table public.sales_opportunities
  drop constraint if exists sales_opportunities_stage_check;

-- v1 generic CRM + v2 surgical workflow → v3 adoption initiative stages
update public.sales_opportunities
set stage = case stage
  when 'new_lead' then 'discovery'
  when 'demo_scheduled' then 'evaluation_planned'
  when 'trial_running' then 'evaluation_active'
  when 'contract_review' then 'outcome_review'
  when 'closed_won' then 'won'
  when 'discovery' then 'discovery'
  when 'case_observations' then 'clinical_validation'
  when 'validate_clinical_needs' then 'clinical_validation'
  when 'secure_trial_evaluation_cases' then 'evaluation_active'
  when 'present_data_tell_story' then 'outcome_review'
  when 'won_update_pref_card' then 'preference_card_progress'
  when 'closed_lost' then 'lost'
  else stage
end
where stage is not null;

-- Any remaining unknown slug: best-effort bucket (preserve row, avoid constraint failure)
update public.sales_opportunities
set stage = 'discovery'
where stage is not null
  and stage not in (
    'discovery',
    'clinical_validation',
    'evaluation_planned',
    'evaluation_active',
    'outcome_review',
    'preference_card_progress',
    'adoption_expanding',
    'won',
    'lost'
  );

alter table public.sales_opportunities
  add constraint sales_opportunities_stage_check
  check (
    stage in (
      'discovery',
      'clinical_validation',
      'evaluation_planned',
      'evaluation_active',
      'outcome_review',
      'preference_card_progress',
      'adoption_expanding',
      'won',
      'lost'
    )
  );

alter table public.sales_opportunities
  alter column stage set default 'discovery';

comment on column public.sales_opportunities.stage is
  'Adoption initiative pipeline stage: discovery → clinical_validation → evaluation_* → outcome_review → preference_card_progress → adoption_expanding → won | lost.';

-- Provider relationship backfill after stage rename (was won_update_pref_card)
update public.surgical_sales_contacts sc
set provider_relationship_stage = 'established_customer'
where sc.archived_at is null
  and sc.provider_crm_status = 'active'
  and exists (
    select 1 from public.sales_opportunities o
    where o.stage in ('won', 'preference_card_progress', 'adoption_expanding')
      and (
        lower(trim(coalesce(o.physician_name, ''))) = lower(trim(coalesce(sc.first_name, '') || ' ' || coalesce(sc.last_name, '')))
        or o.account_id = sc.account_id
        or o.account_id = sc.organization_id
      )
  )
  and (sc.provider_relationship_stage is null or sc.provider_relationship_stage in ('prospect', 'active_relationship'));
