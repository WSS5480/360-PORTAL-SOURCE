-- Shared contact-to-organization relationships for surgical CRM.
-- Additive migration: keeps legacy account_id / organization_id columns functional.

create table if not exists public.surgical_sales_contact_organizations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.surgical_sales_contacts(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  role_type text not null default 'other',
  is_primary_org boolean not null default false,
  is_active boolean not null default true,
  specialty text null,
  relationship_notes text null,
  preferred_hospital text null,
  influence_level text not null default 'unknown',
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint surgical_sales_contact_orgs_unique unique (contact_id, account_id)
);

create index if not exists idx_surgical_sales_contact_orgs_account on public.surgical_sales_contact_organizations(account_id);
create index if not exists idx_surgical_sales_contact_orgs_contact on public.surgical_sales_contact_organizations(contact_id);
create index if not exists idx_surgical_sales_contact_orgs_account_active on public.surgical_sales_contact_organizations(account_id, is_active);

create unique index if not exists uq_surgical_sales_contact_orgs_primary
  on public.surgical_sales_contact_organizations(contact_id)
  where is_primary_org = true;

create or replace function public.touch_surgical_sales_contact_orgs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists trg_touch_surgical_sales_contact_orgs_updated_at on public.surgical_sales_contact_organizations;
create trigger trg_touch_surgical_sales_contact_orgs_updated_at
before update on public.surgical_sales_contact_organizations
for each row
execute function public.touch_surgical_sales_contact_orgs_updated_at();

insert into public.surgical_sales_contact_organizations (
  contact_id,
  account_id,
  role_type,
  is_primary_org,
  is_active,
  specialty,
  relationship_notes,
  preferred_hospital,
  influence_level,
  created_by,
  created_at,
  updated_at
)
select
  c.id as contact_id,
  coalesce(c.organization_id, c.account_id) as account_id,
  coalesce(nullif(c.role_type, ''), 'other') as role_type,
  true as is_primary_org,
  c.archived_at is null as is_active,
  null as specialty,
  c.notes as relationship_notes,
  null as preferred_hospital,
  coalesce(nullif(c.influence_level, ''), 'unknown') as influence_level,
  coalesce(c.created_by, c.created_by_user_id) as created_by,
  coalesce(c.created_at, now()) as created_at,
  coalesce(c.updated_at, now()) as updated_at
from public.surgical_sales_contacts c
where coalesce(c.organization_id, c.account_id) is not null
on conflict (contact_id, account_id) do nothing;
