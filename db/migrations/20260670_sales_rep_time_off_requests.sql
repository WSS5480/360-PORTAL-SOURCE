-- Sales rep time-off requests (PTO, sick, personal) + admin in-app alerts.

CREATE TABLE IF NOT EXISTS public.sales_rep_time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL,
  request_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_rep_time_off_requests_type_check CHECK (
    request_type IN ('pto', 'sick', 'personal')
  ),
  CONSTRAINT sales_rep_time_off_requests_status_check CHECK (
    status IN ('pending', 'approved', 'denied', 'cancelled')
  ),
  CONSTRAINT sales_rep_time_off_requests_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_sales_rep_time_off_requests_requester_created
  ON public.sales_rep_time_off_requests (requester_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_rep_time_off_requests_status_created
  ON public.sales_rep_time_off_requests (status, created_at DESC);

COMMENT ON TABLE public.sales_rep_time_off_requests IS
  'Internal sales rep time-off requests; reviewed by portal admins.';

ALTER TABLE public.sales_rep_time_off_requests ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.sales_rep_time_off_requests TO service_role;
REVOKE ALL ON public.sales_rep_time_off_requests FROM PUBLIC;
GRANT SELECT ON public.sales_rep_time_off_requests TO authenticated;

DROP POLICY IF EXISTS sales_rep_time_off_requests_select ON public.sales_rep_time_off_requests;
CREATE POLICY sales_rep_time_off_requests_select ON public.sales_rep_time_off_requests
  FOR SELECT TO authenticated
  USING (
    requester_user_id = (SELECT auth.uid())
    OR (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );

-- Admin-wide in-app notifications (time-off and future internal alerts).
CREATE TABLE IF NOT EXISTS public.admin_internal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_internal_notifications_type_check CHECK (
    notification_type IN ('time_off_request', 'time_off_decision')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_internal_notifications_dedupe_key_unique
  ON public.admin_internal_notifications (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_internal_notifications_created
  ON public.admin_internal_notifications (created_at DESC);

COMMENT ON TABLE public.admin_internal_notifications IS
  'In-app alerts for portal admins; written via service role from API only.';

ALTER TABLE public.admin_internal_notifications ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.admin_internal_notifications TO service_role;
REVOKE ALL ON public.admin_internal_notifications FROM PUBLIC;
GRANT SELECT ON public.admin_internal_notifications TO authenticated;

DROP POLICY IF EXISTS admin_internal_notifications_select ON public.admin_internal_notifications;
CREATE POLICY admin_internal_notifications_select ON public.admin_internal_notifications
  FOR SELECT TO authenticated
  USING (
    (SELECT public.surgical_sales_is_internal_portal_admin())
    OR (SELECT private.is_admin_or_staff())
  );
