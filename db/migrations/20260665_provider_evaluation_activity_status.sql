-- Rep-facing manual override for evaluation activity status on Mission Board.

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_evaluation_activity_status text null;

comment on column public.surgical_sales_contacts.provider_evaluation_activity_status is
  'Manual evaluation activity status (not_scheduled, planned, active, complete). Overrides derived engagement status when set.';
