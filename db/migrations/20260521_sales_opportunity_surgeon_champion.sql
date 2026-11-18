alter table if exists public.sales_opportunities
  add column if not exists surgeon_champion_confirmed boolean not null default false,
  add column if not exists surgeon_champion_name text null;
