-- Demo ordering accounts: full portal + admin fulfill walkthrough without inventory, VW, or email side effects.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_accounts_is_demo
  ON public.accounts (is_demo)
  WHERE is_demo = true;

COMMENT ON COLUMN public.accounts.is_demo IS
  'When true, order confirm/lock/fulfill skip real inventory, virtual warehouse debits, and customer emails.';
