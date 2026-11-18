-- Payment-link and receipt events for the partner outbox.
-- Apply only to a local or staging database. Do not apply this to production from the local test runner.

ALTER TABLE public.integration_outbound_jobs
  DROP CONSTRAINT IF EXISTS integration_outbound_jobs_event_chk;

ALTER TABLE public.integration_outbound_jobs
  ADD CONSTRAINT integration_outbound_jobs_event_chk
  CHECK (event_type IN ('invoice', 'shipment', 'payment-link', 'payment'));

ALTER TABLE public.invoice_payments
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS confirmation_code text,
  ADD COLUMN IF NOT EXISTS external_payment_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS invoice_payments_external_payment_id_uidx
  ON public.invoice_payments (external_payment_id)
  WHERE external_payment_id IS NOT NULL;

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
      OR EXISTS (
        SELECT 1
        FROM public.invoices AS invoice
        WHERE invoice.order_id = partner_order.order_id
          AND invoice.voided_at IS NULL
          AND invoice.issued_at IS NOT NULL
          AND upper(COALESCE(invoice.invoice_kind, 'PRIMARY')) <> 'SHIPPING_SUPPLEMENT'
          AND COALESCE(invoice.total, 0) - COALESCE(invoice.amount_paid, 0) > 0.02
          AND NOT EXISTS (
            SELECT 1
            FROM public.integration_outbound_jobs AS job
            WHERE job.partner_id = partner_order.partner_id
              AND job.event_type = 'payment-link'
              AND job.business_key = 'payment-link:' || invoice.id::text
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.invoices AS invoice
        JOIN public.integration_outbound_jobs AS job
          ON job.order_id = invoice.order_id
         AND job.partner_id = partner_order.partner_id
         AND job.event_type = 'payment-link'
         AND job.status = 'succeeded'
         AND job.business_key = 'payment-link:' || invoice.id::text
        WHERE invoice.order_id = partner_order.order_id
          AND COALESCE(invoice.metadata->'partner_checkout'->>'url', '') <> ''
          AND COALESCE(invoice.metadata->'partner_checkout'->>'url', '')
            IS DISTINCT FROM COALESCE(job.payload->>'payment_link_url', '')
      )
      OR EXISTS (
        SELECT 1
        FROM public.invoice_payments AS payment
        JOIN public.invoices AS invoice ON invoice.id = payment.invoice_id
        WHERE invoice.order_id = partner_order.order_id
          AND payment.external_payment_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM public.integration_outbound_jobs AS job
            WHERE job.partner_id = partner_order.partner_id
              AND job.event_type = 'payment'
              AND job.business_key = 'payment:' || payment.external_payment_id
          )
      )
    )
  ORDER BY partner_order.created_at, partner_order.order_id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
$$;
