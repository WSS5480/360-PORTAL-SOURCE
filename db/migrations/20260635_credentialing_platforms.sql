-- Reusable credentialing / vendor access platforms (global reference data).

create table if not exists public.credentialing_platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_normalized text not null,
  aliases text[] not null default '{}',
  active boolean not null default true,
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint credentialing_platforms_name_normalized_unique unique (name_normalized)
);

create index if not exists credentialing_platforms_active_name_idx
  on public.credentialing_platforms (active, name);

comment on table public.credentialing_platforms is
  'Global catalog of hospital credentialing / vendor access platforms — reusable across providers and facilities.';

-- Structured credentialing intelligence on provider contact mirror (organization-scoped).
alter table if exists public.surgical_sales_contacts
  add column if not exists provider_credentialing_platform_id uuid null references public.credentialing_platforms (id) on delete set null,
  add column if not exists provider_credentialing_platform_name text null,
  add column if not exists provider_credentialing_contact text null,
  add column if not exists provider_credentialing_approval_contact text null,
  add column if not exists provider_credentialing_renewal_notes text null,
  add column if not exists provider_credentialing_required_documents text null,
  add column if not exists provider_credentialing_facility_instructions text null;

comment on column public.surgical_sales_contacts.provider_credentialing_platform_id is
  'Linked credentialing platform reference — supports renewal tracking and facility reuse.';
comment on column public.surgical_sales_contacts.provider_credentialing_platform_name is
  'Denormalized platform display name for intelligence summaries.';
comment on column public.surgical_sales_contacts.provider_credentialing_contact is
  'Primary credentialing / vendor access contact at the facility.';
comment on column public.surgical_sales_contacts.provider_credentialing_approval_contact is
  'Contact who approves vendor or rep access.';
comment on column public.surgical_sales_contacts.provider_credentialing_renewal_notes is
  'Renewal cadence, expiration dates, and credentialing maintenance notes.';
comment on column public.surgical_sales_contacts.provider_credentialing_required_documents is
  'Documents required for vendor credentialing at this facility.';
comment on column public.surgical_sales_contacts.provider_credentialing_facility_instructions is
  'Facility-specific onboarding or credentialing instructions.';

-- Seed common platforms (case-insensitive unique on name_normalized).
insert into public.credentialing_platforms (name, name_normalized, aliases)
values
  ('RepTrax', 'reptrax', array['Rep Trax']),
  ('IntelliCentrics / SEC3URE', 'intellicentrics sec3ure', array['IntelliCentrics', 'SEC3URE', 'Sec3ure']),
  ('Vendormate', 'vendormate', array['VendorMate']),
  ('Symplr', 'symplr', array['Symplr Access']),
  ('Green Security', 'green security', array['GreenSecurity']),
  ('GHX', 'ghx', array['Global Healthcare Exchange']),
  ('Facility-specific portal', 'facility-specific portal', array['Hospital portal', 'Internal portal']),
  ('Manual paperwork', 'manual paperwork', array['Paper forms', 'Manual process']),
  ('Other / unknown', 'other unknown', array['Other', 'Unknown'])
on conflict (name_normalized) do nothing;
