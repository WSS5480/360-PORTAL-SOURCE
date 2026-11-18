-- Add bulk pricing settings to account_pricing
alter table if exists account_pricing
  add column if not exists bulk_enabled boolean not null default false,
  add column if not exists bulk_rules jsonb not null default '[]'::jsonb;
