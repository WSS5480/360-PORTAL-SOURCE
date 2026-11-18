-- Scheduling ownership model — provider vs facility control pathways.

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_observation_scheduling_control text null,
  add column if not exists provider_scheduling_contact text null,
  add column if not exists provider_facility_scheduling_contact text null;

comment on column public.surgical_sales_contacts.provider_observation_scheduling_control is
  'Primary scheduling control path: provider_office, facility, shared_workflow, or unknown.';
comment on column public.surgical_sales_contacts.provider_scheduling_contact is
  'Provider-office scheduling contact summary (private office, surgery coordinator, MA).';
comment on column public.surgical_sales_contacts.provider_facility_scheduling_contact is
  'Facility scheduling contact summary (OR scheduler, ASC, central scheduling).';

alter table if exists public.surgical_sales_contact_relationships
  add column if not exists ownership_type text null,
  add column if not exists workflow_role text null;

comment on column public.surgical_sales_contact_relationships.ownership_type is
  'Contact ownership: provider (provider workflow), organization (facility), or shared.';
comment on column public.surgical_sales_contact_relationships.workflow_role is
  'Primary workflow responsibility id for this relationship (e.g. observation_scheduling_owner).';

alter table if exists public.surgical_sales_contact_relationships
  drop constraint if exists surgical_sales_contact_relationships_ownership_type_check;

alter table if exists public.surgical_sales_contact_relationships
  add constraint surgical_sales_contact_relationships_ownership_type_check
  check (ownership_type is null or ownership_type in ('provider', 'organization', 'shared'));
