-- Add bulk fields to orders
alter table if exists orders
  add column if not exists bulk_mode boolean not null default false,
  add column if not exists total_sqcm numeric;
