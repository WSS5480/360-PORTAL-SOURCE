-- Pathway gate flags on provider contacts (Debrief → Evaluation and Observe → Debrief).

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_observation_sequence_complete text null,
  add column if not exists provider_product_fit_validated text null;

comment on column public.surgical_sales_contacts.provider_observation_sequence_complete is
  'Rep marked observation sequence complete — lightweight gate to advance Observe → Debrief without five cases.';

comment on column public.surgical_sales_contacts.provider_product_fit_validated is
  'Product fit validated at debrief — lightweight gate to advance Debrief → Evaluation.';
