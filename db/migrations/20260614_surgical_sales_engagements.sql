-- Engagements: interaction-scoped CRM object that owns the Pre-Call Plan (before a case may exist).

CREATE TABLE IF NOT EXISTS public.surgical_sales_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_type text NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  title text NULL,
  provider_id uuid NOT NULL REFERENCES public.surgical_sales_contacts (id) ON DELETE RESTRICT,
  organization_id uuid NULL REFERENCES public.accounts (id) ON DELETE SET NULL,
  opportunity_id uuid NULL REFERENCES public.sales_opportunities (id) ON DELETE SET NULL,
  case_id uuid NULL UNIQUE REFERENCES public.surgical_sales_cases (id) ON DELETE SET NULL,
  sales_rep_id uuid NOT NULL,
  scheduled_at timestamptz NULL,
  engagement_date date NULL,
  notes text NULL,
  -- Pre-Call Plan (authoritative on engagement; legacy case columns remain during transition)
  pre_call_hospital_name text NULL,
  pre_call_surgeon_name text NULL,
  observation_goal text NULL,
  pre_observation_impact_opening_statement text NULL,
  pre_observation_probes text NULL,
  pre_observation_tools_resources text NULL,
  pre_observation_value_hypothesis text NULL,
  pre_observation_planned_close text NULL,
  pre_observation_additional_notes text NULL,
  pre_call_plan_updated_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NULL,
  archived_by_user_id uuid NULL,
  CONSTRAINT surgical_sales_engagements_type_check CHECK (
    engagement_type IN (
      'intro_call',
      'observation_request',
      'follow_up_meeting',
      'product_demo',
      'evaluation_discussion',
      'or_access_discussion'
    )
  ),
  CONSTRAINT surgical_sales_engagements_status_check CHECK (
    status IN ('planned', 'in_progress', 'completed', 'cancelled')
  )
);

COMMENT ON TABLE public.surgical_sales_engagements IS
  'Sales engagement (call, meeting, observation request). Owns Pre-Call Plan; case is optional and linked later.';

COMMENT ON COLUMN public.surgical_sales_engagements.engagement_type IS
  'intro_call | observation_request | follow_up_meeting | product_demo | evaluation_discussion | or_access_discussion';

COMMENT ON COLUMN public.surgical_sales_engagements.provider_id IS 'Required provider (surgeon) for this engagement.';
COMMENT ON COLUMN public.surgical_sales_engagements.organization_id IS 'Organization when known; required in app when scheduling with a facility.';
COMMENT ON COLUMN public.surgical_sales_engagements.opportunity_id IS 'Optional linked opportunity.';
COMMENT ON COLUMN public.surgical_sales_engagements.case_id IS 'Optional surgical case created from this engagement (1:1 when set).';

