import type { CallbackPayload, ClosedFulfillment, FulfillmentSnapshot } from "@/lib/integrations/outbound/types";

export type ShipmentPlanItem = {
  fulfillmentId: string;
  businessKey: string;
  status: "pending" | "blocked";
  blockedReason: string | null;
  payload: CallbackPayload;
};

function shipmentPayload(row: ClosedFulfillment): CallbackPayload {
  const payload: CallbackPayload = {};
  if (row.trackingNumber) payload.tracking_number = row.trackingNumber;
  if (row.carrier) payload.ship_via = row.carrier;
  if (row.shippedAt) payload.shipped_at = row.shippedAt;
  return payload;
}

function closedShipments(snapshot: FulfillmentSnapshot): ClosedFulfillment[] {
  return snapshot.fulfillments
    .filter((row) => row.status.toUpperCase() === "CLOSED")
    .slice()
    .sort((left, right) => {
      const leftTime = left.shippedAt || "";
      const rightTime = right.shippedAt || "";
      if (leftTime !== rightTime) return leftTime < rightTime ? -1 : 1;
      return left.id < right.id ? -1 : 1;
    });
}

/**
 * The callback contract stores one tracking record per order.
 * The earliest closed fulfillment is the sendable record.
 * Later fulfillments stay as blocked jobs so their tracking is visible and is not discarded.
 */
export function planShipments(snapshot: FulfillmentSnapshot): ShipmentPlanItem[] {
  const closed = closedShipments(snapshot);
  const cancelled = snapshot.orderStatus.toUpperCase() === "CANCELLED" || snapshot.orderStatus.toUpperCase() === "DENIED";
  return closed.map((row, index) => {
    const extra = index > 0;
    return {
      fulfillmentId: row.id,
      businessKey: `shipment:${row.id}`,
      status: cancelled || extra ? "blocked" : "pending",
      blockedReason: cancelled ? "order_not_shippable" : extra ? "partner_single_shipment_limit" : null,
      payload: shipmentPayload(row),
    };
  });
}

export function isTrackingEnrichment(previous: CallbackPayload, next: CallbackPayload): boolean {
  const previousTracking = String(previous.tracking_number ?? "");
  const nextTracking = String(next.tracking_number ?? "");
  const previousCarrier = String(previous.ship_via ?? "");
  const nextCarrier = String(next.ship_via ?? "");
  if (previousTracking && nextTracking && previousTracking !== nextTracking) return false;
  if (previousCarrier && nextCarrier && previousCarrier !== nextCarrier) return false;
  return (!previousTracking && !!nextTracking) || (!previousCarrier && !!nextCarrier);
}
