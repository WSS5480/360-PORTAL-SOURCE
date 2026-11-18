-- Allow rescheduled as an observation case workflow status.

ALTER TABLE public.surgical_sales_cases
  DROP CONSTRAINT IF EXISTS surgical_sales_cases_status_check;

ALTER TABLE public.surgical_sales_cases
  ADD CONSTRAINT surgical_sales_cases_status_check
  CHECK (
    status IN (
      'draft',
      'scheduled',
      'rescheduled',
      'confirmed',
      'completed',
      'docs_needed',
      'billing_review',
      'invoiced',
      'closed',
      'cancelled'
    )
  );

COMMENT ON CONSTRAINT surgical_sales_cases_status_check ON public.surgical_sales_cases IS
  'rescheduled = observation case moved to a new date/time; rep restarts from scheduled-like workflow.';
