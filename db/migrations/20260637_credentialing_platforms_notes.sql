-- Credentialing platforms — catalog notes and updated_at for global service entries.

alter table if exists public.credentialing_platforms
  add column if not exists notes text null,
  add column if not exists updated_at timestamptz not null default now();

comment on column public.credentialing_platforms.notes is
  'Optional internal notes about this credentialing / vendor access service.';
comment on column public.credentialing_platforms.updated_at is
  'Last update timestamp — refreshed when name, aliases, or notes change.';
