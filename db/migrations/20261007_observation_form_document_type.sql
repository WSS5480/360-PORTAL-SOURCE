-- Allow completed case observation forms on surgical case documents.

ALTER TABLE public.surgical_sales_case_documents
  DROP CONSTRAINT IF EXISTS surgical_sales_case_documents_type_check;

ALTER TABLE public.surgical_sales_case_documents
  ADD CONSTRAINT surgical_sales_case_documents_type_check
  CHECK (
    document_type IN (
      'purchase_order',
      'invoice',
      'packing_slip',
      'consignment_form',
      'implant_log',
      'observation_form',
      'other'
    )
  );

CREATE INDEX IF NOT EXISTS idx_surgical_sales_case_documents_observation_form
  ON public.surgical_sales_case_documents (uploaded_by, created_at DESC)
  WHERE document_type = 'observation_form';
