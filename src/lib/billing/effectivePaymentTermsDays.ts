import { BULK_VW_PAYMENT_TERMS_DAYS, BULK_VW_PAYMENT_TERMS_LABEL } from "@/lib/billing/bulkPaymentTerms";

export type EffectivePaymentTermsDaysArgs = {
  bulk_mode?: boolean | null;
  payment_terms_days_snapshot?: number | null;
  payment_terms_label_snapshot?: string | null;
  /** account_pricing.payment_terms_days */
  account_payment_terms_days?: number | null;
};

/**
 * Resolves how many days to add from the invoice/ship anchor for due-date math.
 * "Net 1 (due before shipment)" only applies to true VW bulk deposit orders; if that
 * snapshot leaks onto a normal order, we fall back to account terms so overdue KPIs
 * stay correct.
 */
export function effectivePaymentTermsDays(a: EffectivePaymentTermsDaysArgs): number {
  const acctRaw = Number(a.account_payment_terms_days);
  const acctDays = Number.isFinite(acctRaw) && acctRaw > 0 ? Math.floor(acctRaw) : 30;
  const snap = Number(a.payment_terms_days_snapshot);
  const label = String(a.payment_terms_label_snapshot ?? "").trim();
  const bulk = !!a.bulk_mode;

  const isVwNet1 =
    bulk &&
    Number.isFinite(snap) &&
    snap === BULK_VW_PAYMENT_TERMS_DAYS &&
    label === BULK_VW_PAYMENT_TERMS_LABEL;

  if (isVwNet1) return BULK_VW_PAYMENT_TERMS_DAYS;

  if (!bulk && Number.isFinite(snap) && snap === BULK_VW_PAYMENT_TERMS_DAYS) {
    return acctDays;
  }

  if (
    Number.isFinite(snap) &&
    snap === BULK_VW_PAYMENT_TERMS_DAYS &&
    label !== BULK_VW_PAYMENT_TERMS_LABEL
  ) {
    return acctDays;
  }

  if (Number.isFinite(snap) && snap > 0) return Math.floor(snap);

  return acctDays;
}
