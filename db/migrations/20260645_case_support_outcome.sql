alter table public.surgical_sales_cases
  add column if not exists case_support_outcome text null;

comment on column public.surgical_sales_cases.case_support_outcome is
  'Post-case outcome for product support cases (completed_as_planned, product_used, product_not_used, issue_occurred, follow_up_needed).';
