-- Admin-reviewed product intelligence for Sales Command.
-- Additive: approved rows are loaded as context by the universal facts GPT extractor.

CREATE TABLE IF NOT EXISTS public.surgical_sales_product_intelligence_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.surgical_sales_products (id) ON DELETE CASCADE,
  file_id uuid NULL REFERENCES public.files (id) ON DELETE SET NULL,
  source_url text NULL,
  title text NOT NULL,
  document_type text NOT NULL DEFAULT 'product_document',
  extracted_text text NULL,
  extraction_status text NOT NULL DEFAULT 'uploaded',
  uploaded_by_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surgical_sales_product_intelligence_documents_type_check CHECK (
    document_type IN ('product_document', 'brochure', 'ifu', 'clinical_paper', 'competitor_reference', 'research_note', 'other')
  ),
  CONSTRAINT surgical_sales_product_intelligence_documents_status_check CHECK (
    extraction_status IN ('uploaded', 'text_extracted', 'text_unavailable', 'analysis_pending', 'analysis_complete', 'analysis_failed')
  )
);

CREATE TABLE IF NOT EXISTS public.surgical_sales_product_intelligence_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.surgical_sales_products (id) ON DELETE CASCADE,
  document_id uuid NULL REFERENCES public.surgical_sales_product_intelligence_documents (id) ON DELETE SET NULL,
  run_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  model text NULL,
  prompt_summary text NULL,
  raw_result jsonb NULL,
  error_message text NULL,
  created_by_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  CONSTRAINT surgical_sales_product_intelligence_runs_type_check CHECK (
    run_type IN ('document_analysis', 'ai_research', 'manual_seed')
  ),
  CONSTRAINT surgical_sales_product_intelligence_runs_status_check CHECK (
    status IN ('pending', 'running', 'complete', 'failed')
  )
);

CREATE TABLE IF NOT EXISTS public.surgical_sales_product_intelligence_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.surgical_sales_products (id) ON DELETE CASCADE,
  document_id uuid NULL REFERENCES public.surgical_sales_product_intelligence_documents (id) ON DELETE SET NULL,
  run_id uuid NULL REFERENCES public.surgical_sales_product_intelligence_runs (id) ON DELETE SET NULL,
  knowledge_type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  evidence text NULL,
  confidence text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by_user_id uuid NULL,
  reviewed_at timestamptz NULL,
  admin_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surgical_sales_product_intelligence_candidates_type_check CHECK (
    knowledge_type IN (
      'what_it_does',
      'procedures',
      'problems_solved',
      'buying_signals',
      'workflow_pain_points',
      'evaluation_questions',
      'objections',
      'competitors',
      'stakeholders',
      'differentiators',
      'other'
    )
  ),
  CONSTRAINT surgical_sales_product_intelligence_candidates_confidence_check CHECK (
    confidence IN ('high', 'medium', 'low')
  ),
  CONSTRAINT surgical_sales_product_intelligence_candidates_status_check CHECK (
    status IN ('pending', 'approved', 'rejected')
  )
);

CREATE INDEX IF NOT EXISTS idx_sspi_documents_product
  ON public.surgical_sales_product_intelligence_documents (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sspi_runs_product
  ON public.surgical_sales_product_intelligence_runs (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sspi_candidates_product_status
  ON public.surgical_sales_product_intelligence_candidates (product_id, status, knowledge_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sspi_candidates_approved
  ON public.surgical_sales_product_intelligence_candidates (knowledge_type, product_id)
  WHERE status = 'approved';

ALTER TABLE public.surgical_sales_product_intelligence_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surgical_sales_product_intelligence_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surgical_sales_product_intelligence_candidates ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.surgical_sales_product_intelligence_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surgical_sales_product_intelligence_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surgical_sales_product_intelligence_candidates TO authenticated;
GRANT ALL ON public.surgical_sales_product_intelligence_documents TO service_role;
GRANT ALL ON public.surgical_sales_product_intelligence_runs TO service_role;
GRANT ALL ON public.surgical_sales_product_intelligence_candidates TO service_role;

DROP POLICY IF EXISTS sspi_documents_authenticated_select ON public.surgical_sales_product_intelligence_documents;
CREATE POLICY sspi_documents_authenticated_select ON public.surgical_sales_product_intelligence_documents
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS sspi_runs_authenticated_select ON public.surgical_sales_product_intelligence_runs;
CREATE POLICY sspi_runs_authenticated_select ON public.surgical_sales_product_intelligence_runs
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS sspi_candidates_authenticated_select ON public.surgical_sales_product_intelligence_candidates;
CREATE POLICY sspi_candidates_authenticated_select ON public.surgical_sales_product_intelligence_candidates
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS sspi_documents_service ON public.surgical_sales_product_intelligence_documents;
CREATE POLICY sspi_documents_service ON public.surgical_sales_product_intelligence_documents
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS sspi_runs_service ON public.surgical_sales_product_intelligence_runs;
CREATE POLICY sspi_runs_service ON public.surgical_sales_product_intelligence_runs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS sspi_candidates_service ON public.surgical_sales_product_intelligence_candidates;
CREATE POLICY sspi_candidates_service ON public.surgical_sales_product_intelligence_candidates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.surgical_sales_product_intelligence_candidates IS
  'Admin-reviewed product knowledge. Only rows with status=approved may be used as extractor context.';
