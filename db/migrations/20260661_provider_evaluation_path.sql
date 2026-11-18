-- Lightweight Evaluation stage path selection (not full trial management).

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_evaluation_path text null,
  add column if not exists provider_evaluation_path_target_date date null,
  add column if not exists provider_evaluation_path_notes text null;

comment on column public.surgical_sales_contacts.provider_evaluation_path is
  'Rep-selected evaluation activity within the Evaluation pathway stage (Product Trial, 360 Experience, etc.).';

comment on column public.surgical_sales_contacts.provider_evaluation_path_target_date is
  'Optional target date for the selected evaluation path.';

comment on column public.surgical_sales_contacts.provider_evaluation_path_notes is
  'Optional notes captured when choosing an evaluation path.';
