-- Allow multiple invoices per order: one PRIMARY (bulk/product) plus optional SHIPPING_SUPPLEMENT
-- after the primary is paid (e.g. bulk + ship-now with fulfillment shipping billed separately).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_kind text NOT NULL DEFAULT 'PRIMARY';

UPDATE invoices SET invoice_kind = 'PRIMARY' WHERE invoice_kind IS NULL OR invoice_kind = '';

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_invoice_kind_check;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_invoice_kind_check
  CHECK (invoice_kind IN ('PRIMARY', 'SHIPPING_SUPPLEMENT'));

COMMENT ON COLUMN invoices.invoice_kind IS 'PRIMARY: main order invoice; SHIPPING_SUPPLEMENT: additional shipping-only invoice (does not replace primary).';

-- Drop legacy one-invoice-per-order uniqueness (name may vary by environment).
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_order_id_key;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_order_id_unique;

DROP INDEX IF EXISTS invoices_order_id_key;
DROP INDEX IF EXISTS invoices_order_id_unique;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_one_primary_per_order
  ON invoices (order_id)
  WHERE invoice_kind = 'PRIMARY';

-- Speed lookups by order + kind
CREATE INDEX IF NOT EXISTS idx_invoices_order_kind
  ON invoices (order_id, invoice_kind);