CREATE INDEX IF NOT EXISTS idx_surgical_sales_engagements_provider_id
  ON public.surgical_sales_engagements (provider_id);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_engagements_organization_id
  ON public.surgical_sales_engagements (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_surgical_sales_engagements_opportunity_id
  ON public.surgical_sales_engagements (opportunity_id)
  WHERE opportunity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_surgical_sales_engagements_sales_rep_id
  ON public.surgical_sales_engagements (sales_rep_id);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_engagements_status
  ON public.surgical_sales_engagements (status);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_engagements_scheduled_at
  ON public.surgical_sales_engagements (scheduled_at DESC NULLS LAST);

-- Reverse link from case → engagement (primary navigation from case detail during transition)
ALTER TABLE public.surgical_sales_cases
  ADD COLUMN IF NOT EXISTS engagement_id uuid NULL REFERENCES public.surgical_sales_engagements (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_surgical_sales_cases_engagement_id
  ON public.surgical_sales_cases (engagement_id)
  WHERE engagement_id IS NOT NULL;

COMMENT ON COLUMN public.surgical_sales_cases.engagement_id IS
  'Linked engagement that owns Pre-Call Plan for this case.';

-- Engagement activity timeline (parallel to case activities)
CREATE TABLE IF NOT EXISTS public.surgical_sales_engagement_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.surgical_sales_engagements (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  body text NOT NULL DEFAULT '',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_engagement_activities_engagement_id
  ON public.surgical_sales_engagement_activities (engagement_id, created_at DESC);

-- Backfill: one engagement per observation case (or case with any pre-call data)
INSERT INTO public.surgical_sales_engagements (
  engagement_type,
  status,
  provider_id,
  organization_id,
  opportunity_id,
  case_id,
  sales_rep_id,
  scheduled_at,
  engagement_date,
  pre_call_hospital_name,
  pre_call_surgeon_name,
  observation_goal,
  pre_observation_impact_opening_statement,
  pre_observation_probes,
  pre_observation_tools_resources,
  pre_observation_value_hypothesis,
  pre_observation_planned_close,
  pre_observation_additional_notes,
  pre_call_plan_updated_at,
  created_at,
  updated_at
)
SELECT
  CASE
    WHEN lower(coalesce(c.case_type, '')) = 'observation' THEN 'observation_request'
    ELSE 'follow_up_meeting'
  END,
  CASE
    WHEN lower(c.status) IN ('completed', 'closed', 'cancelled') THEN 'completed'
    WHEN lower(c.status) IN ('confirmed', 'scheduled') THEN 'in_progress'
    ELSE 'planned'
  END,
  c.surgeon_contact_id,
  c.account_id,
  c.related_opportunity_id,
  c.id,
  c.sales_rep_id,
  CASE
    WHEN c.case_date IS NOT NULL THEN (c.case_date::timestamp AT TIME ZONE 'UTC')
    ELSE NULL
  END,
  c.case_date,
  c.pre_call_hospital_name,
  c.pre_call_surgeon_name,
  c.observation_goal,
  c.pre_observation_impact_opening_statement,
  c.pre_observation_probes,
  c.pre_observation_tools_resources,
  c.pre_observation_value_hypothesis,
  c.pre_observation_planned_close,
  c.pre_observation_additional_notes,
  c.updated_at,
  c.created_at,
  c.updated_at
FROM public.surgical_sales_cases c
WHERE c.surgeon_contact_id IS NOT NULL
  AND (
    lower(coalesce(c.case_type, '')) = 'observation'
    OR nullif(trim(c.observation_goal), '') IS NOT NULL
    OR nullif(trim(c.pre_observation_impact_opening_statement), '') IS NOT NULL
    OR nullif(trim(c.pre_observation_probes), '') IS NOT NULL
    OR nullif(trim(c.pre_observation_tools_resources), '') IS NOT NULL
    OR nullif(trim(c.pre_observation_value_hypothesis), '') IS NOT NULL
    OR nullif(trim(c.pre_observation_planned_close), '') IS NOT NULL
    OR nullif(trim(c.pre_observation_additional_notes), '') IS NOT NULL
    OR nullif(trim(c.pre_call_hospital_name), '') IS NOT NULL
    OR nullif(trim(c.pre_call_surgeon_name), '') IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.surgical_sales_engagements e WHERE e.case_id = c.id
  );

UPDATE public.surgical_sales_cases c
SET engagement_id = e.id
FROM public.surgical_sales_engagements e
WHERE e.case_id = c.id
  AND c.engagement_id IS NULL;

-- RLS (mirror case rep ownership)
ALTER TABLE public.surgical_sales_engagements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surgical_sales_engagements TO authenticated;
GRANT ALL ON public.surgical_sales_engagements TO service_role;

DROP POLICY IF EXISTS surgical_sales_engagements_select ON public.surgical_sales_engagements;
CREATE POLICY surgical_sales_engagements_select ON public.surgical_sales_engagements
  FOR SELECT TO authenticated
  USING (
    sales_rep_id = (SELECT auth.uid())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

DROP POLICY IF EXISTS surgical_sales_engagements_insert ON public.surgical_sales_engagements;
CREATE POLICY surgical_sales_engagements_insert ON public.surgical_sales_engagements
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      sales_rep_id = (SELECT auth.uid())
      AND (SELECT public.surgical_sales_is_internal_sales_rep())
    )
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

DROP POLICY IF EXISTS surgical_sales_engagements_update ON public.surgical_sales_engagements;
CREATE POLICY surgical_sales_engagements_update ON public.surgical_sales_engagements
  FOR UPDATE TO authenticated
  USING (
    sales_rep_id = (SELECT auth.uid())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  )
  WITH CHECK (
    (
      sales_rep_id = (SELECT auth.uid())
      AND (SELECT public.surgical_sales_is_internal_sales_rep())
    )
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

ALTER TABLE public.surgical_sales_engagement_activities ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.surgical_sales_engagement_activities TO authenticated;
GRANT ALL ON public.surgical_sales_engagement_activities TO service_role;

DROP POLICY IF EXISTS surgical_sales_engagement_activities_select ON public.surgical_sales_engagement_activities;
CREATE POLICY surgical_sales_engagement_activities_select ON public.surgical_sales_engagement_activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_engagements e
      WHERE e.id = engagement_id
        AND (
          e.sales_rep_id = (SELECT auth.uid())
          OR (SELECT public.surgical_sales_is_internal_portal_admin())
          OR (SELECT private.is_admin_or_staff())
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_engagement_activities_insert ON public.surgical_sales_engagement_activities;
CREATE POLICY surgical_sales_engagement_activities_insert ON public.surgical_sales_engagement_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surgical_sales_engagements e
      WHERE e.id = engagement_id
        AND e.sales_rep_id = (SELECT auth.uid())
    )
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );
