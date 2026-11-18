-- Provider Debrief engagement type — post-observation surgeon conversation planning.

ALTER TABLE public.surgical_sales_engagements
  DROP CONSTRAINT IF EXISTS surgical_sales_engagements_type_check;

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
      'provider_debrief',
      'reactivation'
    )
  );

COMMENT ON COLUMN public.surgical_sales_engagements.engagement_type IS
  'CRM engagement type (intro_call, provider_debrief, observation_request, etc.).';

ALTER TABLE public.sales_pre_call_plan_templates
  DROP CONSTRAINT IF EXISTS sales_pre_call_plan_templates_engagement_type_check;

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
      'provider_debrief',
      'reactivation'
    )
  );
