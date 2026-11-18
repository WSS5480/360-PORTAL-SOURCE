-- Simplify provider relationship stages: account maturity only (not engagement workflow).

ALTER TABLE public.surgical_sales_contacts
  DROP CONSTRAINT IF EXISTS surgical_sales_contacts_provider_relationship_stage_check;

UPDATE public.surgical_sales_contacts
SET provider_relationship_stage = 'early_discovery'
WHERE provider_relationship_stage IN ('prospect', 'pre_call_planning');

UPDATE public.surgical_sales_contacts
SET provider_relationship_stage = 'active_evaluation'
WHERE provider_relationship_stage IN (
  'engagement_active',
  'observation_requested',
  'observation_scheduled'
);

UPDATE public.surgical_sales_contacts
SET provider_relationship_stage = 'early_discovery'
WHERE provider_relationship_stage IS NULL;

ALTER TABLE public.surgical_sales_contacts
  ALTER COLUMN provider_relationship_stage SET DEFAULT 'early_discovery';

ALTER TABLE public.surgical_sales_contacts
  ADD CONSTRAINT surgical_sales_contacts_provider_relationship_stage_check
  CHECK (
    provider_relationship_stage IS NULL
    OR provider_relationship_stage IN (
      'early_discovery',
      'active_evaluation',
      'active_relationship',
      'established_customer',
      'dormant',
      'archived'
    )
  );

COMMENT ON COLUMN public.surgical_sales_contacts.provider_relationship_stage IS
  'Provider account maturity: early_discovery, active_evaluation, active_relationship, established_customer, dormant, archived. Engagement prep and workflow live on surgical_sales_engagements — not here.';
