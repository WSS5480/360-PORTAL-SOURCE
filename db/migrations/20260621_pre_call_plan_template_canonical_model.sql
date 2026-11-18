-- Canonical Pre-Call Plan template fields + engagement template attribution for reporting.
-- Legacy pre_observation_* columns on templates remain for audit; application code uses canonical names.

ALTER TABLE public.sales_pre_call_plan_templates
  ADD COLUMN IF NOT EXISTS procedure_focus text NULL,
  ADD COLUMN IF NOT EXISTS smart_objective text NULL,
  ADD COLUMN IF NOT EXISTS opening_statement text NULL,
  ADD COLUMN IF NOT EXISTS probes text NULL,
  ADD COLUMN IF NOT EXISTS tools_resources text NULL,
  ADD COLUMN IF NOT EXISTS value_hypothesis text NULL,
  ADD COLUMN IF NOT EXISTS planned_close text NULL,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.sales_pre_call_plan_templates.procedure_focus IS
  'Procedure or clinical focus for this playbook (e.g. hernia discovery, chronic wound).';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.smart_objective IS
  'SMART objective / sales call goal prefilled on the engagement plan.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.opening_statement IS
  'Impact opening statement.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.probes IS
  'Probes / questions to gather.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.tools_resources IS
  'Tools and resources for the interaction.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.value_hypothesis IS
  'Value hypothesis for this interaction.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.planned_close IS
  'Planned close for this interaction.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.tags IS
  'Optional classification tags (product, stage, procedure).';

-- Backfill canonical columns from legacy template storage (idempotent)
UPDATE public.sales_pre_call_plan_templates
SET
  smart_objective = COALESCE(NULLIF(trim(smart_objective), ''), NULLIF(trim(observation_goal), '')),
  opening_statement = COALESCE(
    NULLIF(trim(opening_statement), ''),
    NULLIF(trim(pre_observation_impact_opening_statement), '')
  ),
  probes = COALESCE(NULLIF(trim(probes), ''), NULLIF(trim(pre_observation_probes), '')),
  tools_resources = COALESCE(
    NULLIF(trim(tools_resources), ''),
    NULLIF(trim(pre_observation_tools_resources), '')
  ),
  value_hypothesis = COALESCE(
    NULLIF(trim(value_hypothesis), ''),
    NULLIF(trim(pre_observation_value_hypothesis), '')
  ),
  planned_close = COALESCE(
    NULLIF(trim(planned_close), ''),
    NULLIF(trim(pre_observation_planned_close), '')
  ),
  procedure_focus = COALESCE(NULLIF(trim(procedure_focus), ''), NULLIF(trim(description), ''))
WHERE
  NULLIF(trim(observation_goal), '') IS NOT NULL
  OR NULLIF(trim(pre_observation_impact_opening_statement), '') IS NOT NULL
  OR NULLIF(trim(description), '') IS NOT NULL;

COMMENT ON COLUMN public.sales_pre_call_plan_templates.observation_goal IS
  'Deprecated: use smart_objective. Kept for migration audit only.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.pre_observation_impact_opening_statement IS
  'Deprecated: use opening_statement.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.pre_observation_probes IS
  'Deprecated: use probes.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.pre_observation_tools_resources IS
  'Deprecated: use tools_resources.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.pre_observation_value_hypothesis IS
  'Deprecated: use value_hypothesis.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.pre_observation_planned_close IS
  'Deprecated: use planned_close.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.pre_observation_additional_notes IS
  'Deprecated: not used on templates; suggested_next_step maps to engagement additional notes on apply.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.is_system IS
  'System playbook (isSystemTemplate). Reps may duplicate but cannot edit or overwrite.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.created_by_user_id IS
  'User who created a custom template (createdBy). Null for system seeds.';
COMMENT ON COLUMN public.sales_pre_call_plan_templates.owner_user_id IS
  'Owner of a custom template; must match auth.uid() for rep edits.';

-- Engagement: which template was last applied (reporting only; plan edits do not write back)
ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS pre_call_plan_template_id uuid NULL
  REFERENCES public.sales_pre_call_plan_templates (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_surgical_sales_engagements_pre_call_plan_template_id
  ON public.surgical_sales_engagements (pre_call_plan_template_id)
  WHERE pre_call_plan_template_id IS NOT NULL;

COMMENT ON COLUMN public.surgical_sales_engagements.pre_call_plan_template_id IS
  'Template applied to pre-fill this engagement plan (reporting). Editing the plan does not modify the template row.';

-- Admins may edit any custom (non-system) template
DROP POLICY IF EXISTS sales_pre_call_plan_templates_update_admin ON public.sales_pre_call_plan_templates;
CREATE POLICY sales_pre_call_plan_templates_update_admin ON public.sales_pre_call_plan_templates
  FOR UPDATE TO authenticated
  USING (
    is_system = false
    AND (
      (SELECT public.surgical_sales_is_internal_portal_admin())
      OR (SELECT private.is_admin_or_staff())
    )
  )
  WITH CHECK (is_system = false);

DROP POLICY IF EXISTS sales_pre_call_plan_templates_delete_admin ON public.sales_pre_call_plan_templates;
CREATE POLICY sales_pre_call_plan_templates_delete_admin ON public.sales_pre_call_plan_templates
  FOR DELETE TO authenticated
  USING (
    is_system = false
    AND (
      (SELECT public.surgical_sales_is_internal_portal_admin())
      OR (SELECT private.is_admin_or_staff())
    )
  );
