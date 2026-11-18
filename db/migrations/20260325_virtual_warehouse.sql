-- Virtual warehouse: account flag, per-line qty on bulk orders, balances, idempotent credit ledger, $0 ship orders

ALTER TABLE IF EXISTS account_pricing
  ADD COLUMN IF NOT EXISTS virtual_warehouse_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS orders
  ADD COLUMN IF NOT EXISTS virtual_warehouse_shipment boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS order_items
  ADD COLUMN IF NOT EXISTS virtual_warehouse_qty integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN order_items.virtual_warehouse_qty IS 'Units allocated to virtual warehouse (bulk paid orders); ship-now = quantity - virtual_warehouse_qty';

CREATE TABLE IF NOT EXISTS account_virtual_inventory (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  product_variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, product_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_account_virtual_inventory_account
  ON account_virtual_inventory(account_id);

COMMENT ON TABLE account_virtual_inventory IS 'Per-account virtual warehouse balances (credited when invoice paid; debited when VW shipment ships)';

CREATE TABLE IF NOT EXISTS virtual_warehouse_credit_events (
  invoice_id uuid NOT NULL PRIMARY KEY REFERENCES invoices(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE virtual_warehouse_credit_events IS 'Ensures VW inventory is credited once per paid invoice';

ALTER TABLE account_virtual_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_warehouse_credit_events ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; no policies for anon/authenticated (aligned with internal tables)

-- delete_account: clear virtual inventory (credit_events CASCADE when invoices deleted)
CREATE OR REPLACE FUNCTION private.delete_account(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_order_ids FROM orders WHERE account_id = p_account_id;

  IF v_order_ids IS NOT NULL AND array_length(v_order_ids, 1) > 0 THEN
    DELETE FROM fulfillment_item_trace WHERE fulfillment_id IN (SELECT id FROM fulfillments WHERE order_id = ANY(v_order_ids));
    DELETE FROM fulfillment_picks WHERE fulfillment_id IN (SELECT id FROM fulfillments WHERE order_id = ANY(v_order_ids));
    DELETE FROM fulfillment_items WHERE fulfillment_id IN (SELECT id FROM fulfillments WHERE order_id = ANY(v_order_ids));
    DELETE FROM fulfillment_files WHERE fulfillment_id IN (SELECT id FROM fulfillments WHERE order_id = ANY(v_order_ids));
    DELETE FROM fulfillments WHERE order_id = ANY(v_order_ids);
  END IF;

  IF v_order_ids IS NOT NULL AND array_length(v_order_ids, 1) > 0 THEN
    DELETE FROM order_audit_log WHERE order_id = ANY(v_order_ids);
    DELETE FROM order_status_events WHERE order_id = ANY(v_order_ids);
    DELETE FROM order_items WHERE order_id = ANY(v_order_ids);
  END IF;

  DELETE FROM orders WHERE account_id = p_account_id;

  DELETE FROM invoices WHERE account_id = p_account_id;

  DELETE FROM ivr_email_outbox WHERE ivr_id IN (SELECT id FROM ivr_requests WHERE account_id = p_account_id);
  DELETE FROM ivr_files WHERE ivr_id IN (SELECT id FROM ivr_requests WHERE account_id = p_account_id);
  DELETE FROM ivr_insurance_verifications WHERE ivr_id IN (SELECT id FROM ivr_requests WHERE account_id = p_account_id);
  DELETE FROM ivr_audit_log WHERE ivr_id IN (SELECT id FROM ivr_requests WHERE account_id = p_account_id);
  DELETE FROM ivr_requests WHERE account_id = p_account_id;

  DELETE FROM documents_folder_accounts WHERE account_id = p_account_id;
  DELETE FROM documents_files WHERE folder_id IN (SELECT id FROM documents_folders WHERE account_id = p_account_id);
  DELETE FROM documents_folders WHERE account_id = p_account_id;

  DELETE FROM account_virtual_inventory WHERE account_id = p_account_id;

  DELETE FROM account_invites WHERE account_id = p_account_id;
  DELETE FROM account_contacts WHERE account_id = p_account_id;
  DELETE FROM account_addresses WHERE account_id = p_account_id;
  DELETE FROM account_provider_profiles WHERE account_id = p_account_id;
  DELETE FROM account_users WHERE account_id = p_account_id;
  DELETE FROM account_pricing WHERE account_id = p_account_id;

  DELETE FROM accounts WHERE id = p_account_id;
END;
$$;
