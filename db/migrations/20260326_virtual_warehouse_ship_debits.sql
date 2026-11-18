-- Idempotent debit when a virtual-warehouse shipment fulfillment ships (one row per fulfillment)
CREATE TABLE IF NOT EXISTS virtual_warehouse_ship_debits (
  fulfillment_id uuid NOT NULL PRIMARY KEY REFERENCES fulfillments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE virtual_warehouse_ship_debits IS 'Ensures VW balances are debited once per shipped fulfillment for VW shipment orders';

ALTER TABLE virtual_warehouse_ship_debits ENABLE ROW LEVEL SECURITY;
