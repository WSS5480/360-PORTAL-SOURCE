-- Remap legacy MEDDPICC-style clinical discovery keys to surgical intelligence categories.
-- Must drop the old question_key check before writing canonical keys, and merge rows when
-- multiple legacy keys map to the same provider + canonical key.

ALTER TABLE public.provider_clinical_discovery_answers
  DROP CONSTRAINT IF EXISTS provider_clinical_discovery_answers_question_key_check;

-- clinical_workflow ← current_modality_challenge, root_causes, frequency, clinical_impact
WITH legacy AS (
  SELECT *
  FROM public.provider_clinical_discovery_answers
  WHERE question_key IN (
    'current_modality_challenge',
    'root_causes',
    'frequency',
    'clinical_impact'
  )
),
merged AS (
  SELECT
    l.provider_id,
    'clinical_workflow'::text AS question_key,
    'Clinical Workflow'::text AS question_label,
    'How does this provider run cases day-to-day — procedural steps, handoffs, and where things slow down?'::text AS question_text,
    coalesce(
      nullif(
        trim(
          string_agg(
            CASE
              WHEN nullif(trim(l.response), '') IS NOT NULL
                THEN '**' || l.question_label || ':** ' || trim(l.response)
            END,
            E'\n\n'
            ORDER BY l.updated_at DESC NULLS LAST
          )
        ),
        ''
      ),
      ''
    ) AS response,
    coalesce(
      (
        SELECT array_agg(DISTINCT tag ORDER BY tag)
        FROM (
          SELECT unnest(l2.tags) AS tag
          FROM legacy l2
          WHERE l2.provider_id = l.provider_id
        ) tags
        WHERE nullif(trim(tag), '') IS NOT NULL
      ),
      '{}'::text[]
    ) AS tags,
    CASE max(
      CASE lower(coalesce(l.confidence, ''))
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 1
        ELSE 0
      END
    )
      WHEN 3 THEN 'high'
      WHEN 2 THEN 'medium'
      WHEN 1 THEN 'low'
      ELSE NULL
    END AS confidence,
    (
      SELECT l2.source_case_id
      FROM legacy l2
      WHERE l2.provider_id = l.provider_id
        AND l2.source_case_id IS NOT NULL
      ORDER BY l2.updated_at DESC NULLS LAST
      LIMIT 1
    ) AS source_case_id,
    nullif(
      trim(
        string_agg(nullif(trim(l.source_notes), ''), E'\n' ORDER BY l.updated_at DESC NULLS LAST)
      ),
      ''
    ) AS source_notes,
    min(l.created_at) AS created_at,
    max(l.updated_at) AS updated_at,
    (
      SELECT l2.created_by
      FROM legacy l2
      WHERE l2.provider_id = l.provider_id
      ORDER BY l2.updated_at DESC NULLS LAST
      LIMIT 1
    ) AS created_by,
    (
      SELECT l2.updated_by
      FROM legacy l2
      WHERE l2.provider_id = l.provider_id
      ORDER BY l2.updated_at DESC NULLS LAST
      LIMIT 1
    ) AS updated_by
  FROM legacy l
  GROUP BY l.provider_id
)
INSERT INTO public.provider_clinical_discovery_answers (
  provider_id,
  question_key,
  question_label,
  question_text,
  response,
  tags,
  confidence,
  source_case_id,
  source_notes,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  provider_id,
  question_key,
  question_label,
  question_text,
  response,
  tags,
  confidence,
  source_case_id,
  source_notes,
  created_by,
  updated_by,
  created_at,
  updated_at
FROM merged
ON CONFLICT (provider_id, question_key) DO UPDATE SET
  question_label = EXCLUDED.question_label,
  question_text = EXCLUDED.question_text,
  response = CASE
    WHEN nullif(trim(provider_clinical_discovery_answers.response), '') IS NULL
      THEN EXCLUDED.response
    WHEN nullif(trim(EXCLUDED.response), '') IS NULL
      THEN provider_clinical_discovery_answers.response
    ELSE provider_clinical_discovery_answers.response || E'\n\n' || EXCLUDED.response
  END,
  tags = (
    SELECT coalesce(array_agg(DISTINCT tag ORDER BY tag), '{}'::text[])
    FROM (
      SELECT unnest(provider_clinical_discovery_answers.tags) AS tag
      UNION
      SELECT unnest(EXCLUDED.tags) AS tag
    ) u
    WHERE nullif(trim(tag), '') IS NOT NULL
  ),
  confidence = CASE
    CASE lower(coalesce(provider_clinical_discovery_answers.confidence, ''))
      WHEN 'high' THEN 3
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 1
      ELSE 0
    END
    WHEN 3 THEN provider_clinical_discovery_answers.confidence
    ELSE CASE
      CASE lower(coalesce(EXCLUDED.confidence, ''))
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 1
        ELSE 0
      END
      WHEN 3 THEN EXCLUDED.confidence
      WHEN 2 THEN EXCLUDED.confidence
      ELSE provider_clinical_discovery_answers.confidence
    END
  END,
  source_case_id = coalesce(
    provider_clinical_discovery_answers.source_case_id,
    EXCLUDED.source_case_id
  ),
  source_notes = coalesce(
    nullif(trim(provider_clinical_discovery_answers.source_notes), ''),
    EXCLUDED.source_notes
  ),
  updated_by = coalesce(EXCLUDED.updated_by, provider_clinical_discovery_answers.updated_by),
  updated_at = greatest(
    provider_clinical_discovery_answers.updated_at,
    EXCLUDED.updated_at
  );

DELETE FROM public.provider_clinical_discovery_answers
WHERE question_key IN (
  'current_modality_challenge',
  'root_causes',
  'frequency',
  'clinical_impact'
);

-- or_environment ← why_it_matters, urgency_drivers
WITH legacy AS (
  SELECT *
  FROM public.provider_clinical_discovery_answers
  WHERE question_key IN ('why_it_matters', 'urgency_drivers')
),
merged AS (
  SELECT
    l.provider_id,
    'or_environment'::text AS question_key,
    'OR Environment'::text AS question_label,
    'What is the OR setup and team rhythm that affects access, turnover, and case flow?'::text AS question_text,
    coalesce(
      nullif(
        trim(
          string_agg(
            CASE
              WHEN nullif(trim(l.response), '') IS NOT NULL
                THEN '**' || l.question_label || ':** ' || trim(l.response)
            END,
            E'\n\n'
            ORDER BY l.updated_at DESC NULLS LAST
          )
        ),
        ''
      ),
      ''
    ) AS response,
    coalesce(
      (
        SELECT array_agg(DISTINCT tag ORDER BY tag)
        FROM (
          SELECT unnest(l2.tags) AS tag
          FROM legacy l2
          WHERE l2.provider_id = l.provider_id
        ) tags
        WHERE nullif(trim(tag), '') IS NOT NULL
      ),
      '{}'::text[]
    ) AS tags,
    CASE max(
      CASE lower(coalesce(l.confidence, ''))
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 1
        ELSE 0
      END
    )
      WHEN 3 THEN 'high'
      WHEN 2 THEN 'medium'
      WHEN 1 THEN 'low'
      ELSE NULL
    END AS confidence,
    (
      SELECT l2.source_case_id
      FROM legacy l2
      WHERE l2.provider_id = l.provider_id
        AND l2.source_case_id IS NOT NULL
      ORDER BY l2.updated_at DESC NULLS LAST
      LIMIT 1
    ) AS source_case_id,
    nullif(
      trim(
        string_agg(nullif(trim(l.source_notes), ''), E'\n' ORDER BY l.updated_at DESC NULLS LAST)
      ),
      ''
    ) AS source_notes,
    min(l.created_at) AS created_at,
    max(l.updated_at) AS updated_at,
    (
      SELECT l2.created_by
      FROM legacy l2
      WHERE l2.provider_id = l.provider_id
      ORDER BY l2.updated_at DESC NULLS LAST
      LIMIT 1
    ) AS created_by,
    (
      SELECT l2.updated_by
      FROM legacy l2
      WHERE l2.provider_id = l.provider_id
      ORDER BY l2.updated_at DESC NULLS LAST
      LIMIT 1
    ) AS updated_by
  FROM legacy l
  GROUP BY l.provider_id
)
INSERT INTO public.provider_clinical_discovery_answers (
  provider_id,
  question_key,
  question_label,
  question_text,
  response,
  tags,
  confidence,
  source_case_id,
  source_notes,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  provider_id,
  question_key,
  question_label,
  question_text,
  response,
  tags,
  confidence,
  source_case_id,
  source_notes,
  created_by,
  updated_by,
  created_at,
  updated_at
FROM merged
ON CONFLICT (provider_id, question_key) DO UPDATE SET
  question_label = EXCLUDED.question_label,
  question_text = EXCLUDED.question_text,
  response = CASE
    WHEN nullif(trim(provider_clinical_discovery_answers.response), '') IS NULL
      THEN EXCLUDED.response
    WHEN nullif(trim(EXCLUDED.response), '') IS NULL
      THEN provider_clinical_discovery_answers.response
    ELSE provider_clinical_discovery_answers.response || E'\n\n' || EXCLUDED.response
  END,
  tags = (
    SELECT coalesce(array_agg(DISTINCT tag ORDER BY tag), '{}'::text[])
    FROM (
      SELECT unnest(provider_clinical_discovery_answers.tags) AS tag
      UNION
      SELECT unnest(EXCLUDED.tags) AS tag
    ) u
    WHERE nullif(trim(tag), '') IS NOT NULL
  ),
  confidence = CASE
    CASE lower(coalesce(provider_clinical_discovery_answers.confidence, ''))
      WHEN 'high' THEN 3
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 1
      ELSE 0
    END
    WHEN 3 THEN provider_clinical_discovery_answers.confidence
    ELSE CASE
      CASE lower(coalesce(EXCLUDED.confidence, ''))
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 1
        ELSE 0
      END
      WHEN 3 THEN EXCLUDED.confidence
      WHEN 2 THEN EXCLUDED.confidence
      ELSE provider_clinical_discovery_answers.confidence
    END
  END,
  source_case_id = coalesce(
    provider_clinical_discovery_answers.source_case_id,
    EXCLUDED.source_case_id
  ),
  source_notes = coalesce(
    nullif(trim(provider_clinical_discovery_answers.source_notes), ''),
    EXCLUDED.source_notes
  ),
  updated_by = coalesce(EXCLUDED.updated_by, provider_clinical_discovery_answers.updated_by),
  updated_at = greatest(
    provider_clinical_discovery_answers.updated_at,
    EXCLUDED.updated_at
  );

DELETE FROM public.provider_clinical_discovery_answers
WHERE question_key IN ('why_it_matters', 'urgency_drivers');

-- commercial_signals ← prior_attempts, priority_ranking, risk_of_inaction
WITH legacy AS (
  SELECT *
  FROM public.provider_clinical_discovery_answers
  WHERE question_key IN ('prior_attempts', 'priority_ranking', 'risk_of_inaction')
),
merged AS (
  SELECT
    l.provider_id,
    'commercial_signals'::text AS question_key,
    'Commercial Signals'::text AS question_label,
    'What products, vendors, and competitive pressures are in play — and what would change adoption?'::text AS question_text,
    coalesce(
      nullif(
        trim(
          string_agg(
            CASE
              WHEN nullif(trim(l.response), '') IS NOT NULL
                THEN '**' || l.question_label || ':** ' || trim(l.response)
            END,
            E'\n\n'
            ORDER BY l.updated_at DESC NULLS LAST
          )
        ),
        ''
      ),
      ''
    ) AS response,
    coalesce(
      (
        SELECT array_agg(DISTINCT tag ORDER BY tag)
        FROM (
          SELECT unnest(l2.tags) AS tag
          FROM legacy l2
          WHERE l2.provider_id = l.provider_id
        ) tags
        WHERE nullif(trim(tag), '') IS NOT NULL
      ),
      '{}'::text[]
    ) AS tags,
    CASE max(
      CASE lower(coalesce(l.confidence, ''))
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 1
        ELSE 0
      END
    )
      WHEN 3 THEN 'high'
      WHEN 2 THEN 'medium'
      WHEN 1 THEN 'low'
      ELSE NULL
    END AS confidence,
    (
      SELECT l2.source_case_id
      FROM legacy l2
      WHERE l2.provider_id = l.provider_id
        AND l2.source_case_id IS NOT NULL
      ORDER BY l2.updated_at DESC NULLS LAST
      LIMIT 1
    ) AS source_case_id,
    nullif(
      trim(
        string_agg(nullif(trim(l.source_notes), ''), E'\n' ORDER BY l.updated_at DESC NULLS LAST)
      ),
      ''
    ) AS source_notes,
    min(l.created_at) AS created_at,
    max(l.updated_at) AS updated_at,
    (
      SELECT l2.created_by
      FROM legacy l2
      WHERE l2.provider_id = l.provider_id
      ORDER BY l2.updated_at DESC NULLS LAST
      LIMIT 1
    ) AS created_by,
    (
      SELECT l2.updated_by
      FROM legacy l2
      WHERE l2.provider_id = l.provider_id
      ORDER BY l2.updated_at DESC NULLS LAST
      LIMIT 1
    ) AS updated_by
  FROM legacy l
  GROUP BY l.provider_id
)
INSERT INTO public.provider_clinical_discovery_answers (
  provider_id,
  question_key,
  question_label,
  question_text,
  response,
  tags,
  confidence,
  source_case_id,
  source_notes,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  provider_id,
  question_key,
  question_label,
  question_text,
  response,
  tags,
  confidence,
  source_case_id,
  source_notes,
  created_by,
  updated_by,
  created_at,
  updated_at
FROM merged
ON CONFLICT (provider_id, question_key) DO UPDATE SET
  question_label = EXCLUDED.question_label,
  question_text = EXCLUDED.question_text,
  response = CASE
    WHEN nullif(trim(provider_clinical_discovery_answers.response), '') IS NULL
      THEN EXCLUDED.response
    WHEN nullif(trim(EXCLUDED.response), '') IS NULL
      THEN provider_clinical_discovery_answers.response
    ELSE provider_clinical_discovery_answers.response || E'\n\n' || EXCLUDED.response
  END,
  tags = (
    SELECT coalesce(array_agg(DISTINCT tag ORDER BY tag), '{}'::text[])
    FROM (
      SELECT unnest(provider_clinical_discovery_answers.tags) AS tag
      UNION
      SELECT unnest(EXCLUDED.tags) AS tag
    ) u
    WHERE nullif(trim(tag), '') IS NOT NULL
  ),
  confidence = CASE
    CASE lower(coalesce(provider_clinical_discovery_answers.confidence, ''))
      WHEN 'high' THEN 3
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 1
      ELSE 0
    END
    WHEN 3 THEN provider_clinical_discovery_answers.confidence
    ELSE CASE
      CASE lower(coalesce(EXCLUDED.confidence, ''))
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 1
        ELSE 0
      END
      WHEN 3 THEN EXCLUDED.confidence
      WHEN 2 THEN EXCLUDED.confidence
      ELSE provider_clinical_discovery_answers.confidence
    END
  END,
  source_case_id = coalesce(
    provider_clinical_discovery_answers.source_case_id,
    EXCLUDED.source_case_id
  ),
  source_notes = coalesce(
    nullif(trim(provider_clinical_discovery_answers.source_notes), ''),
    EXCLUDED.source_notes
  ),
  updated_by = coalesce(EXCLUDED.updated_by, provider_clinical_discovery_answers.updated_by),
  updated_at = greatest(
    provider_clinical_discovery_answers.updated_at,
    EXCLUDED.updated_at
  );

DELETE FROM public.provider_clinical_discovery_answers
WHERE question_key IN ('prior_attempts', 'priority_ranking', 'risk_of_inaction');

-- Align any rows already written with canonical keys (labels / prompt text only).
UPDATE public.provider_clinical_discovery_answers
SET
  question_label = 'Clinical Workflow',
  question_text = 'How does this provider run cases day-to-day — procedural steps, handoffs, and where things slow down?'
WHERE question_key = 'clinical_workflow';

UPDATE public.provider_clinical_discovery_answers
SET
  question_label = 'OR Environment',
  question_text = 'What is the OR setup and team rhythm that affects access, turnover, and case flow?'
WHERE question_key = 'or_environment';

UPDATE public.provider_clinical_discovery_answers
SET
  question_label = 'Relationship Intelligence',
  question_text = 'Who influences decisions, how do they engage with reps, and what builds trust in the OR?'
WHERE question_key = 'relationship_intelligence';

UPDATE public.provider_clinical_discovery_answers
SET
  question_label = 'Commercial Signals',
  question_text = 'What products, vendors, and competitive pressures are in play — and what would change adoption?'
WHERE question_key = 'commercial_signals';

UPDATE public.provider_clinical_discovery_answers
SET
  question_label = 'Observation Readiness',
  question_text = 'What do you still need to see on first observation or case day to be effective in the OR?'
WHERE question_key = 'observation_readiness';

ALTER TABLE public.provider_clinical_discovery_answers
  ADD CONSTRAINT provider_clinical_discovery_answers_question_key_check
  CHECK (
    question_key IN (
      'clinical_workflow',
      'or_environment',
      'relationship_intelligence',
      'commercial_signals',
      'observation_readiness'
    )
  );
