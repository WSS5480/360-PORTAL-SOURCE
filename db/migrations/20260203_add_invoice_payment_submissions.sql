CREATE TABLE IF NOT EXISTS invoice_payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  account_id uuid NOT NULL,
  method text NOT NULL CHECK (method IN ('WIRE', 'STRIPE')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  reference text,
  sent_at timestamptz,
  note text,
  created_by_user_id uuid,
  verified_by_user_id uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payment_submissions_invoice_id
  ON invoice_payment_submissions(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_payment_submissions_account_id
  ON invoice_payment_submissions(account_id);

CREATE INDEX IF NOT EXISTS idx_invoice_payment_submissions_status
  ON invoice_payment_submissions(status);
