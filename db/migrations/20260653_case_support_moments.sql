alter table public.surgical_sales_cases
  add column if not exists case_support_provider_reaction text null,
  add column if not exists case_support_case_result text null,
  add column if not exists case_support_next_step text null;

comment on column public.surgical_sales_cases.case_support_provider_reaction is
  'Rep-facing provider reaction after product support: positive, neutral, negative.';

comment on column public.surgical_sales_cases.case_support_case_result is
  'Rep-facing case result after product support: successful, issue_encountered, follow_up_needed.';

comment on column public.surgical_sales_cases.case_support_next_step is
  'Rep-facing next step after product support: additional_case, training, evaluation, follow_up_meeting, none.';
