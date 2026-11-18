-- Replace generic system Pre-Call Plan templates with curated product playbooks.
-- Application sync (ensurePreCallPlanSystemTemplates) also upserts by name on each templates API load.

DELETE FROM public.sales_pre_call_plan_template_favorites f
WHERE f.template_id IN (
  SELECT id FROM public.sales_pre_call_plan_templates t
  WHERE t.is_system = true
    AND t.name NOT IN (
      'ACSIS — Hernia discovery',
      'ACSIS — Observation request',
      'ACSIS — Evaluation planning',
      'ACSIS — Preference card conversion',
      'BioTissue — Chronic wound discovery',
      'BioTissue — Biologic evaluation',
      'BioTissue — Follow-up expansion',
      'Skeletal Dynamics — Extremity fixation evaluation',
      'Skeletal Dynamics — Surgeon conversion discussion',
      'Skeletal Dynamics — Active evaluation support',
      'TelaBio — Soft tissue reconstruction discussion',
      'TelaBio — Competitive conversion',
      'TelaBio — Observation request',
      'Endolumik — Minimally invasive workflow discussion',
      'Endolumik — Product demo',
      'Endolumik — Clinical validation'
    )
);

DELETE FROM public.sales_pre_call_plan_templates
WHERE is_system = true
  AND name NOT IN (
    'ACSIS — Hernia discovery',
    'ACSIS — Observation request',
    'ACSIS — Evaluation planning',
    'ACSIS — Preference card conversion',
    'BioTissue — Chronic wound discovery',
    'BioTissue — Biologic evaluation',
    'BioTissue — Follow-up expansion',
    'Skeletal Dynamics — Extremity fixation evaluation',
    'Skeletal Dynamics — Surgeon conversion discussion',
    'Skeletal Dynamics — Active evaluation support',
    'TelaBio — Soft tissue reconstruction discussion',
    'TelaBio — Competitive conversion',
    'TelaBio — Observation request',
    'Endolumik — Minimally invasive workflow discussion',
    'Endolumik — Product demo',
    'Endolumik — Clinical validation'
  );

COMMENT ON TABLE public.sales_pre_call_plan_templates IS
  'Reusable Pre-Call Plan playbooks by product line and engagement type. Curated system seeds sync from application on templates API load.';
