-- Pre-Call Plan migration safety (idempotent, no deletes).
-- Authoritative plan: surgical_sales_engagements.
-- Legacy copies preserved on surgical_sales_cases and surgical_sales_contacts (provider_pre_observation_*).

-- Terminology / ownership comments (columns unchanged)
COMMENT ON COLUMN public.surgical_sales_cases.pre_observation_impact_opening_statement IS
  'Legacy mirror: Pre-Call Plan field. Authoritative when engagement linked; preserved for audit.';
COMMENT ON COLUMN public.surgical_sales_cases.pre_observation_probes IS
  'Legacy mirror: Pre-Call Plan field. Authoritative when engagement linked; preserved for audit.';
COMMENT ON COLUMN public.surgical_sales_cases.pre_observation_tools_resources IS
  'Legacy mirror: Pre-Call Plan field. Authoritative when engagement linked; preserved for audit.';
COMMENT ON COLUMN public.surgical_sales_cases.pre_observation_value_hypothesis IS
  'Legacy mirror: Pre-Call Plan field. Authoritative when engagement linked; preserved for audit.';
COMMENT ON COLUMN public.surgical_sales_cases.pre_observation_planned_close IS
  'Legacy mirror: Pre-Call Plan field. Authoritative when engagement linked; preserved for audit.';
COMMENT ON COLUMN public.surgical_sales_cases.pre_observation_additional_notes IS
  'Legacy mirror: Pre-Call Plan field. Authoritative when engagement linked; preserved for audit.';

COMMENT ON COLUMN public.surgical_sales_contacts.provider_pre_observation_impact_opening_statement IS
  'Legacy provider-level Pre-Call Plan copy. Migrated to engagements when possible; never deleted.';
COMMENT ON COLUMN public.surgical_sales_contacts.provider_pre_observation_probes IS
  'Legacy provider-level Pre-Call Plan copy. Migrated to engagements when possible; never deleted.';
COMMENT ON COLUMN public.surgical_sales_contacts.provider_pre_observation_tools_resources IS
  'Legacy provider-level Pre-Call Plan copy. Migrated to engagements when possible; never deleted.';
COMMENT ON COLUMN public.surgical_sales_contacts.provider_pre_observation_value_hypothesis IS
  'Legacy provider-level Pre-Call Plan copy. Migrated to engagements when possible; never deleted.';
COMMENT ON COLUMN public.surgical_sales_contacts.provider_pre_observation_planned_close IS
  'Legacy provider-level Pre-Call Plan copy. Migrated to engagements when possible; never deleted.';
COMMENT ON COLUMN public.surgical_sales_contacts.provider_pre_observation_additional_notes IS
  'Legacy provider-level Pre-Call Plan copy. Migrated to engagements when possible; never deleted.';

COMMENT ON COLUMN public.surgical_sales_contacts.provider_planning_updated_at IS
  'Last save of provider intelligence / legacy planning fields (not Pre-Call Plan on profile).';

-- 1) Case-linked engagements: backfill empty engagement pre-call from case (do not overwrite engagement values)
UPDATE public.surgical_sales_engagements e
SET
  pre_call_hospital_name = COALESCE(NULLIF(trim(e.pre_call_hospital_name), ''), NULLIF(trim(c.pre_call_hospital_name), '')),
  pre_call_surgeon_name = COALESCE(NULLIF(trim(e.pre_call_surgeon_name), ''), NULLIF(trim(c.pre_call_surgeon_name), '')),
  observation_goal = COALESCE(NULLIF(trim(e.observation_goal), ''), NULLIF(trim(c.observation_goal), '')),
  pre_observation_impact_opening_statement = COALESCE(
    NULLIF(trim(e.pre_observation_impact_opening_statement), ''),
    NULLIF(trim(c.pre_observation_impact_opening_statement), '')
  ),
  pre_observation_probes = COALESCE(NULLIF(trim(e.pre_observation_probes), ''), NULLIF(trim(c.pre_observation_probes), '')),
  pre_observation_tools_resources = COALESCE(
    NULLIF(trim(e.pre_observation_tools_resources), ''),
    NULLIF(trim(c.pre_observation_tools_resources), '')
  ),
  pre_observation_value_hypothesis = COALESCE(
    NULLIF(trim(e.pre_observation_value_hypothesis), ''),
    NULLIF(trim(c.pre_observation_value_hypothesis), '')
  ),
  pre_observation_planned_close = COALESCE(
    NULLIF(trim(e.pre_observation_planned_close), ''),
    NULLIF(trim(c.pre_observation_planned_close), '')
  ),
  pre_observation_additional_notes = COALESCE(
    NULLIF(trim(e.pre_observation_additional_notes), ''),
    NULLIF(trim(c.pre_observation_additional_notes), '')
  ),
  pre_call_plan_updated_at = COALESCE(e.pre_call_plan_updated_at, c.updated_at, e.updated_at),
  updated_at = GREATEST(e.updated_at, c.updated_at)
