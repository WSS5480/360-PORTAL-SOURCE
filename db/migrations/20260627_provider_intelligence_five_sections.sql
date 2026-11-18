-- Provider intelligence five operational sections — dedicated persistent columns.

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_technique_detail text null,
  add column if not exists provider_workflow_pain_points text null,
  add column if not exists provider_credentialing_status text null,
  add column if not exists provider_support_expectations text null,
  add column if not exists provider_responsiveness text null,
  add column if not exists provider_dissatisfaction_areas text null,
  add column if not exists provider_observation_feasibility text null,
  add column if not exists provider_ideal_observation_cases text null,
  add column if not exists provider_observation_access_path text null;

comment on column public.surgical_sales_contacts.provider_technique_detail is
  'Persistent technique preferences (approach, instruments) — separate from modality.';
comment on column public.surgical_sales_contacts.provider_workflow_pain_points is
  'Persistent clinical workflow friction points for this provider.';
comment on column public.surgical_sales_contacts.provider_credentialing_status is
  'Credentialing / access clearance status for OR and vendor engagement.';
comment on column public.surgical_sales_contacts.provider_support_expectations is
  'Expected rep and clinical support level in the OR and account.';
comment on column public.surgical_sales_contacts.provider_responsiveness is
  'How quickly and reliably the provider or office responds.';
comment on column public.surgical_sales_contacts.provider_dissatisfaction_areas is
  'Areas of dissatisfaction with current products, vendors, or workflow.';
comment on column public.surgical_sales_contacts.provider_observation_feasibility is
  'How feasible observation access is for this provider (persistent, not per-visit).';
comment on column public.surgical_sales_contacts.provider_ideal_observation_cases is
  'Ideal case types or scenarios for productive observation.';
comment on column public.surgical_sales_contacts.provider_observation_access_path is
  'Persistent path to secure observation access (coordinator, committee, etc.).';

comment on column public.surgical_sales_contacts.provider_first_observation_questions is
  'Persistent questions to validate on observation — not per-engagement Pre-Call probes.';

-- Move legacy observation-access tokens from OR dynamics into feasibility when encoded as `token|notes`.
update public.surgical_sales_contacts
set
  provider_observation_feasibility = split_part(provider_or_team_dynamics, '|', 1),
  provider_or_team_dynamics = nullif(trim(split_part(provider_or_team_dynamics, '|', 2)), '')
where provider_observation_feasibility is null
  and provider_or_team_dynamics is not null
  and split_part(provider_or_team_dynamics, '|', 1) in (
    'easy',
    'restricted',
    'credentialing_required',
    'unknown'
  );

update public.surgical_sales_contacts
set provider_observation_feasibility = provider_or_team_dynamics
where provider_observation_feasibility is null
  and provider_or_team_dynamics is not null
  and provider_or_team_dynamics in (
    'easy',
    'restricted',
    'credentialing_required',
    'unknown'
  );

update public.surgical_sales_contacts
set provider_or_team_dynamics = null
where provider_or_team_dynamics in (
  'easy',
  'restricted',
  'credentialing_required',
  'unknown'
);
