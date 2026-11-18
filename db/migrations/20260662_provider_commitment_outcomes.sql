-- Lightweight Commitment and Outcomes pathway fields.

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_evaluation_marked_successful text null,
  add column if not exists provider_commitment_confirmed text null,
  add column if not exists provider_commitment_type text null,
  add column if not exists provider_commitment_product_path text null,
  add column if not exists provider_commitment_start_date date null,
  add column if not exists provider_commitment_notes text null,
  add column if not exists provider_outcomes_tracking_active text null,
  add column if not exists provider_outcomes_tracking_status text null;

comment on column public.surgical_sales_contacts.provider_evaluation_marked_successful is
  'Rep marked evaluation successful — lightweight gate to advance toward commitment.';

comment on column public.surgical_sales_contacts.provider_commitment_confirmed is
  'Structured product commitment confirmed by rep (yes/true).';

comment on column public.surgical_sales_contacts.provider_commitment_type is
  'Structured product commitment type (use_next_case, trial_series, etc.).';

comment on column public.surgical_sales_contacts.provider_commitment_product_path is
  'Optional product or solution path for structured commitment.';

comment on column public.surgical_sales_contacts.provider_commitment_start_date is
  'Optional start date for structured product use.';

comment on column public.surgical_sales_contacts.provider_commitment_notes is
  'Optional notes captured when confirming structured commitment.';

comment on column public.surgical_sales_contacts.provider_outcomes_tracking_active is
  'Outcomes tracking shell is active after Move to Outcomes.';

comment on column public.surgical_sales_contacts.provider_outcomes_tracking_status is
  'Lightweight outcomes tracking status label for Mission Board and overview.';

-- Allow outcome log activity types on provider timeline.
alter table public.surgical_sales_provider_activities
  drop constraint if exists surgical_sales_provider_activities_type_check;

alter table public.surgical_sales_provider_activities
  add constraint surgical_sales_provider_activities_type_check
  check (
    activity_type in (
      'clinical_discovery_updated',
      'provider_updated',
      'provider_created',
      'provider_intelligence_promoted',
      'planning_section_completed',
      'pre_call_plan_created',
      'pre_call_plan_updated',
      'pre_call_plan_completed',
      'engagement_created',
      'engagement_updated',
      'engagement_completed',
      'engagement_converted_to_case',
      'engagement_prepared',
      'case_created_from_engagement',
      'ai_note_capture',
      'note_added',
      'outcome_update',
      'product_use_log'
    )
  );
