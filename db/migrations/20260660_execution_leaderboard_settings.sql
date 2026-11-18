-- Admin-configurable Sales Execution Score / leaderboard metrics.

CREATE TABLE IF NOT EXISTS public.execution_leaderboard_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled_metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  metric_points jsonb NOT NULL DEFAULT '{}'::jsonb,
  category_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.execution_leaderboard_settings IS
  'Singleton row storing admin-controlled leaderboard metric enablement and point values.';

INSERT INTO public.execution_leaderboard_settings (id, enabled_metrics, metric_points, category_weights)
VALUES (
  1,
  '[
    "intro_call_completed",
    "observation_approved",
    "observation_completed",
    "five_observations_completed",
    "debrief_completed",
    "evaluation_started",
    "commitment_secured",
    "product_support_case_completed",
    "outcome_qti_started"
  ]'::jsonb,
  '{
    "intro_call_completed": 10,
    "observation_approved": 25,
    "observation_completed": 50,
    "five_observations_completed": 75,
    "debrief_completed": 30,
    "validated_intelligence_captured": 15,
    "evaluation_started": 100,
    "commitment_secured": 100,
    "product_support_case_completed": 50,
    "outcome_qti_started": 75
  }'::jsonb,
  '{
    "provider_discovery": 1,
    "observation_request": 1,
    "observation": 1,
    "observation_debrief": 1,
    "evaluation": 1,
    "commitment": 1,
    "product_support_case": 1,
    "outcomes": 1
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.execution_leaderboard_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS execution_leaderboard_settings_select_admin ON public.execution_leaderboard_settings;
CREATE POLICY execution_leaderboard_settings_select_admin ON public.execution_leaderboard_settings
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

DROP POLICY IF EXISTS execution_leaderboard_settings_update_admin ON public.execution_leaderboard_settings;
CREATE POLICY execution_leaderboard_settings_update_admin ON public.execution_leaderboard_settings
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  )
  WITH CHECK (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );
