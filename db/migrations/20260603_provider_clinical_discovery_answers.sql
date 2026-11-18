-- Provider-level clinical discovery answers (one row per provider + question).

CREATE TABLE IF NOT EXISTS public.provider_clinical_discovery_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.surgical_sales_contacts (id) ON DELETE CASCADE,
  question_key text NOT NULL,
  question_label text NOT NULL,
  question_text text NOT NULL,
  response text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  confidence text NULL,
  source_case_id uuid NULL REFERENCES public.surgical_sales_cases (id) ON DELETE SET NULL,
  source_notes text NULL,
  created_by uuid NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_clinical_discovery_answers_provider_question_uq
    UNIQUE (provider_id, question_key),
  CONSTRAINT provider_clinical_discovery_answers_question_key_check
    CHECK (
      question_key IN (
        'current_modality_challenge',
        'why_it_matters',
        'clinical_impact',
        'root_causes',
        'frequency',
        'urgency_drivers',
        'priority_ranking',
        'prior_attempts',
        'risk_of_inaction'
      )
    ),
  CONSTRAINT provider_clinical_discovery_answers_confidence_check
    CHECK (confidence IS NULL OR confidence IN ('low', 'medium', 'high'))
);

COMMENT ON TABLE public.provider_clinical_discovery_answers IS
  'Provider-scoped clinical discovery responses; one answer per provider and question_key.';

