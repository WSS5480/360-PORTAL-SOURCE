-- Tracks when provider-level pre-observation planning was last saved (for needs-update detection).

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_planning_updated_at timestamptz null;

comment on column public.surgical_sales_contacts.provider_planning_updated_at is
  'Last time provider-level pre-observation planning fields were saved.';
