-- Structured commercial intelligence objects (observation, scheduling, credentialing, clinical, contacts).

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_commercial_intelligence jsonb not null default '{}'::jsonb;

comment on column public.surgical_sales_contacts.provider_commercial_intelligence is
  'Structured commercial intelligence from debrief extraction — category-driven workflow state, not sentence fragments.';
