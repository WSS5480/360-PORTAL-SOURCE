-- Audit trail for surgical CRM admin cleanup / data hygiene actions (no PHI).

CREATE TABLE IF NOT EXISTS public.surgical_sales_admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_admin_audit_created_at
  ON public.surgical_sales_admin_audit_log (created_at DESC);

COMMENT ON TABLE public.surgical_sales_admin_audit_log IS
  'Internal-admin surgical CRM cleanup actions (merge, reassign, bulk status).';
