-- Per-field attribution for provider intelligence (source, author, validation).

alter table if exists public.surgical_sales_contacts
  add column if not exists provider_intelligence_field_metadata jsonb not null default '{}'::jsonb;

comment on column public.surgical_sales_contacts.provider_intelligence_field_metadata is
  'JSON map of intelligence db_key → { source_label, updated_by_name, validated_at, … } for living profile attribution.';
