-- Allow observation cases to be saved as draft during create flow (Pre-Call Plan in progress).

alter table public.surgical_sales_cases
  drop constraint if exists surgical_sales_cases_status_check;

alter table public.surgical_sales_cases
  add constraint surgical_sales_cases_status_check
  check (
    status in (
      'draft',
      'scheduled',
      'confirmed',
      'completed',
      'docs_needed',
      'billing_review',
      'invoiced',
      'closed',
      'cancelled'
    )
  );

comment on constraint surgical_sales_cases_status_check on public.surgical_sales_cases is
  'draft = created from new-case flow with Pre-Call Plan in progress; promote to scheduled when ready.';
