-- Allow wire submissions awaiting proof review to be distinguished from other pending states.
ALTER TABLE invoice_payment_submissions
  DROP CONSTRAINT IF EXISTS invoice_payment_submissions_status_check;

ALTER TABLE invoice_payment_submissions
  ADD CONSTRAINT invoice_payment_submissions_status_check
  CHECK (status IN ('PENDING', 'WIRE_PENDING', 'VERIFIED', 'REJECTED'));
