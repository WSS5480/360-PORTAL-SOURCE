-- Dedicated provider intelligence columns (persistent profile — not Pre-Call Plan).

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_technique_preferences text null,
  add column if not exists provider_preference_card_signals text null;

comment on column public.surgical_sales_contacts.provider_technique_preferences is
  'Persistent technique preferences for this provider (not per-case Pre-Call Plan probes).';

comment on column public.surgical_sales_contacts.provider_preference_card_signals is
  'Preference card / adoption signals for this provider (not per-case value hypothesis).';

comment on column public.surgical_sales_contacts.provider_or_team_dynamics is
  'Persistent OR / team dynamics for this provider (not per-case tools/resources).';
