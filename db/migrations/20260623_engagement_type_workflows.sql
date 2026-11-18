-- Engagement-type-driven workflows: expanded types, lightweight fields, 360 office visit extras.

ALTER TABLE public.surgical_sales_engagements
  DROP CONSTRAINT IF EXISTS surgical_sales_engagements_type_check;

UPDATE public.surgical_sales_engagements
SET engagement_type = CASE engagement_type
  WHEN 'follow_up_meeting' THEN 'follow_up'
  WHEN 'evaluation_discussion' THEN 'evaluation_planning'
  WHEN 'or_access_discussion' THEN 'or_visit'
  ELSE engagement_type
END;

ALTER TABLE public.surgical_sales_engagements
  ADD COLUMN IF NOT EXISTS engagement_workflow_mode text NULL,
  ADD COLUMN IF NOT EXISTS engagement_purpose text NULL,
  ADD COLUMN IF NOT EXISTS next_action text NULL,
  ADD COLUMN IF NOT EXISTS follow_up_tasks text NULL,
  ADD COLUMN IF NOT EXISTS sim_lab_focus text NULL,
  ADD COLUMN IF NOT EXISTS products_to_demonstrate text NULL,
  ADD COLUMN IF NOT EXISTS attendees text NULL,
  ADD COLUMN IF NOT EXISTS hands_on_goals text NULL,
  ADD COLUMN IF NOT EXISTS adoption_signals_to_watch text NULL;

ALTER TABLE public.surgical_sales_engagements
  ADD CONSTRAINT surgical_sales_engagements_workflow_mode_check CHECK (
    engagement_workflow_mode IS NULL
    OR engagement_workflow_mode IN ('strategic', 'lightweight')
  );

ALTER TABLE public.surgical_sales_engagements
  ADD CONSTRAINT surgical_sales_engagements_type_check CHECK (
    engagement_type IN (
      'intro_call',
      'observation_request',
      'follow_up',
      'product_demo',
      'evaluation_planning',
      'evaluation_follow_up',
      'or_visit',
      'office_visit_360',
      'in_service_training',
      'preference_card_discussion',
      'post_case_follow_up',
      'reactivation'
    )
  );

COMMENT ON COLUMN public.surgical_sales_engagements.engagement_type IS
  'CRM engagement type (intro_call, follow_up, office_visit_360, reactivation, etc.).';

COMMENT ON COLUMN public.surgical_sales_engagements.engagement_workflow_mode IS
  'For reactivation: strategic (full Pre-Call Plan) or lightweight (compact planning).';

-- Align template engagement types with expanded CRM list.
ALTER TABLE public.sales_pre_call_plan_templates
  DROP CONSTRAINT IF EXISTS sales_pre_call_plan_templates_engagement_type_check;

UPDATE public.sales_pre_call_plan_templates
SET template_engagement_type = CASE template_engagement_type
  WHEN 'follow_up_meeting' THEN 'follow_up'
  WHEN 'evaluation_discussion' THEN 'evaluation_planning'
  WHEN 'or_access_discussion' THEN 'or_visit'
  WHEN 'evaluation_planning' THEN 'evaluation_planning'
  ELSE template_engagement_type
END;

ALTER TABLE public.sales_pre_call_plan_templates
  ADD CONSTRAINT sales_pre_call_plan_templates_engagement_type_check CHECK (
    template_engagement_type IN (
      'intro_call',
      'observation_request',
      'follow_up',
      'product_demo',
      'evaluation_planning',
      'evaluation_follow_up',
      'or_visit',
      'office_visit_360',
      'in_service_training',
      'preference_card_discussion',
      'post_case_follow_up',
      'reactivation'
    )
  );
