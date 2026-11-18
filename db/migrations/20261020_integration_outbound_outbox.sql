-- Durable outbound fulfillment synchronization.
-- Apply after 20261020_integration_partner_foundation.sql.
-- Payment-link and receipt events are intentionally not represented here.

ALTER TABLE public.integration_partners
  ADD COLUMN IF NOT EXISTS adapter_code text NOT NULL DEFAULT 'fulfillment-callbacks-v1';

ALTER TABLE public.integration_partners
  DROP CONSTRAINT IF EXISTS integration_partners_adapter_code_chk;

ALTER TABLE public.integration_partners
  ADD CONSTRAINT integration_partners_adapter_code_chk
  CHECK (adapter_code ~ '^[a-z0-9][a-z0-9-]{1,48}$');

CREATE TABLE IF NOT EXISTS public.integration_outbound_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.integration_partners (id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  external_order_number text NOT NULL,
  event_type text NOT NULL,
  business_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_hash text,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 8,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_http_status integer,
  last_error text,
  blocked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_outbound_jobs_event_chk CHECK (event_type IN ('invoice', 'shipment')),
  CONSTRAINT integration_outbound_jobs_status_chk CHECK (
    status IN ('pending', 'processing', 'succeeded', 'failed', 'blocked')
  ),
  CONSTRAINT integration_outbound_jobs_attempts_chk CHECK (
    attempt_count >= 0 AND max_attempts BETWEEN 1 AND 20
  ),
  CONSTRAINT integration_outbound_jobs_business_key_chk CHECK (
    char_length(btrim(business_key)) BETWEEN 1 AND 160
  ),
  CONSTRAINT integration_outbound_jobs_hash_chk CHECK (
    payload_hash IS NULL OR payload_hash ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT integration_outbound_jobs_partner_event_key_uidx UNIQUE (partner_id, event_type, business_key)
);

CREATE INDEX IF NOT EXISTS integration_outbound_jobs_due_idx
  ON public.integration_outbound_jobs (next_attempt_at, id)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS integration_outbound_jobs_partner_status_idx
  ON public.integration_outbound_jobs (partner_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.integration_outbound_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.integration_outbound_jobs (id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  http_status integer,
  response_excerpt text,
  error text,
  duration_ms integer,
  CONSTRAINT integration_outbound_attempts_status_chk CHECK (
    http_status IS NULL OR (http_status BETWEEN 100 AND 599)
  ),
  CONSTRAINT integration_outbound_attempts_excerpt_chk CHECK (
    response_excerpt IS NULL OR char_length(response_excerpt) <= 500
  )
);

CREATE INDEX IF NOT EXISTS integration_outbound_attempts_job_idx
  ON public.integration_outbound_attempts (job_id, attempted_at DESC);

-- Releases locks abandoned by a crashed worker, then claims due jobs.
-- SKIP LOCKED lets two workers take different rows from the same due set.
CREATE OR REPLACE FUNCTION public.integration_claim_outbound_jobs(
  p_worker_id text,
  p_limit integer
)
RETURNS SETOF public.integration_outbound_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_worker_id IS NULL OR char_length(btrim(p_worker_id)) < 1 OR char_length(p_worker_id) > 80 THEN
    RAISE EXCEPTION 'invalid worker id';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 25 THEN
    RAISE EXCEPTION 'invalid claim limit';
  END IF;

  UPDATE public.integration_outbound_jobs
  SET status = 'pending',
      locked_at = NULL,
      locked_by = NULL,
      updated_at = now()
  WHERE status = 'processing'
    AND locked_at IS NOT NULL
    AND locked_at < now() - interval '10 minutes';

  RETURN QUERY
  UPDATE public.integration_outbound_jobs AS job
  SET status = 'processing',
      locked_at = now(),
      locked_by = p_worker_id,
      updated_at = now()
  WHERE job.id IN (
    SELECT candidate.id
    FROM public.integration_outbound_jobs AS candidate
    WHERE candidate.status = 'pending'
      AND candidate.next_attempt_at <= now()
    ORDER BY candidate.next_attempt_at, candidate.id
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  RETURNING job.*;
END;
$$;

REVOKE ALL ON FUNCTION public.integration_claim_outbound_jobs(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.integration_claim_outbound_jobs(text, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_claim_outbound_jobs(text, integer) TO service_role;

ALTER TABLE public.integration_outbound_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_outbound_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.integration_outbound_jobs FROM PUBLIC;
REVOKE ALL ON TABLE public.integration_outbound_attempts FROM PUBLIC;
REVOKE ALL ON TABLE public.integration_outbound_jobs FROM anon, authenticated;
REVOKE ALL ON TABLE public.integration_outbound_attempts FROM anon, authenticated;

GRANT ALL ON TABLE public.integration_outbound_jobs TO service_role;
GRANT ALL ON TABLE public.integration_outbound_attempts TO service_role;

COMMENT ON TABLE public.integration_outbound_jobs IS
  'Outbox of partner fulfillment callbacks. Written after the order fact exists so a process restart can still deliver it.';
COMMENT ON COLUMN public.integration_outbound_jobs.external_order_number IS
  'Immutable partner order number used on the callback path. Not orders.order_number.';
COMMENT ON TABLE public.integration_outbound_attempts IS
  'One row per callback attempt. Response text is redacted and length-limited. Credentials are never stored here.';

-- Orders whose callback rows are missing or no longer match the stored invoice or tracking fact.
-- Pending retries are claimed separately, so this list does not keep returning the same waiting job.
CREATE OR REPLACE FUNCTION public.integration_list_orders_needing_sync(p_limit integer)
RETURNS TABLE (order_id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT partner_order.order_id
  FROM public.integration_partner_orders AS partner_order
  WHERE partner_order.order_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.invoices AS invoice
        WHERE invoice.order_id = partner_order.order_id
          AND invoice.voided_at IS NULL
          AND upper(invoice.invoice_kind) <> 'SHIPPING_SUPPLEMENT'
          AND NOT EXISTS (
            SELECT 1
            FROM public.integration_outbound_jobs AS job
            WHERE job.partner_id = partner_order.partner_id
              AND job.event_type = 'invoice'
              AND job.business_key = 'invoice:' || invoice.id::text
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.invoices AS invoice
        JOIN public.integration_outbound_jobs AS job
          ON job.order_id = invoice.order_id
         AND job.partner_id = partner_order.partner_id
         AND job.event_type = 'invoice'
         AND job.status = 'succeeded'
         AND job.business_key = 'invoice:' || invoice.id::text
        WHERE invoice.order_id = partner_order.order_id
          AND invoice.voided_at IS NULL
          AND upper(invoice.invoice_kind) <> 'SHIPPING_SUPPLEMENT'
          AND abs(
            COALESCE(invoice.total, 0)
            - COALESCE(NULLIF(job.payload->>'final_total', '')::numeric, 0)
          ) > 0.02
          AND NOT EXISTS (
            SELECT 1
            FROM public.integration_outbound_jobs AS revision
            WHERE revision.partner_id = job.partner_id
              AND revision.event_type = 'invoice'
              AND revision.business_key = job.business_key || ':revision'
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.fulfillments AS fulfillment
        WHERE fulfillment.order_id = partner_order.order_id
          AND upper(fulfillment.status) = 'CLOSED'
          AND NOT EXISTS (
            SELECT 1
            FROM public.integration_outbound_jobs AS job
            WHERE job.partner_id = partner_order.partner_id
              AND job.event_type = 'shipment'
              AND job.business_key = 'shipment:' || fulfillment.id::text
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.fulfillments AS fulfillment
        JOIN public.integration_outbound_jobs AS job
          ON job.order_id = fulfillment.order_id
         AND job.partner_id = partner_order.partner_id
         AND job.event_type = 'shipment'
         AND job.status = 'succeeded'
         AND job.business_key = 'shipment:' || fulfillment.id::text
        WHERE fulfillment.order_id = partner_order.order_id
          AND upper(fulfillment.status) = 'CLOSED'
          AND COALESCE(job.payload->>'tracking_number', '') = ''
          AND COALESCE(fulfillment.tracking_number, fulfillment.dropship_tracking_number, '') <> ''
      )
    )
  ORDER BY partner_order.created_at, partner_order.order_id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
$$;

REVOKE ALL ON FUNCTION public.integration_list_orders_needing_sync(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.integration_list_orders_needing_sync(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_list_orders_needing_sync(integer) TO service_role;
