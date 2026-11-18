-- Stripe Customer id for saved payment methods (cards on file) per portal account.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

COMMENT ON COLUMN public.accounts.stripe_customer_id IS
  'Stripe Customer id (cus_...) for saved payment methods on this account.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_stripe_customer_id
  ON public.accounts (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
