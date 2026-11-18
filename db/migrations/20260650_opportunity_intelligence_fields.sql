-- Opportunity intelligence — persistent provider fields for Discovery Mapping.

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_clinical_frustrations text null,
  add column if not exists provider_product_gaps text null,
  add column if not exists provider_staff_frustrations text null,
  add column if not exists provider_future_opportunity_signals text null;

comment on column public.surgical_sales_contacts.provider_clinical_frustrations is
  'Clinical frustrations mentioned in intro debriefs, observations, or provider debriefs.';

comment on column public.surgical_sales_contacts.provider_product_gaps is
  'Product gaps or unmet needs surfaced during discovery.';

comment on column public.surgical_sales_contacts.provider_staff_frustrations is
  'Staff frustrations (nursing, tech, coordination) mentioned in field intelligence.';

comment on column public.surgical_sales_contacts.provider_future_opportunity_signals is
  'Future product or growth opportunities hinted during discovery.';