CREATE INDEX IF NOT EXISTS idx_provider_clinical_discovery_answers_provider_id
  ON public.provider_clinical_discovery_answers (provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_clinical_discovery_answers_source_case_id
  ON public.provider_clinical_discovery_answers (source_case_id)
  WHERE source_case_id IS NOT NULL;

-- Backfill from legacy contact columns (20260601 / 20260602).
INSERT INTO public.provider_clinical_discovery_answers (
  provider_id,
  question_key,
  question_label,
  question_text,
  response,
  tags,
  confidence,
  source_notes,
  updated_at
)
SELECT
  c.id,
  v.question_key,
  v.question_label,
  v.question_text,
  coalesce(nullif(trim(v.response_col), ''), ''),
  coalesce(
  (
    SELECT array_agg(trim(x))
    FROM unnest(string_to_array(coalesce(nullif(trim(v.tags_col), ''), ''), ',')) AS x
    WHERE trim(x) <> ''
  ),
  '{}'::text[]
  ),
  CASE lower(trim(coalesce(v.confidence_col, '')))
    WHEN 'low' THEN 'low'
    WHEN 'medium' THEN 'medium'
    WHEN 'high' THEN 'high'
    ELSE NULL
  END,
  nullif(trim(v.source_col), ''),
  coalesce(v.updated_col, c.updated_at, now())
FROM public.surgical_sales_contacts c
CROSS JOIN LATERAL (
  VALUES
    (
      'current_modality_challenge',
      'Current Modality Challenge',
      'What is a challenge for the surgeon''s current modality?',
      c.provider_clinical_discovery_modality_challenge::text,
      c.provider_clinical_discovery_modality_challenge_confidence::text,
      c.provider_clinical_discovery_modality_challenge_source::text,
      c.provider_clinical_discovery_modality_challenge_tags::text,
      c.provider_clinical_discovery_modality_challenge_updated_at
    ),
    (
      'why_it_matters',
      'Why It Matters',
      'Why is that a challenge?',
      c.provider_clinical_discovery_why_challenge::text,
      c.provider_clinical_discovery_why_challenge_confidence::text,
      c.provider_clinical_discovery_why_challenge_source::text,
      c.provider_clinical_discovery_why_challenge_tags::text,
      c.provider_clinical_discovery_why_challenge_updated_at
    ),
    (
      'clinical_impact',
      'Clinical Impact',
      'What are the implications of that issue?',
      c.provider_clinical_discovery_implications::text,
      c.provider_clinical_discovery_implications_confidence::text,
      c.provider_clinical_discovery_implications_source::text,
      c.provider_clinical_discovery_implications_tags::text,
      c.provider_clinical_discovery_implications_updated_at
    ),
    (
      'root_causes',
      'Root Causes',
      'What are the causes?',
      c.provider_clinical_discovery_causes::text,
      c.provider_clinical_discovery_causes_confidence::text,
      c.provider_clinical_discovery_causes_source::text,
      c.provider_clinical_discovery_causes_tags::text,
      c.provider_clinical_discovery_causes_updated_at
    ),
    (
      'frequency',
      'Frequency',
      'How often does it happen?',
      c.provider_clinical_discovery_frequency::text,
      c.provider_clinical_discovery_frequency_confidence::text,
      c.provider_clinical_discovery_frequency_source::text,
      c.provider_clinical_discovery_frequency_tags::text,
      c.provider_clinical_discovery_frequency_updated_at
    ),
    (
      'urgency_drivers',
      'Urgency Drivers',
      'Why is it a priority now?',
      c.provider_clinical_discovery_priority_now::text,
      c.provider_clinical_discovery_priority_now_confidence::text,
      c.provider_clinical_discovery_priority_now_source::text,
      c.provider_clinical_discovery_priority_now_tags::text,
      c.provider_clinical_discovery_priority_now_updated_at
    ),
    (
      'priority_ranking',
      'Priority Ranking',
      'How does it rank against other priorities?',
      c.provider_clinical_discovery_priority_rank::text,
      c.provider_clinical_discovery_priority_rank_confidence::text,
      c.provider_clinical_discovery_priority_rank_source::text,
      c.provider_clinical_discovery_priority_rank_tags::text,
      c.provider_clinical_discovery_priority_rank_updated_at
    ),
    (
      'prior_attempts',
      'Prior Attempts',
      'What has been done to address this issue?',
      c.provider_clinical_discovery_prior_attempts::text,
      c.provider_clinical_discovery_prior_attempts_confidence::text,
      c.provider_clinical_discovery_prior_attempts_source::text,
      c.provider_clinical_discovery_prior_attempts_tags::text,
      c.provider_clinical_discovery_prior_attempts_updated_at
    ),
    (
      'risk_of_inaction',
      'Risk of Inaction',
      'What happens if it is not addressed?',
      c.provider_clinical_discovery_if_unaddressed::text,
      c.provider_clinical_discovery_if_unaddressed_confidence::text,
      c.provider_clinical_discovery_if_unaddressed_source::text,
      c.provider_clinical_discovery_if_unaddressed_tags::text,
      c.provider_clinical_discovery_if_unaddressed_updated_at
    )
) AS v(question_key, question_label, question_text, response_col, confidence_col, source_col, tags_col, updated_col)
WHERE
  nullif(trim(v.response_col), '') IS NOT NULL
  OR nullif(trim(v.confidence_col), '') IS NOT NULL
  OR nullif(trim(v.source_col), '') IS NOT NULL
  OR nullif(trim(v.tags_col), '') IS NOT NULL
ON CONFLICT (provider_id, question_key) DO NOTHING;

ALTER TABLE public.provider_clinical_discovery_answers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_clinical_discovery_answers TO authenticated;
GRANT ALL ON public.provider_clinical_discovery_answers TO service_role;

DROP POLICY IF EXISTS provider_clinical_discovery_answers_select ON public.provider_clinical_discovery_answers;
CREATE POLICY provider_clinical_discovery_answers_select ON public.provider_clinical_discovery_answers
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR EXISTS (
      SELECT 1
      FROM public.surgical_sales_contacts c
      WHERE c.id = provider_clinical_discovery_answers.provider_id
        AND (
          c.account_id IN (
            SELECT m.account_id FROM public.account_users m
            WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL
          )
          OR (
            (SELECT public.surgical_sales_is_internal_sales_rep())
            AND EXISTS (
              SELECT 1 FROM public.surgical_sales_cases sc
              WHERE sc.account_id = c.account_id
                AND sc.sales_rep_id = (SELECT auth.uid())
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS provider_clinical_discovery_answers_insert ON public.provider_clinical_discovery_answers;
CREATE POLICY provider_clinical_discovery_answers_insert ON public.provider_clinical_discovery_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR EXISTS (
      SELECT 1
      FROM public.surgical_sales_contacts c
      WHERE c.id = provider_clinical_discovery_answers.provider_id
        AND (
          c.account_id IN (
            SELECT m.account_id FROM public.account_users m
            WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL
          )
          OR (
            (SELECT public.surgical_sales_is_internal_sales_rep())
            AND EXISTS (
              SELECT 1 FROM public.surgical_sales_cases sc
              WHERE sc.account_id = c.account_id
                AND sc.sales_rep_id = (SELECT auth.uid())
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS provider_clinical_discovery_answers_update ON public.provider_clinical_discovery_answers;
CREATE POLICY provider_clinical_discovery_answers_update ON public.provider_clinical_discovery_answers
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
    OR EXISTS (
      SELECT 1
      FROM public.surgical_sales_contacts c
      WHERE c.id = provider_clinical_discovery_answers.provider_id
        AND (
          c.account_id IN (
            SELECT m.account_id FROM public.account_users m
            WHERE m.user_id = (SELECT auth.uid()) AND m.disabled_at IS NULL
          )
          OR (
            (SELECT public.surgical_sales_is_internal_sales_rep())
            AND EXISTS (
              SELECT 1 FROM public.surgical_sales_cases sc
              WHERE sc.account_id = c.account_id
                AND sc.sales_rep_id = (SELECT auth.uid())
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS provider_clinical_discovery_answers_delete ON public.provider_clinical_discovery_answers;
CREATE POLICY provider_clinical_discovery_answers_delete ON public.provider_clinical_discovery_answers
  FOR DELETE TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );
