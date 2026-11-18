-- Expand case activity types allowed by the table check constraint.
-- The app writes many legacy activity_type values via logSurgicalCaseActivity,
-- engagement mirroring, pre-call plan logging, and emitActivityEvent.

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
      'clinical_discovery_insight_from_case',
      'provider_debrief_planned',
      'pre_call_plan_created',
      'pre_call_plan_updated',
      'pre_call_plan_completed',
      'ai_note_capture',
      'case_linked_from_engagement',
      'case_created_from_engagement',
      'engagement_created',
      'engagement_updated',
      'engagement_completed',
      'engagement_converted_to_case',
      'engagement_prepared'
    )
  );
