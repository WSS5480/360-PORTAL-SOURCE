-- Intelligence field metadata: lifecycle_state, confirmed_at (JSON keys on provider_intelligence_field_metadata).
-- No column change — existing jsonb map supports optional keys documented in providerIntelligenceLifecycle.ts.

comment on column public.surgical_sales_contacts.provider_intelligence_field_metadata is
  'Per-field attribution: source, author, lifecycle_state (captured|assumed|confirmed|validated|outdated), confirmed_at, validated_at.';