FROM public.surgical_sales_cases c
WHERE c.id = e.case_id
  AND (
    NULLIF(trim(c.observation_goal), '') IS NOT NULL
    OR NULLIF(trim(c.pre_observation_impact_opening_statement), '') IS NOT NULL
    OR NULLIF(trim(c.pre_observation_probes), '') IS NOT NULL
    OR NULLIF(trim(c.pre_observation_tools_resources), '') IS NOT NULL
    OR NULLIF(trim(c.pre_observation_value_hypothesis), '') IS NOT NULL
    OR NULLIF(trim(c.pre_observation_planned_close), '') IS NOT NULL
    OR NULLIF(trim(c.pre_observation_additional_notes), '') IS NOT NULL
    OR NULLIF(trim(c.pre_call_hospital_name), '') IS NOT NULL
    OR NULLIF(trim(c.pre_call_surgeon_name), '') IS NOT NULL
  );

-- 2) Cases with pre-call data but no engagement row (idempotent with 20260614)
INSERT INTO public.surgical_sales_engagements (
  engagement_type,
  status,
  title,
  provider_id,
  organization_id,
  opportunity_id,
  case_id,
  sales_rep_id,
  scheduled_at,
  engagement_date,
  pre_call_hospital_name,
  pre_call_surgeon_name,
  observation_goal,
  pre_observation_impact_opening_statement,
  pre_observation_probes,
  pre_observation_tools_resources,
  pre_observation_value_hypothesis,
  pre_observation_planned_close,
  pre_observation_additional_notes,
  notes,
  pre_call_plan_updated_at,
  created_at,
  updated_at
)
SELECT
  CASE
    WHEN lower(coalesce(c.case_type, '')) = 'observation' THEN 'observation_request'
    ELSE 'follow_up_meeting'
  END,
  CASE
    WHEN lower(c.status) IN ('completed', 'closed', 'cancelled') THEN 'completed'
    WHEN lower(c.status) IN ('confirmed', 'scheduled') THEN 'in_progress'
    ELSE 'planned'
  END,
  COALESCE(NULLIF(trim(c.procedure_type), ''), 'Pre-Call Plan (from case)'),
  c.surgeon_contact_id,
  c.account_id,
  c.related_opportunity_id,
  c.id,
  c.sales_rep_id,
  CASE WHEN c.case_date IS NOT NULL THEN (c.case_date::timestamp AT TIME ZONE 'UTC') ELSE NULL END,
  c.case_date,
  c.pre_call_hospital_name,
  c.pre_call_surgeon_name,
  c.observation_goal,
  c.pre_observation_impact_opening_statement,
  c.pre_observation_probes,
  c.pre_observation_tools_resources,
  c.pre_observation_value_hypothesis,
  c.pre_observation_planned_close,
  c.pre_observation_additional_notes,
  '[legacy_case_pre_call_migrated]',
  c.updated_at,
  c.created_at,
  c.updated_at
FROM public.surgical_sales_cases c
WHERE c.surgeon_contact_id IS NOT NULL
  AND c.engagement_id IS NULL
  AND (
    lower(coalesce(c.case_type, '')) = 'observation'
    OR nullif(trim(c.observation_goal), '') IS NOT NULL
    OR nullif(trim(c.pre_observation_impact_opening_statement), '') IS NOT NULL
    OR nullif(trim(c.pre_observation_probes), '') IS NOT NULL
    OR nullif(trim(c.pre_observation_tools_resources), '') IS NOT NULL
    OR nullif(trim(c.pre_observation_value_hypothesis), '') IS NOT NULL
    OR nullif(trim(c.pre_observation_planned_close), '') IS NOT NULL
    OR nullif(trim(c.pre_observation_additional_notes), '') IS NOT NULL
    OR nullif(trim(c.pre_call_hospital_name), '') IS NOT NULL
    OR nullif(trim(c.pre_call_surgeon_name), '') IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.surgical_sales_engagements e WHERE e.case_id = c.id
  );

