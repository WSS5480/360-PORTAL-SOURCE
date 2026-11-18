-- Universal partner integration foundation.
-- Inbound credentials are stored as SHA-256 hashes. Outbound secrets, when present,
-- are ciphertext only. Production credentials cannot be activated.
-- Partner API routes use the service role and enforce partner_id on every read.

CREATE TABLE IF NOT EXISTS public.integration_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  environment text NOT NULL,
  status text NOT NULL DEFAULT 'inactive',
  callback_base_url text,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_partners_code_chk CHECK (code ~ '^[a-z0-9][a-z0-9-]{1,48}$'),
  CONSTRAINT integration_partners_environment_chk CHECK (environment IN ('sandbox', 'production')),
  CONSTRAINT integration_partners_status_chk CHECK (status IN ('inactive', 'active', 'disabled')),
  CONSTRAINT integration_partners_code_environment_uidx UNIQUE (code, environment)
);

CREATE TABLE IF NOT EXISTS public.integration_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.integration_partners (id) ON DELETE CASCADE,
  direction text NOT NULL,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text,
  secret_ciphertext text,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  active boolean NOT NULL DEFAULT false,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_credentials_direction_chk CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT integration_credentials_name_chk CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT integration_credentials_prefix_chk CHECK (char_length(key_prefix) BETWEEN 6 AND 24),
  CONSTRAINT integration_credentials_secret_shape_chk CHECK (
    (direction = 'inbound' AND key_hash IS NOT NULL AND secret_ciphertext IS NULL)
    OR
    (direction = 'outbound' AND secret_ciphertext IS NOT NULL AND key_hash IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_credentials_key_hash_uidx
  ON public.integration_credentials (key_hash)
  WHERE key_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS integration_credentials_partner_idx
  ON public.integration_credentials (partner_id, direction, active);

CREATE TABLE IF NOT EXISTS public.integration_partner_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.integration_partners (id) ON DELETE CASCADE,
  partner_account_ref text NOT NULL,
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_partner_accounts_ref_chk CHECK (
    char_length(btrim(partner_account_ref)) BETWEEN 1 AND 128
  ),
  CONSTRAINT integration_partner_accounts_partner_ref_uidx UNIQUE (partner_id, partner_account_ref)
);

CREATE INDEX IF NOT EXISTS integration_partner_accounts_account_idx
  ON public.integration_partner_accounts (account_id);

CREATE TABLE IF NOT EXISTS public.integration_partner_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.integration_partners (id) ON DELETE RESTRICT,
  external_order_number text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  order_id uuid REFERENCES public.orders (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_partner_orders_number_chk CHECK (
    char_length(btrim(external_order_number)) BETWEEN 1 AND 64
  ),
  CONSTRAINT integration_partner_orders_key_chk CHECK (
    char_length(btrim(idempotency_key)) BETWEEN 1 AND 128
  ),
  CONSTRAINT integration_partner_orders_hash_chk CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT integration_partner_orders_partner_number_uidx UNIQUE (partner_id, external_order_number),
  CONSTRAINT integration_partner_orders_partner_key_uidx UNIQUE (partner_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_partner_orders_order_id_uidx
  ON public.integration_partner_orders (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS integration_partner_orders_partner_created_idx
  ON public.integration_partner_orders (partner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.integration_inbound_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  partner_id uuid REFERENCES public.integration_partners (id) ON DELETE SET NULL,
  method text NOT NULL,
  path text NOT NULL,
  http_status integer,
  error_code text,
  request_hash text,
  external_order_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_inbound_requests_request_id_uidx UNIQUE (request_id),
  CONSTRAINT integration_inbound_requests_method_chk CHECK (method IN ('GET', 'POST')),
  CONSTRAINT integration_inbound_requests_status_chk CHECK (http_status IS NULL OR (http_status BETWEEN 100 AND 599))
);

CREATE INDEX IF NOT EXISTS integration_inbound_requests_partner_created_idx
  ON public.integration_inbound_requests (partner_id, created_at DESC);

COMMENT ON TABLE public.integration_partners IS
  'External ordering partners. One row per organization and environment.';
COMMENT ON COLUMN public.integration_credentials.key_hash IS
  'SHA-256 hex of an inbound bearer token. The plaintext token is never stored.';
COMMENT ON COLUMN public.integration_credentials.secret_ciphertext IS
  'Encrypted outbound bearer token. Not used by order intake.';
COMMENT ON COLUMN public.integration_partner_orders.external_order_number IS
  'Immutable partner order number. Distinct from orders.order_number.';
COMMENT ON TABLE public.integration_inbound_requests IS
  'Redacted inbound API activity. No authorization headers, tokens, or raw bodies.';

-- Block activation of any credential whose partner environment is production.
CREATE OR REPLACE FUNCTION public.integration_credentials_reject_production_activation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.active IS TRUE AND NEW.revoked_at IS NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.integration_partners p
      WHERE p.id = NEW.partner_id
        AND p.environment = 'production'
    ) THEN
      RAISE EXCEPTION 'production integration credentials cannot be activated'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS integration_credentials_reject_production_activation
  ON public.integration_credentials;

CREATE TRIGGER integration_credentials_reject_production_activation
  BEFORE INSERT OR UPDATE OF active, revoked_at, partner_id
  ON public.integration_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.integration_credentials_reject_production_activation();

-- Moving a partner to production must not leave an active credential behind.
CREATE OR REPLACE FUNCTION public.integration_partners_reject_production_with_active_keys()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.environment = 'production' AND EXISTS (
    SELECT 1
    FROM public.integration_credentials c
    WHERE c.partner_id = NEW.id
      AND c.active IS TRUE
      AND c.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'production integration credentials cannot be activated'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS integration_partners_reject_production_with_active_keys
  ON public.integration_partners;

CREATE TRIGGER integration_partners_reject_production_with_active_keys
  BEFORE UPDATE OF environment
  ON public.integration_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.integration_partners_reject_production_with_active_keys();

-- Atomic claim + order insert. The second concurrent transaction waits on the
-- partner/order-number row, then replays or conflicts. It does not insert a second order.
CREATE OR REPLACE FUNCTION public.integration_submit_priced_order(
  p_partner_id uuid,
  p_external_order_number text,
  p_idempotency_key text,
  p_request_hash text,
  p_order jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_claim_id uuid;
  v_existing public.integration_partner_orders%ROWTYPE;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_status_type text;
  v_priority_type text;
BEGIN
  IF p_partner_id IS NULL OR p_external_order_number IS NULL OR p_request_hash IS NULL THEN
    RAISE EXCEPTION 'partner order submission is incomplete'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Serialize claims for the same partner number and idempotency key.
  -- Two unique indexes otherwise deadlock when concurrent inserts speculate on both.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_partner_id::text),
    hashtext('partner-order:' || least(p_external_order_number, p_idempotency_key))
  );
  IF p_external_order_number IS DISTINCT FROM p_idempotency_key THEN
    PERFORM pg_advisory_xact_lock(
      hashtext(p_partner_id::text),
      hashtext('partner-order:' || greatest(p_external_order_number, p_idempotency_key))
    );
  END IF;

  INSERT INTO public.integration_partner_orders (
    partner_id,
    external_order_number,
    idempotency_key,
    request_hash
  ) VALUES (
    p_partner_id,
    p_external_order_number,
    p_idempotency_key,
    p_request_hash
  )
  ON CONFLICT (partner_id, external_order_number) DO NOTHING
  RETURNING id INTO v_claim_id;

  IF v_claim_id IS NULL THEN
    SELECT *
      INTO v_existing
    FROM public.integration_partner_orders
    WHERE partner_id = p_partner_id
      AND external_order_number = p_external_order_number
    FOR UPDATE;

    IF NOT FOUND THEN
      SELECT *
        INTO v_existing
      FROM public.integration_partner_orders
      WHERE partner_id = p_partner_id
        AND idempotency_key = p_idempotency_key
      FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'partner order claim could not be resolved';
    END IF;

    IF v_existing.request_hash IS DISTINCT FROM p_request_hash
      OR v_existing.external_order_number IS DISTINCT FROM p_external_order_number
      OR v_existing.idempotency_key IS DISTINCT FROM p_idempotency_key THEN
      RETURN jsonb_build_object(
        'result', 'conflict',
        'order_id', v_existing.order_id
      );
    END IF;

    IF v_existing.order_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'result', 'replay',
        'order_id', v_existing.order_id
      );
    END IF;

    v_claim_id := v_existing.id;
  END IF;

  SELECT pg_catalog.format_type(a.atttypid, a.atttypmod)
    INTO v_status_type
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'orders'
    AND a.attname = 'status'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  SELECT pg_catalog.format_type(a.atttypid, a.atttypmod)
    INTO v_priority_type
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'orders'
    AND a.attname = 'shipping_priority'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF v_status_type IS NULL OR v_priority_type IS NULL THEN
    RAISE EXCEPTION 'orders status or shipping_priority column was not found'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_status_type !~ '^[a-zA-Z0-9_." (),]+$' OR v_priority_type !~ '^[a-zA-Z0-9_." (),]+$' THEN
    RAISE EXCEPTION 'unexpected orders column type'
      USING ERRCODE = 'check_violation';
  END IF;

  v_order_id := gen_random_uuid();
  v_order_number := p_order->>'order_number';

  EXECUTE format(
    'INSERT INTO public.orders (
      id, account_id, order_number, status, created_by_user_id,
      shipping_priority, shipping_eta_days,
      bulk_mode, bulk_contract_sqcm, total_sqcm,
      discount_percent_snapshot, bulk_price_per_sqcm_snapshot,
      payment_terms_label_snapshot, payment_terms_days_snapshot,
      invoice_address, delivery_address,
      subtotal, shipping_total, total, placed_at
    ) VALUES (
      $1, $2, $3, $4::%s, $5,
      $6::%s, $7,
      $8, $9, $10,
      $11, $12,
      $13, $14,
      $15, $16,
      $17, $18, $19, $20
    )',
    v_status_type,
    v_priority_type
  )
  USING
    v_order_id,
    (p_order->>'account_id')::uuid,
    v_order_number,
    COALESCE(p_order->>'status', 'CONFIRMED'),
    NULLIF(p_order->>'created_by_user_id', '')::uuid,
    COALESCE(p_order->>'shipping_priority', 'GROUND'),
    COALESCE((p_order->>'shipping_eta_days')::int, 3),
    COALESCE((p_order->>'bulk_mode')::boolean, false),
    NULLIF(p_order->>'bulk_contract_sqcm', '')::numeric,
    NULLIF(p_order->>'total_sqcm', '')::numeric,
    COALESCE((p_order->>'discount_percent_snapshot')::numeric, 0),
    NULLIF(p_order->>'bulk_price_per_sqcm_snapshot', '')::numeric,
    NULLIF(p_order->>'payment_terms_label_snapshot', ''),
    NULLIF(p_order->>'payment_terms_days_snapshot', '')::int,
    p_order->'invoice_address',
    p_order->'delivery_address',
    COALESCE((p_order->>'subtotal')::numeric, 0),
    COALESCE((p_order->>'shipping_total')::numeric, 0),
    COALESCE((p_order->>'total')::numeric, 0),
    COALESCE(NULLIF(p_order->>'placed_at', '')::timestamptz, now());

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    INSERT INTO public.order_items (
      order_id,
      sort_order,
      product_variant_id,
      description,
      quantity,
      uom,
      unit_price,
      discount_percent,
      line_total,
      line_type,
      virtual_warehouse_qty
    ) VALUES (
      v_order_id,
      COALESCE((v_item->>'sort_order')::int, 0),
      (v_item->>'product_variant_id')::uuid,
      COALESCE(v_item->>'description', 'Product'),
      (v_item->>'quantity')::numeric,
      COALESCE(NULLIF(v_item->>'uom', ''), 'Units'),
      COALESCE((v_item->>'unit_price')::numeric, 0),
      COALESCE((v_item->>'discount_percent')::numeric, 0),
      COALESCE((v_item->>'line_total')::numeric, 0),
      COALESCE(NULLIF(v_item->>'line_type', ''), 'PRODUCT'),
      COALESCE((v_item->>'virtual_warehouse_qty')::int, 0)
    );
  END LOOP;

  INSERT INTO public.order_status_events (
    order_id, from_status, to_status, changed_by_user_id, comment
  ) VALUES (
    v_order_id,
    NULL,
    COALESCE(p_order->>'status', 'CONFIRMED'),
    NULLIF(p_order->>'created_by_user_id', '')::uuid,
    'Created by partner integration'
  );

  INSERT INTO public.audit_events (
    account_id, actor_user_id, action, resource_type, resource_id, metadata
  ) VALUES (
    (p_order->>'account_id')::uuid,
    NULLIF(p_order->>'created_by_user_id', '')::uuid,
    'ORDER_CREATED',
    'order',
    v_order_id,
    jsonb_build_object(
      'order_number', v_order_number,
      'partner_id', p_partner_id,
      'external_order_number', p_external_order_number,
      'source', 'partner_api',
      'item_count', COALESCE(jsonb_array_length(p_items), 0),
      'contact', p_order->'contact'
    )
  );

  UPDATE public.integration_partner_orders
  SET order_id = v_order_id
  WHERE id = v_claim_id
    AND partner_id = p_partner_id
    AND order_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'partner order claim was already completed';
  END IF;

  RETURN jsonb_build_object(
    'result', 'created',
    'order_id', v_order_id,
    'order_number', v_order_number
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_existing
    FROM public.integration_partner_orders
    WHERE partner_id = p_partner_id
      AND (
        external_order_number = p_external_order_number
        OR idempotency_key = p_idempotency_key
      )
    ORDER BY created_at
    LIMIT 1;

    IF FOUND
      AND v_existing.request_hash = p_request_hash
      AND v_existing.external_order_number = p_external_order_number
      AND v_existing.idempotency_key = p_idempotency_key
      AND v_existing.order_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'result', 'replay',
        'order_id', v_existing.order_id
      );
    END IF;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'result', 'conflict',
        'order_id', v_existing.order_id
      );
    END IF;

    RAISE;
END;
$$;

COMMENT ON FUNCTION public.integration_submit_priced_order IS
  'Claims a partner order number and inserts the priced 360 order in one transaction.';

REVOKE ALL ON FUNCTION public.integration_submit_priced_order(
  uuid, text, text, text, jsonb, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.integration_submit_priced_order(
  uuid, text, text, text, jsonb, jsonb
) TO service_role;

REVOKE ALL ON FUNCTION public.integration_credentials_reject_production_activation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.integration_partners_reject_production_with_active_keys() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.integration_credentials_reject_production_activation() TO service_role;
GRANT EXECUTE ON FUNCTION public.integration_partners_reject_production_with_active_keys() TO service_role;

ALTER TABLE public.integration_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_partner_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_partner_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_inbound_requests ENABLE ROW LEVEL SECURITY;

-- No policies: anon and authenticated have no access. The service role bypasses RLS.
REVOKE ALL ON TABLE public.integration_partners FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.integration_credentials FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.integration_partner_accounts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.integration_partner_orders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.integration_inbound_requests FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_partners TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_credentials TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_partner_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_partner_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_inbound_requests TO service_role;
