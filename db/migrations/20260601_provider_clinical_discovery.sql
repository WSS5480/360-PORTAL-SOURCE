-- Provider-level clinical discovery (Intuitive-style core questions), persistent on contact.

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_clinical_discovery_modality_challenge text null,
  add column if not exists provider_clinical_discovery_why_challenge text null,
  add column if not exists provider_clinical_discovery_implications text null,
  add column if not exists provider_clinical_discovery_causes text null,
  add column if not exists provider_clinical_discovery_frequency text null,
  add column if not exists provider_clinical_discovery_priority_now text null,
  add column if not exists provider_clinical_discovery_priority_rank text null,
  add column if not exists provider_clinical_discovery_prior_attempts text null,
  add column if not exists provider_clinical_discovery_if_unaddressed text null;

comment on column public.surgical_sales_contacts.provider_clinical_discovery_modality_challenge is
  'Clinical discovery: challenge for surgeon current modality.';
comment on column public.surgical_sales_contacts.provider_clinical_discovery_why_challenge is
  'Clinical discovery: why that is a challenge.';
comment on column public.surgical_sales_contacts.provider_clinical_discovery_implications is
  'Clinical discovery: implications of the issue.';
comment on column public.surgical_sales_contacts.provider_clinical_discovery_causes is
  'Clinical discovery: causes.';
comment on column public.surgical_sales_contacts.provider_clinical_discovery_frequency is
  'Clinical discovery: how often it happens.';
comment on column public.surgical_sales_contacts.provider_clinical_discovery_priority_now is
  'Clinical discovery: why priority now.';
comment on column public.surgical_sales_contacts.provider_clinical_discovery_priority_rank is
  'Clinical discovery: rank against other priorities.';
comment on column public.surgical_sales_contacts.provider_clinical_discovery_prior_attempts is
  'Clinical discovery: what has been done to address.';
comment on column public.surgical_sales_contacts.provider_clinical_discovery_if_unaddressed is
  'Clinical discovery: what happens if not addressed.';