-- 3) Bidirectional case ↔ engagement link
UPDATE public.surgical_sales_cases c
SET engagement_id = e.id
FROM public.surgical_sales_engagements e
WHERE e.case_id = c.id
  AND c.engagement_id IS NULL;

UPDATE public.surgical_sales_engagements e
SET case_id = c.id
FROM public.surgical_sales_cases c
WHERE c.engagement_id = e.id
  AND e.case_id IS NULL;

-- 4) Provider-only legacy planning → draft engagement (no case)
WITH provider_rep AS (
  SELECT DISTINCT ON (c.surgeon_contact_id)
    c.surgeon_contact_id AS provider_id,
    c.sales_rep_id,
    c.account_id AS organization_id
  FROM public.surgical_sales_cases c
  WHERE c.surgeon_contact_id IS NOT NULL
  ORDER BY c.surgeon_contact_id, c.updated_at DESC NULLS LAST
),
legacy_providers AS (
  SELECT
    sc.id AS provider_id,
    sc.account_id,
    pr.sales_rep_id,
    COALESCE(pr.organization_id, sc.account_id) AS organization_id,
    sc.provider_pre_observation_impact_opening_statement,
    sc.provider_pre_observation_probes,
    sc.provider_pre_observation_tools_resources,
    sc.provider_pre_observation_value_hypothesis,
    sc.provider_pre_observation_planned_close,
    sc.provider_pre_observation_additional_notes,
    sc.provider_planning_updated_at,
    sc.updated_at
  FROM public.surgical_sales_contacts sc
  LEFT JOIN provider_rep pr ON pr.provider_id = sc.id
  WHERE (
    nullif(trim(sc.provider_pre_observation_impact_opening_statement), '') IS NOT NULL
    OR nullif(trim(sc.provider_pre_observation_probes), '') IS NOT NULL
    OR nullif(trim(sc.provider_pre_observation_tools_resources), '') IS NOT NULL
    OR nullif(trim(sc.provider_pre_observation_value_hypothesis), '') IS NOT NULL
    OR nullif(trim(sc.provider_pre_observation_planned_close), '') IS NOT NULL
    OR nullif(trim(sc.provider_pre_observation_additional_notes), '') IS NOT NULL
  )
  AND pr.sales_rep_id IS NOT NULL
)
INSERT INTO public.surgical_sales_engagements (
  engagement_type,
  status,
  title,
  provider_id,
  organization_id,
  sales_rep_id,
  pre_observation_impact_opening_statement,
  pre_observation_probes,
  pre_observation_tools_resources,
  pre_observation_value_hypothesis,
  pre_observation_planned_close,
  pre_observation_additional_notes,
  notes,
  pre_call_plan_updated_at,
  created_at,
  updated_at
)
SELECT
  'follow_up_meeting',
  'planned',
  'Pre-Call Plan (migrated from profile)',
  lp.provider_id,
  lp.organization_id,
  lp.sales_rep_id,
  nullif(trim(lp.provider_pre_observation_impact_opening_statement), ''),
  nullif(trim(lp.provider_pre_observation_probes), ''),
  nullif(trim(lp.provider_pre_observation_tools_resources), ''),
  nullif(trim(lp.provider_pre_observation_value_hypothesis), ''),
  nullif(trim(lp.provider_pre_observation_planned_close), ''),
  nullif(trim(lp.provider_pre_observation_additional_notes), ''),
  '[legacy_provider_planning_migrated]',
  COALESCE(lp.provider_planning_updated_at, lp.updated_at, now()),
  COALESCE(lp.provider_planning_updated_at, lp.updated_at, now()),
  COALESCE(lp.provider_planning_updated_at, lp.updated_at, now())
FROM legacy_providers lp
WHERE NOT EXISTS (
  SELECT 1
  FROM public.surgical_sales_engagements e
  WHERE e.provider_id = lp.provider_id
    AND e.archived_at IS NULL
    AND (
      e.notes LIKE '%legacy_provider_planning_migrated%'
      OR nullif(trim(e.pre_observation_impact_opening_statement), '') IS NOT NULL
      OR nullif(trim(e.pre_observation_probes), '') IS NOT NULL
      OR nullif(trim(e.pre_observation_tools_resources), '') IS NOT NULL
      OR nullif(trim(e.pre_observation_value_hypothesis), '') IS NOT NULL
      OR nullif(trim(e.pre_observation_planned_close), '') IS NOT NULL
      OR nullif(trim(e.pre_observation_additional_notes), '') IS NOT NULL
    )
);
