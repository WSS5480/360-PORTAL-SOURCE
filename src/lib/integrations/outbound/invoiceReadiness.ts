import { totalsDiffer } from "@/lib/integrations/outbound/payload";
import type { CallbackPayload, FulfillmentSnapshot } from "@/lib/integrations/outbound/types";

export type InvoicePlan =
  | { action: "none" }
  | { action: "wait"; reason: string; payload: CallbackPayload }
  | { action: "block"; reason: string; payload: CallbackPayload }
  | { action: "send"; payload: CallbackPayload };

function invoicePayload(snapshot: FulfillmentSnapshot, total: number): CallbackPayload {
  const invoice = snapshot.primaryInvoice;
  const payload: CallbackPayload = {
    invoice_number: invoice?.invoiceNumber || "",
    final_total: Math.round(total * 100) / 100,
  };
  if (invoice?.issuedAt) payload.invoiced_at = invoice.issuedAt;
  return payload;
}

/**
 * An invoice is sent only when its total already includes final freight.
 * A later shipping supplement, or a total that still disagrees with the order,
 * is blocked so the partner is not given a total it will refuse to change.
 */
export function planInvoice(snapshot: FulfillmentSnapshot): InvoicePlan {
  const status = snapshot.orderStatus.toUpperCase();
  const invoice = snapshot.primaryInvoice;
  if (!invoice) return { action: "none" };

  const payload = invoicePayload(snapshot, invoice.total);
  if (status === "CANCELLED" || status === "DENIED") {
    return { action: "block", reason: "order_not_invoiceable", payload };
  }
  if (invoice.voided || !invoice.issuedAt || invoice.status.toUpperCase() === "DRAFT" || !invoice.invoiceNumber) {
    return { action: "wait", reason: "invoice_not_final", payload };
  }
  if (snapshot.openFulfillmentCount > 0) {
    return { action: "wait", reason: "freight_not_final", payload };
  }
  if (snapshot.shippingSupplementCount > 0) {
    return { action: "block", reason: "shipping_supplement_not_supported", payload };
  }
  if (snapshot.bulkMode && snapshot.orderShippingTotal > 0 && totalsDiffer(invoice.total, snapshot.orderTotal)) {
    return { action: "block", reason: "shipping_supplement_would_change_final_total", payload };
  }
  if (totalsDiffer(invoice.total, snapshot.orderTotal)) {
    return { action: "block", reason: "invoice_total_excludes_final_freight", payload };
  }
  return { action: "send", payload: invoicePayload(snapshot, snapshot.orderTotal) };
}
