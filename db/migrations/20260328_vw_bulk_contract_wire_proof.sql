-- Bulk virtual-warehouse purchase: optional declared contract sq cm; wire proof attachments

ALTER TABLE IF EXISTS orders
  ADD COLUMN IF NOT EXISTS bulk_contract_sqcm numeric(14, 4);

COMMENT ON COLUMN orders.bulk_contract_sqcm IS 'Customer-declared total sq cm for bulk purchase (aligns with line totals when VW split is used).';

ALTER TABLE IF EXISTS invoice_payment_submissions
  ADD COLUMN IF NOT EXISTS proof_bucket text,
  ADD COLUMN IF NOT EXISTS proof_path text;

COMMENT ON COLUMN invoice_payment_submissions.proof_bucket IS 'Storage bucket for optional wire proof upload';
COMMENT ON COLUMN invoice_payment_submissions.proof_path IS 'Object path for optional wire proof upload';
