-- Repair orders where payment_terms_days_snapshot = 1 (VW bulk "Net 1") incorrectly
-- landed on non-bulk portal orders. Re-align from account_pricing so snapshots match
-- the account's net terms (e.g. Net 30 after delivery).

UPDATE orders o
SET
  payment_terms_days_snapshot = COALESCE(NULLIF(ap.payment_terms_days, 0), 30),
  payment_terms_label_snapshot = COALESCE(
    NULLIF(TRIM(ap.payment_terms_label), ''),
    'Net ' || COALESCE(NULLIF(ap.payment_terms_days, 0), 30)::text || ' (after delivery)'
  )
FROM account_pricing ap
WHERE o.account_id = ap.account_id
  AND COALESCE(o.bulk_mode, false) = false
  AND o.payment_terms_days_snapshot = 1;
