-- Provider-scoped activity log (clinical discovery updates, etc.)

CREATE TABLE IF NOT EXISTS public.surgical_sales_provider_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.surgical_sales_contacts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  body text NOT NULL DEFAULT '',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surgical_sales_provider_activities_type_check
    CHECK (
      activity_type IN (
        'clinical_discovery_updated'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_provider_activities_provider_id
  ON public.surgical_sales_provider_activities (provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_provider_activities_user_id
  ON public.surgical_sales_provider_activities (user_id);

COMMENT ON TABLE public.surgical_sales_provider_activities IS
  'Rep-visible provider timeline events (clinical discovery updates, etc.).';

ALTER TABLE public.surgical_sales_provider_activities ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.surgical_sales_provider_activities TO authenticated;
GRANT ALL ON public.surgical_sales_provider_activities TO service_role;

DROP POLICY IF EXISTS surgical_sales_provider_activities_select ON public.surgical_sales_provider_activities;
CREATE POLICY surgical_sales_provider_activities_select ON public.surgical_sales_provider_activities
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR EXISTS (
      SELECT 1
      FROM public.surgical_sales_contacts c
      WHERE c.id = surgical_sales_provider_activities.provider_id
        AND (
          c.account_id IN (
            SELECT m.account_id FROM public.account_users m
            WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL
          )
          OR (
            (SELECT public.surgical_sales_is_internal_sales_rep())
            AND EXISTS (
              SELECT 1 FROM public.surgical_sales_cases sc
              WHERE sc.account_id = c.account_id
                AND sc.sales_rep_id = (SELECT auth.uid())
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_provider_activities_insert ON public.surgical_sales_provider_activities;
CREATE POLICY surgical_sales_provider_activities_insert ON public.surgical_sales_provider_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR EXISTS (
      SELECT 1
      FROM public.surgical_sales_contacts c
      WHERE c.id = surgical_sales_provider_activities.provider_id
        AND (
          c.account_id IN (
            SELECT m.account_id FROM public.account_users m
            WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL
          )
          OR (
            (SELECT public.surgical_sales_is_internal_sales_rep())
            AND EXISTS (
              SELECT 1 FROM public.surgical_sales_cases sc
              WHERE sc.account_id = c.account_id
                AND sc.sales_rep_id = (SELECT auth.uid())
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS surgical_sales_provider_activities_update ON public.surgical_sales_provider_activities;
CREATE POLICY surgical_sales_provider_activities_update ON public.surgical_sales_provider_activities
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

DROP POLICY IF EXISTS surgical_sales_provider_activities_delete ON public.surgical_sales_provider_activities;
CREATE POLICY surgical_sales_provider_activities_delete ON public.surgical_sales_provider_activities
  FOR DELETE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );
