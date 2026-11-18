-- Expand provider commercial status for V1 opportunity pipeline filtering.
-- Values: prospect, active (Customer), inactive, not_targeted, unknown

ALTER TABLE public.surgical_sales_contacts
  DROP CONSTRAINT IF EXISTS surgical_sales_contacts_provider_crm_status_check;

ALTER TABLE public.surgical_sales_contacts
  ADD CONSTRAINT surgical_sales_contacts_provider_crm_status_check
  CHECK (
    provider_crm_status IS NULL
    OR provider_crm_status IN ('prospect', 'active', 'inactive', 'not_targeted', 'unknown')
  );

COMMENT ON COLUMN public.surgical_sales_contacts.provider_crm_status IS
  'Commercial status: prospect, active (customer), inactive, not_targeted, unknown. Distinct from provider_onboarding_status.';
