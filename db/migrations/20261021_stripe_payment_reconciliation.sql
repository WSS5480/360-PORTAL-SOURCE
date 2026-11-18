-- Durable record of a captured Stripe payment that cannot be applied to an invoice.
-- Apply only to the local database from the test runner. Do not apply this to production from here.
-- No refunds are issued by this migration.

CREATE TABLE IF NOT EXISTS public.stripe_payment_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id text NOT NULL,
  invoice_id uuid,
  order_id uuid,
  amount numeric NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  payment_method text,
  confirmation_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stripe_payment_reconciliation_intent_key UNIQUE (payment_intent_id),
  CONSTRAINT stripe_payment_reconciliation_status_chk CHECK (status = 'open'),
  CONSTRAINT stripe_payment_reconciliation_reason_chk CHECK (
    reason IN ('exceeds_balance', 'invoice_not_found', 'missing_invoice')
  ),
  CONSTRAINT stripe_payment_reconciliation_amount_chk CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS stripe_payment_reconciliation_invoice_idx
  ON public.stripe_payment_reconciliation (invoice_id, created_at DESC);

ALTER TABLE public.stripe_payment_reconciliation ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.stripe_payment_reconciliation FROM PUBLIC;
REVOKE ALL ON TABLE public.stripe_payment_reconciliation FROM anon, authenticated;
GRANT ALL ON TABLE public.stripe_payment_reconciliation TO service_role;

COMMENT ON TABLE public.stripe_payment_reconciliation IS
  'Captured Stripe payments that were not applied to an invoice. status open means a person still needs to reconcile them. This table does not store card numbers and does not issue refunds.';

CREATE OR REPLACE FUNCTION public.record_succeeded_stripe_payment(
  p_invoice_id uuid,
  p_payment_intent_id text,
  p_amount numeric,
  p_payment_method text,
  p_confirmation_code text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_order_id uuid;
  v_paid numeric;
  v_reason text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(COALESCE(p_invoice_id::text, p_payment_intent_id), 42));

  IF EXISTS (
    SELECT 1 FROM public.invoice_payments
    WHERE external_payment_id = p_payment_intent_id
       OR note = 'stripe:' || p_payment_intent_id
  ) THEN
    RETURN jsonb_build_object('outcome', 'already_applied');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stripe_payment_reconciliation
    WHERE payment_intent_id = p_payment_intent_id
  ) THEN
    RETURN jsonb_build_object('outcome', 'already_flagged', 'reason', 'duplicate');
  END IF;

  IF p_invoice_id IS NULL THEN
    INSERT INTO public.stripe_payment_reconciliation (
      payment_intent_id, invoice_id, order_id, amount, reason, status, payment_method, confirmation_code
    ) VALUES (
      p_payment_intent_id, NULL, NULL, p_amount, 'missing_invoice', 'open', p_payment_method, p_confirmation_code
    );
    RETURN jsonb_build_object('outcome', 'flagged', 'reason', 'missing_invoice');
  END IF;

  SELECT total, order_id INTO v_total, v_order_id
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.stripe_payment_reconciliation (
      payment_intent_id, invoice_id, order_id, amount, reason, status, payment_method, confirmation_code
    ) VALUES (
      p_payment_intent_id, p_invoice_id, NULL, p_amount, 'invoice_not_found', 'open', p_payment_method, p_confirmation_code
    );
    RETURN jsonb_build_object('outcome', 'flagged', 'reason', 'invoice_not_found');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.invoice_payments
  WHERE invoice_id = p_invoice_id;

  IF p_amount > COALESCE(v_total, 0) - v_paid + 0.02 THEN
    v_reason := 'exceeds_balance';
    INSERT INTO public.stripe_payment_reconciliation (
      payment_intent_id, invoice_id, order_id, amount, reason, status, payment_method, confirmation_code
    ) VALUES (
      p_payment_intent_id, p_invoice_id, v_order_id, p_amount, v_reason, 'open', p_payment_method, p_confirmation_code
    );
    RETURN jsonb_build_object('outcome', 'flagged', 'reason', v_reason);
  END IF;

  INSERT INTO public.invoice_payments (
    invoice_id, amount, note, created_by_user_id, payment_method, confirmation_code, external_payment_id, paid_at
  ) VALUES (
    p_invoice_id, p_amount, 'stripe:' || p_payment_intent_id, NULL, p_payment_method, p_confirmation_code, p_payment_intent_id, now()
  );
  RETURN jsonb_build_object('outcome', 'applied');
EXCEPTION
  WHEN unique_violation THEN
    IF EXISTS (
      SELECT 1 FROM public.invoice_payments
      WHERE external_payment_id = p_payment_intent_id
    ) THEN
      RETURN jsonb_build_object('outcome', 'already_applied');
    END IF;
    RETURN jsonb_build_object('outcome', 'already_flagged', 'reason', 'duplicate');
END;
$$;

REVOKE ALL ON FUNCTION public.record_succeeded_stripe_payment(uuid, text, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_succeeded_stripe_payment(uuid, text, numeric, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_succeeded_stripe_payment(uuid, text, numeric, text, text) TO service_role;
