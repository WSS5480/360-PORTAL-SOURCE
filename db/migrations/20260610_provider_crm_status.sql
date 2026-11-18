-- Provider CRM lifecycle status (separate from provider_onboarding_status draft/active).

ALTER TABLE public.surgical_sales_contacts
  ADD COLUMN IF NOT EXISTS provider_crm_status text NULL DEFAULT 'prospect';

UPDATE public.surgical_sales_contacts
SET provider_crm_status = 'active'
WHERE provider_crm_status IS NULL
  AND coalesce(provider_onboarding_status, 'active') = 'active'
  AND provider_onboarding_status IS DISTINCT FROM 'draft';

UPDATE public.surgical_sales_contacts
SET provider_crm_status = 'prospect'
WHERE provider_crm_status IS NULL;

ALTER TABLE public.surgical_sales_contacts
  DROP CONSTRAINT IF EXISTS surgical_sales_contacts_provider_crm_status_check;

ALTER TABLE public.surgical_sales_contacts
  ADD CONSTRAINT surgical_sales_contacts_provider_crm_status_check
  CHECK (provider_crm_status IS NULL OR provider_crm_status IN ('active', 'inactive', 'prospect'));

COMMENT ON COLUMN public.surgical_sales_contacts.provider_crm_status IS
  'Sales lifecycle: prospect, active, or inactive. Distinct from provider_onboarding_status (draft wizard vs finished onboarding).';
