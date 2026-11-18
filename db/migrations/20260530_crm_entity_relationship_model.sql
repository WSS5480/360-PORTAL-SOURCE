-- CRM entity relationship model: providers (contacts), organizations, cases, opportunities.
-- Additive only — preserves surgeon_contact_id on cases and physician_name on opportunities.

comment on column public.surgical_sales_cases.surgeon_contact_id is
  'Provider (surgical_sales_contacts id). Legacy column name; same as provider contact id. Case also requires account_id (organization).';

comment on column public.surgical_sales_cases.account_id is
  'Organization (accounts id) where this case occurs. Provider must be linked to this org via contact org links or legacy account_id.';

comment on column public.surgical_sales_cases.related_opportunity_id is
  'Optional sales opportunity. Cases link to opportunities; multiple cases may reference one opportunity.';

comment on table public.surgical_sales_contact_organizations is
  'Many-to-many: contacts/providers belong to multiple organizations with per-org metadata.';

-- Optional FK from opportunity to provider contact (nullable; physician_name retained for display/backfill).
alter table public.sales_opportunities
  add column if not exists surgeon_contact_id uuid references public.surgical_sales_contacts (id) on delete set null;

comment on column public.sales_opportunities.surgeon_contact_id is
  'Provider contact for this opportunity. physician_name remains denormalized display; prefer this FK when known.';

comment on column public.sales_opportunities.physician_name is
  'Denormalized clinician label. Synced from surgeon_contact_id when set; used when no contact link exists.';

comment on column public.sales_opportunities.account_id is
  'Organization (accounts id) for this opportunity.';

create index if not exists idx_sales_opportunities_surgeon_contact_id
  on public.sales_opportunities (surgeon_contact_id)
  where surgeon_contact_id is not null;

-- Backfill opportunity provider FK where physician_name exactly matches a contact on the same org (legacy account_id).
update public.sales_opportunities o
set surgeon_contact_id = c.id
from public.surgical_sales_contacts c
where o.surgeon_contact_id is null
  and o.account_id is not null
  and o.physician_name is not null
  and trim(o.physician_name) <> ''
  and c.archived_at is null
  and (c.account_id = o.account_id or c.organization_id = o.account_id)
  and lower(trim(o.physician_name)) = lower(trim(concat_ws(
    ' ',
    nullif(trim(c.first_name), ''),
    nullif(trim(c.last_name), '')
  )));

-- Backfill via organization junction when legacy contact row points at a different primary org.
update public.sales_opportunities o
set surgeon_contact_id = co.contact_id
from public.surgical_sales_contact_organizations co
join public.surgical_sales_contacts c on c.id = co.contact_id
where o.surgeon_contact_id is null
  and o.account_id is not null
  and o.physician_name is not null
  and trim(o.physician_name) <> ''
  and co.account_id = o.account_id
  and (co.is_active is null or co.is_active = true)
  and c.archived_at is null
  and lower(trim(o.physician_name)) = lower(trim(concat_ws(
    ' ',
    nullif(trim(c.first_name), ''),
    nullif(trim(c.last_name), '')
  )));
