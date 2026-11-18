-- Backfill organization links for contacts that only have legacy organization_id / account_id.

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
  coalesce(c.is_primary_contact, c.is_primary, false) as is_primary_org,
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
  and not exists (
    select 1
    from public.surgical_sales_contact_organizations co
    where co.contact_id = c.id
      and co.account_id = coalesce(c.organization_id, c.account_id)
  )
on conflict (contact_id, account_id) do nothing;
