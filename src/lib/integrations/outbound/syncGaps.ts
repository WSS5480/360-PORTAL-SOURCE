export type SyncGapJob = {
  eventType: string;
  businessKey: string;
  status: string;
  payload: Record<string, unknown>;
};

export type SyncGapInput = {
  invoices: Array<{ id: string; kind: string; voided: boolean; total: number }>;
  fulfillments: Array<{ id: string; status: string; trackingNumber: string | null }>;
  jobs: SyncGapJob[];
};

function moneyDrift(left: number, right: number): boolean {
  return Math.abs(Math.round(left * 100) - Math.round(right * 100)) > 1;
}

/** True when a partner order is missing a callback row, or a stored callback no longer matches the current invoice or tracking fact. */
export function orderNeedsFulfillmentSync(input: SyncGapInput): boolean {
  const primary = input.invoices.find((invoice) => !invoice.voided && invoice.kind.toUpperCase() !== "SHIPPING_SUPPLEMENT");
  if (primary) {
    const businessKey = `invoice:${primary.id}`;
    const job = input.jobs.find((item) => item.eventType === "invoice" && item.businessKey === businessKey);
    if (!job) return true;
    const sentTotal = Number(job.payload.final_total);
    const revisionExists = input.jobs.some(
      (item) => item.eventType === "invoice" && item.businessKey === `${businessKey}:revision`
    );
    if (job.status === "succeeded" && !revisionExists && Number.isFinite(sentTotal) && moneyDrift(sentTotal, primary.total)) {
      return true;
    }
  }

  for (const fulfillment of input.fulfillments) {
    if (fulfillment.status.toUpperCase() !== "CLOSED") continue;
    const businessKey = `shipment:${fulfillment.id}`;
    const job = input.jobs.find((item) => item.eventType === "shipment" && item.businessKey === businessKey);
    if (!job) return true;
    if (job.status === "succeeded" && !String(job.payload.tracking_number ?? "") && fulfillment.trackingNumber) return true;
  }

  return false;
}
