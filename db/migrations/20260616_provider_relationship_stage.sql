-- Provider relationship stage (sales motion) — separate from intelligence completeness and engagement/case workflow.

ALTER TABLE public.surgical_sales_contacts
  ADD COLUMN IF NOT EXISTS provider_relationship_stage text NULL DEFAULT 'prospect';

COMMENT ON COLUMN public.surgical_sales_contacts.provider_relationship_stage IS
  'Sales relationship stage: prospect, pre_call_planning, engagement_active, observation_requested, observation_scheduled, active_relationship, established_customer, dormant, archived. Distinct from provider_onboarding_status and planning section completeness.';

ALTER TABLE public.surgical_sales_contacts
  DROP CONSTRAINT IF EXISTS surgical_sales_contacts_provider_relationship_stage_check;

ALTER TABLE public.surgical_sales_contacts
  ADD CONSTRAINT surgical_sales_contacts_provider_relationship_stage_check
  CHECK (
    provider_relationship_stage IS NULL
    OR provider_relationship_stage IN (
      'prospect',
      'pre_call_planning',
      'engagement_active',
      'observation_requested',
      'observation_scheduled',
      'active_relationship',
      'established_customer',
      'dormant',
      'archived'
    )
  );

-- Backfill from legacy CRM status + activity (no deletes)
UPDATE public.surgical_sales_contacts sc
SET provider_relationship_stage = 'archived'
WHERE sc.archived_at IS NOT NULL
  AND (sc.provider_relationship_stage IS NULL OR sc.provider_relationship_stage = 'prospect');

UPDATE public.surgical_sales_contacts sc
SET provider_relationship_stage = 'established_customer'
WHERE sc.archived_at IS NULL
  AND sc.provider_crm_status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.sales_opportunities o
    WHERE o.stage = 'won_update_pref_card'
      AND (
        lower(trim(coalesce(o.physician_name, ''))) = lower(trim(coalesce(sc.first_name, '') || ' ' || coalesce(sc.last_name, '')))
        OR o.account_id = sc.account_id
        OR o.account_id = sc.organization_id
      )
  )
  AND (sc.provider_relationship_stage IS NULL OR sc.provider_relationship_stage IN ('prospect', 'active_relationship'));

UPDATE public.surgical_sales_contacts sc
SET provider_relationship_stage = 'active_relationship'
WHERE sc.archived_at IS NULL
  AND sc.provider_crm_status = 'active'
  AND (sc.provider_relationship_stage IS NULL OR sc.provider_relationship_stage = 'prospect')
  AND (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_cases c
      WHERE c.surgeon_contact_id = sc.id AND lower(c.status) NOT IN ('cancelled', 'draft')
    )
    OR EXISTS (
      SELECT 1 FROM public.surgical_sales_engagements e
      WHERE e.provider_id = sc.id AND e.archived_at IS NULL
    )
  );

UPDATE public.surgical_sales_contacts sc
SET provider_relationship_stage = 'dormant'
WHERE sc.archived_at IS NULL
  AND sc.provider_crm_status = 'inactive'
  AND (sc.provider_relationship_stage IS NULL OR sc.provider_relationship_stage = 'prospect');

UPDATE public.surgical_sales_contacts sc
SET provider_relationship_stage = 'prospect'
WHERE sc.provider_relationship_stage IS NULL;
