-- Partner account provisioning and verified product mappings.
-- Apply only to the local database from the test runner. Do not apply this to production from here.

ALTER TABLE public.integration_partners
  ADD COLUMN IF NOT EXISTS auto_create_accounts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_direct_sku_match boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approved_discount_percent numeric,
  ADD COLUMN IF NOT EXISTS approved_payment_terms_label text,
  ADD COLUMN IF NOT EXISTS approved_payment_terms_days integer;

ALTER TABLE public.integration_partner_accounts
  ADD COLUMN IF NOT EXISTS customer_name text;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS manufacturer text;

CREATE TABLE IF NOT EXISTS public.integration_partner_product_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.integration_partners (id) ON DELETE CASCADE,
  external_sku text NOT NULL,
  product_variant_id uuid NOT NULL REFERENCES public.product_variants (id) ON DELETE RESTRICT,
  partner_product_name text,
  status text NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  verified_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_partner_product_maps_sku_chk CHECK (char_length(btrim(external_sku)) BETWEEN 1 AND 80),
  CONSTRAINT integration_partner_product_maps_status_chk CHECK (status IN ('pending', 'verified', 'disabled')),
  CONSTRAINT integration_partner_product_maps_partner_sku_uidx UNIQUE (partner_id, external_sku)
);

CREATE INDEX IF NOT EXISTS integration_partner_product_maps_variant_idx
  ON public.integration_partner_product_maps (product_variant_id);

CREATE TABLE IF NOT EXISTS public.integration_partner_order_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.integration_partners (id) ON DELETE CASCADE,
  external_order_number text,
  partner_account_ref text,
  error_code text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_partner_order_issues_partner_idx
  ON public.integration_partner_order_issues (partner_id, created_at DESC);

ALTER TABLE public.integration_partner_product_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_partner_order_issues ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.integration_partner_product_maps FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.integration_partner_order_issues FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_partner_product_maps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integration_partner_order_issues TO service_role;

COMMENT ON TABLE public.integration_partner_product_maps IS
  'Verified partner SKU to internal variant. Historical order lines keep the variant id stored on the order.';
COMMENT ON TABLE public.integration_partner_order_issues IS
  'Rejected partner submissions that an administrator needs to see. No portal users are created from these rows.';

CREATE OR REPLACE FUNCTION public.integration_ensure_partner_account(
  p_partner_id uuid,
  p_partner_account_ref text,
  p_customer_name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_auto boolean;
  v_discount numeric;
  v_terms_days integer;
  v_terms_label text;
  v_name text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_partner_id::text), hashtext('partner-account:' || p_partner_account_ref));

  SELECT account_id INTO v_account_id
  FROM public.integration_partner_accounts
  WHERE partner_id = p_partner_id
    AND partner_account_ref = p_partner_account_ref;

  IF v_account_id IS NOT NULL THEN
    RETURN jsonb_build_object('result', 'existing', 'account_id', v_account_id);
  END IF;

  SELECT auto_create_accounts, approved_discount_percent, approved_payment_terms_days, approved_payment_terms_label
    INTO v_auto, v_discount, v_terms_days, v_terms_label
  FROM public.integration_partners
  WHERE id = p_partner_id;

  IF NOT FOUND OR v_auto IS NOT TRUE THEN
    RETURN jsonb_build_object('result', 'unknown_account');
  END IF;

  v_name := btrim(COALESCE(p_customer_name, ''));
  IF v_name = '' THEN
    RETURN jsonb_build_object('result', 'customer_name_required');
  END IF;

  IF v_discount IS NULL OR v_terms_days IS NULL THEN
    RETURN jsonb_build_object('result', 'pricing_not_approved');
  END IF;

  INSERT INTO public.accounts (name)
  VALUES (v_name)
  RETURNING id INTO v_account_id;

  INSERT INTO public.account_pricing (account_id, discount_percent, payment_terms_label, payment_terms_days)
  VALUES (
    v_account_id,
    v_discount,
    COALESCE(NULLIF(btrim(v_terms_label), ''), 'Net ' || v_terms_days::text || ' (after delivery)'),
    v_terms_days
  );

  INSERT INTO public.integration_partner_accounts (partner_id, partner_account_ref, account_id, customer_name)
  VALUES (p_partner_id, p_partner_account_ref, v_account_id, v_name);

  RETURN jsonb_build_object('result', 'created', 'account_id', v_account_id);
EXCEPTION
  WHEN unique_violation THEN
    SELECT account_id INTO v_account_id
    FROM public.integration_partner_accounts
    WHERE partner_id = p_partner_id
      AND partner_account_ref = p_partner_account_ref;
    IF v_account_id IS NOT NULL THEN
      RETURN jsonb_build_object('result', 'existing', 'account_id', v_account_id);
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.integration_ensure_partner_account(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_ensure_partner_account(uuid, text, text) TO service_role;
