-- Pre-Call Plan templates for engagement planning playbooks.

CREATE TABLE IF NOT EXISTS public.sales_pre_call_plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NULL,
  product_line text NOT NULL,
  template_engagement_type text NOT NULL,
  observation_goal text NULL,
  pre_observation_impact_opening_statement text NULL,
  pre_observation_probes text NULL,
  pre_observation_tools_resources text NULL,
  pre_observation_value_hypothesis text NULL,
  pre_observation_planned_close text NULL,
  suggested_next_step text NULL,
  pre_observation_additional_notes text NULL,
  is_system boolean NOT NULL DEFAULT false,
  owner_user_id uuid NULL,
  duplicated_from_id uuid NULL REFERENCES public.sales_pre_call_plan_templates (id) ON DELETE SET NULL,
  created_by_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_pre_call_plan_templates_product_line_check CHECK (
    product_line IN ('ACSIS', 'BioTissue', 'TelaBio', 'Skeletal Dynamics', 'Endolumik')
  ),
  CONSTRAINT sales_pre_call_plan_templates_engagement_type_check CHECK (
    template_engagement_type IN (
      'intro_discovery',
      'observation_request',
      'evaluation_planning',
      'active_evaluation',
      'preference_card_conversion',
      'follow_up_expansion'
    )
  ),
  CONSTRAINT sales_pre_call_plan_templates_owner_check CHECK (
    (is_system = true AND owner_user_id IS NULL)
    OR (is_system = false AND owner_user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_sales_pre_call_plan_templates_product_type
  ON public.sales_pre_call_plan_templates (product_line, template_engagement_type);

CREATE INDEX IF NOT EXISTS idx_sales_pre_call_plan_templates_owner
  ON public.sales_pre_call_plan_templates (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

COMMENT ON TABLE public.sales_pre_call_plan_templates IS
  'Reusable Pre-Call Plan playbooks by product line and engagement type. System templates are read-only; reps can save custom copies.';

CREATE TABLE IF NOT EXISTS public.sales_pre_call_plan_template_favorites (
  user_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.sales_pre_call_plan_templates (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_pre_call_plan_template_favorites_template
  ON public.sales_pre_call_plan_template_favorites (template_id);

ALTER TABLE public.sales_pre_call_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_pre_call_plan_template_favorites ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_pre_call_plan_templates TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.sales_pre_call_plan_template_favorites TO authenticated;
GRANT ALL ON public.sales_pre_call_plan_templates TO service_role;
GRANT ALL ON public.sales_pre_call_plan_template_favorites TO service_role;

DROP POLICY IF EXISTS sales_pre_call_plan_templates_select ON public.sales_pre_call_plan_templates;
CREATE POLICY sales_pre_call_plan_templates_select ON public.sales_pre_call_plan_templates
  FOR SELECT TO authenticated
  USING (
    is_system = true
    OR owner_user_id = (SELECT auth.uid())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

DROP POLICY IF EXISTS sales_pre_call_plan_templates_insert ON public.sales_pre_call_plan_templates;
CREATE POLICY sales_pre_call_plan_templates_insert ON public.sales_pre_call_plan_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    is_system = false
    AND owner_user_id = (SELECT auth.uid())
    AND (SELECT public.surgical_sales_is_internal_sales_rep())
  );

DROP POLICY IF EXISTS sales_pre_call_plan_templates_update ON public.sales_pre_call_plan_templates;
CREATE POLICY sales_pre_call_plan_templates_update ON public.sales_pre_call_plan_templates
  FOR UPDATE TO authenticated
  USING (
    is_system = false
    AND owner_user_id = (SELECT auth.uid())
    AND (SELECT public.surgical_sales_is_internal_sales_rep())
  )
  WITH CHECK (
    is_system = false
    AND owner_user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS sales_pre_call_plan_templates_delete ON public.sales_pre_call_plan_templates;
CREATE POLICY sales_pre_call_plan_templates_delete ON public.sales_pre_call_plan_templates
  FOR DELETE TO authenticated
  USING (
    is_system = false
    AND owner_user_id = (SELECT auth.uid())
    AND (SELECT public.surgical_sales_is_internal_sales_rep())
  );

DROP POLICY IF EXISTS sales_pre_call_plan_template_favorites_select ON public.sales_pre_call_plan_template_favorites;
CREATE POLICY sales_pre_call_plan_template_favorites_select ON public.sales_pre_call_plan_template_favorites
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS sales_pre_call_plan_template_favorites_insert ON public.sales_pre_call_plan_template_favorites;
CREATE POLICY sales_pre_call_plan_template_favorites_insert ON public.sales_pre_call_plan_template_favorites
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS sales_pre_call_plan_template_favorites_delete ON public.sales_pre_call_plan_template_favorites;
CREATE POLICY sales_pre_call_plan_template_favorites_delete ON public.sales_pre_call_plan_template_favorites
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
