/** One main invoice per order (bulk, products, etc.). */
export const INVOICE_KIND_PRIMARY = "PRIMARY" as const;

/** Additional shipping-only invoice; does not replace or alter the primary paid invoice. */
export const INVOICE_KIND_SHIPPING_SUPPLEMENT = "SHIPPING_SUPPLEMENT" as const;

export type InvoiceKind = typeof INVOICE_KIND_PRIMARY | typeof INVOICE_KIND_SHIPPING_SUPPLEMENT;

export function normalizeInvoiceKind(v: unknown): InvoiceKind {
  const s = String(v ?? "").toUpperCase();
  if (s === INVOICE_KIND_SHIPPING_SUPPLEMENT) return INVOICE_KIND_SHIPPING_SUPPLEMENT;
  return INVOICE_KIND_PRIMARY;
}
