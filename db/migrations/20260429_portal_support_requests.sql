create table if not exists public.portal_support_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  user_email text,
  user_name text,
  page text,
  message text not null,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_portal_support_requests_created_at
  on public.portal_support_requests (created_at desc);
