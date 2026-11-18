-- In-app (and optional email) notifications for internal surgical sales reps.

CREATE TABLE IF NOT EXISTS public.surgical_sales_rep_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  case_id uuid NOT NULL REFERENCES public.surgical_sales_cases (id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surgical_sales_rep_notifications_type_check CHECK (
    notification_type IN (
      'case_assigned',
      'case_upcoming_24h',
      'case_missing_docs_completed',
      'case_stuck_workflow'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS surgical_sales_rep_notifications_dedupe_key_unique
  ON public.surgical_sales_rep_notifications (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_surgical_sales_rep_notifications_user_created
  ON public.surgical_sales_rep_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_surgical_sales_rep_notifications_case
  ON public.surgical_sales_rep_notifications (case_id);

COMMENT ON TABLE public.surgical_sales_rep_notifications IS
  'Surgical CRM alerts for case owners; written via service role from API/cron only.';

ALTER TABLE public.surgical_sales_rep_notifications ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.surgical_sales_rep_notifications TO service_role;
REVOKE ALL ON public.surgical_sales_rep_notifications FROM PUBLIC;
GRANT SELECT ON public.surgical_sales_rep_notifications TO authenticated;

DROP POLICY IF EXISTS surgical_sales_rep_notifications_select ON public.surgical_sales_rep_notifications;
CREATE POLICY surgical_sales_rep_notifications_select ON public.surgical_sales_rep_notifications
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );
