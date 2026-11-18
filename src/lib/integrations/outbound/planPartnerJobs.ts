import { FULFILLMENT_CALLBACK_ADAPTER } from "@/lib/integrations/outbound/types";
import { planInvoice } from "@/lib/integrations/outbound/invoiceReadiness";
import { planPaymentJobs } from "@/lib/integrations/outbound/paymentPlan";
import { PAYMENT_LINK_SYNC_ENABLED, PAYMENT_RECEIPT_SYNC_ENABLED } from "@/lib/integrations/outbound/paymentSyncDesign";
import { planShipments } from "@/lib/integrations/outbound/shipmentPlan";
import type { FulfillmentSnapshot, PlannedJob } from "@/lib/integrations/outbound/types";

export function planPartnerJobs(snapshot: FulfillmentSnapshot): PlannedJob[] {
  const jobs: PlannedJob[] = [];
  const invoice = planInvoice(snapshot);
  if (invoice.action !== "none" && snapshot.primaryInvoice) {
    jobs.push({
      partnerId: snapshot.partnerId,
      orderId: snapshot.orderId,
      externalOrderNumber: snapshot.externalOrderNumber,
      eventType: "invoice",
      businessKey: `invoice:${snapshot.primaryInvoice.id}`,
      status: invoice.action === "block" ? "blocked" : "pending",
      blockedReason: invoice.action === "block" ? invoice.reason : null,
      waitReason: invoice.action === "wait" ? invoice.reason : null,
      payload: invoice.payload,
    });
  }

  if (PAYMENT_LINK_SYNC_ENABLED || PAYMENT_RECEIPT_SYNC_ENABLED) {
    for (const paymentJob of planPaymentJobs(snapshot)) {
      if (paymentJob.eventType === "payment-link" && !PAYMENT_LINK_SYNC_ENABLED) continue;
      if (paymentJob.eventType === "payment" && !PAYMENT_RECEIPT_SYNC_ENABLED) continue;
      jobs.push(paymentJob);
    }
  }

  for (const shipment of planShipments(snapshot)) {
    jobs.push({
      partnerId: snapshot.partnerId,
      orderId: snapshot.orderId,
      externalOrderNumber: snapshot.externalOrderNumber,
      eventType: "shipment",
      businessKey: shipment.businessKey,
      status: shipment.status,
      blockedReason: shipment.blockedReason,
      waitReason: null,
      payload: shipment.payload,
    });
  }

  return jobs;
}

export function adapterSupported(adapterCode: string): boolean {
  return adapterCode === FULFILLMENT_CALLBACK_ADAPTER;
}
