-- Align template_engagement_type with surgical_sales_engagements.engagement_type (CRM dropdown).
-- Drop the old check first: legacy constraint only allows playbook slugs (intro_discovery, etc.).

ALTER TABLE public.sales_pre_call_plan_templates
  DROP CONSTRAINT IF EXISTS sales_pre_call_plan_templates_engagement_type_check;

UPDATE public.sales_pre_call_plan_templates
SET template_engagement_type = CASE template_engagement_type
  WHEN 'intro_discovery' THEN 'intro_call'
  WHEN 'evaluation_planning' THEN 'evaluation_discussion'
  WHEN 'active_evaluation' THEN 'evaluation_discussion'
  WHEN 'preference_card_conversion' THEN 'or_access_discussion'
  WHEN 'follow_up_expansion' THEN 'follow_up_meeting'
  ELSE template_engagement_type
END;

UPDATE public.sales_pre_call_plan_templates
SET template_engagement_type = 'product_demo'
WHERE is_system = true
  AND name = 'Endolumik — Product demo';

-- Any unexpected legacy/custom value → intro_call so ADD CONSTRAINT cannot fail.
UPDATE public.sales_pre_call_plan_templates
SET template_engagement_type = 'intro_call'
WHERE template_engagement_type NOT IN (
  'intro_call',
  'observation_request',
  'follow_up_meeting',
  'product_demo',
  'evaluation_discussion',
  'or_access_discussion'
);

ALTER TABLE public.sales_pre_call_plan_templates
  ADD CONSTRAINT sales_pre_call_plan_templates_engagement_type_check CHECK (
    template_engagement_type IN (
      'intro_call',
      'observation_request',
      'follow_up_meeting',
      'product_demo',
      'evaluation_discussion',
      'or_access_discussion'
    )
  );

COMMENT ON COLUMN public.sales_pre_call_plan_templates.template_engagement_type IS
  'Matches surgical_sales_engagements.engagement_type (intro_call, observation_request, etc.).';
