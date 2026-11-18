-- Case activity when clinical discovery insight is promoted from an observation case.

ALTER TABLE public.surgical_sales_case_activities
  DROP CONSTRAINT IF EXISTS surgical_sales_case_activities_type_check;

ALTER TABLE public.surgical_sales_case_activities
  ADD CONSTRAINT surgical_sales_case_activities_type_check
  CHECK (
    activity_type IN (
      'note',
      'status_change',
      'document_uploaded',
      'document_deleted',
      'product_updated',
      'billing_update',
      'case_created',
      'case_updated',
      'case_archived',
      'case_restored',
      'provider_intelligence_promoted',
      'clinical_discovery_insight_from_case'
    )
  );
