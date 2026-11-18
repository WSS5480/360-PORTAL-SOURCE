-- Expand provider activity types allowed by the table check constraint.
-- The app writes many legacy activity_type values via emitActivityEvent and logSurgicalProviderActivity.

ALTER TABLE public.surgical_sales_provider_activities
  DROP CONSTRAINT IF EXISTS surgical_sales_provider_activities_type_check;

ALTER TABLE public.surgical_sales_provider_activities
  ADD CONSTRAINT surgical_sales_provider_activities_type_check
  CHECK (
    activity_type IN (
      'clinical_discovery_updated',
      'provider_updated',
      'provider_created',
      'provider_intelligence_promoted',
      'planning_section_completed',
      'pre_call_plan_created',
      'pre_call_plan_updated',
      'pre_call_plan_completed',
      'engagement_created',
      'engagement_updated',
      'engagement_completed',
      'engagement_converted_to_case',
      'engagement_prepared',
      'case_created_from_engagement',
      'ai_note_capture',
      'note_added'
    )
  );
