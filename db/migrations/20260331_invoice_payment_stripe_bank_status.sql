-- Stripe bank (ACH) submissions: mirror PaymentIntent status and distinguish bank-pending vs card-pending.
ALTER TABLE invoice_payment_submissions
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_status text;

ALTER TABLE invoice_payment_submissions
  DROP CONSTRAINT IF EXISTS invoice_payment_submissions_status_check;

ALTER TABLE invoice_payment_submissions
  ADD CONSTRAINT invoice_payment_submissions_status_check
  CHECK (status IN ('PENDING', 'WIRE_PENDING', 'PENDING_BANK', 'VERIFIED', 'REJECTED'));
