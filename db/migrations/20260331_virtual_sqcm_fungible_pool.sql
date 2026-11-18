-- Fungible virtual warehouse sq cm: one balance per account (any bulk-enabled SKU can draw from it).

ALTER TABLE public.account_pricing
  ADD COLUMN IF NOT EXISTS virtual_sqcm_balance numeric(20, 4) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.account_pricing.virtual_sqcm_balance IS
  'Fungible sq cm balance for virtual warehouse (credits on paid invoices; debits on VW shipment).';

-- Backfill from legacy per-variant inventory × sq cm per unit
UPDATE public.account_pricing ap
SET virtual_sqcm_balance = COALESCE(
  (
    SELECT SUM(
      avi.quantity::numeric
      * GREATEST(
        COALESCE(NULLIF(pv.total_sqcm, 0), 0)::numeric,
        CASE
          WHEN COALESCE(pv.width_cm, 0) > 0 AND COALESCE(pv.length_cm, 0) > 0 THEN (pv.width_cm * pv.length_cm)::numeric
          ELSE 0::numeric
        END
      )
    )
    FROM public.account_virtual_inventory avi
    JOIN public.product_variants pv ON pv.id = avi.product_variant_id
    WHERE avi.account_id = ap.account_id
  ),
  0
);

CREATE OR REPLACE FUNCTION public.increment_virtual_sqcm_balance(p_account_id uuid, p_delta numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RETURN;
  END IF;
  UPDATE public.account_pricing
  SET virtual_sqcm_balance = COALESCE(virtual_sqcm_balance, 0) + p_delta
  WHERE account_id = p_account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_subtract_virtual_sqcm_balance(p_account_id uuid, p_delta numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RETURN true;
  END IF;
  UPDATE public.account_pricing
  SET virtual_sqcm_balance = virtual_sqcm_balance - p_delta
  WHERE account_id = p_account_id
    AND COALESCE(virtual_sqcm_balance, 0) >= p_delta - 0.0001;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$$;
