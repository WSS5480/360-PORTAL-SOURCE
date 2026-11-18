-- Remap seeded playbook engagement types to MVP strategic/lightweight set (data only; types remain valid in CRM check).

UPDATE public.sales_pre_call_plan_templates
SET template_engagement_type = 'product_demo'
WHERE template_engagement_type = 'evaluation_planning';

UPDATE public.sales_pre_call_plan_templates
SET template_engagement_type = 'follow_up'
WHERE template_engagement_type = 'preference_card_discussion';

UPDATE public.sales_pre_call_plan_templates
SET name = 'ACSIS — Follow-up (preference card)'
WHERE is_system = true
  AND name = 'ACSIS — Preference card conversion';
