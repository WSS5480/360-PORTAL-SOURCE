-- Record provider pathway stage before/after engagement completion for playbook effectiveness reporting.

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS completion_pathway_stage_before text NULL,
  ADD COLUMN IF NOT EXISTS completion_pathway_stage_after text NULL;

COMMENT ON COLUMN public.surgical_sales_engagements.completion_pathway_stage_before IS
  'Derived sales pathway stage before debrief/intro completion intelligence was applied.';
COMMENT ON COLUMN public.surgical_sales_engagements.completion_pathway_stage_after IS
  'Derived sales pathway stage after debrief/intro completion intelligence was applied.';

CREATE INDEX IF NOT EXISTS idx_surgical_sales_engagements_playbook_pathway_outcome
  ON public.surgical_sales_engagements (pre_call_plan_template_id)
  WHERE pre_call_plan_template_id IS NOT NULL
    AND completion_pathway_stage_before IS NOT NULL
    AND completion_pathway_stage_after IS NOT NULL;
